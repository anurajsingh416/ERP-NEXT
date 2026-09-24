export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import "@/models/ItemModels";
import "@/models/warehouseModels";

const IN_TYPES = ["IN", "RETURN"];
const OUT_TYPES = ["OUT", "POS_SALE"];
const DEAD_DAYS = 90;
const EXPIRY_DAYS = 60;
const TZ = "Asia/Kolkata";

const parseDate = (s, endOfDay) => {
    if (!s) return null;
    const d = new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
    return isNaN(d) ? null : d;
};

export async function GET(req) {
    try {
        await dbConnect();
        const user = verifyJWT(getTokenFromHeader(req));
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        const companyId = new mongoose.Types.ObjectId(user.companyId);

        const now = new Date();
        const { searchParams } = new URL(req.url);
        const from = parseDate(searchParams.get("from")) || new Date(now.getFullYear(), now.getMonth(), 1);
        const to = parseDate(searchParams.get("to"), true) || now;
        const fmt = (to - from) / 86400000 > 92 ? "%Y-%m" : "%Y-%m-%d";

        const itemColl = mongoose.model("Item").collection.name;
        const whColl = mongoose.model("Warehouse").collection.name;
        const lookupItem = [
            { $lookup: { from: itemColl, localField: "item", foreignField: "_id", as: "it" } },
            { $unwind: { path: "$it", preserveNullAndEmptyArrays: true } },
        ];
        const lookupWh = [
            { $lookup: { from: whColl, localField: "warehouse", foreignField: "_id", as: "wh" } },
            { $unwind: { path: "$wh", preserveNullAndEmptyArrays: true } },
        ];
        const label = { item: { $ifNull: ["$it.itemName", "Item not found"] }, code: "$it.itemCode", warehouse: "$wh.warehouseName" };

        // Effective quantity / value per inventory row (rows with variants keep their stock inside variantInventory)
        const eff = (f) => ({ $cond: ["$hasVariants", { $sum: `$variantInventory.${f}` }, { $ifNull: [`$${f}`, 0] }] });
        const base = [
            { $match: { companyId } },
            {
                $addFields: {
                    qty: eff("quantity"),
                    committedQty: eff("committed"),
                    onOrderQty: eff("onOrder"),
                    value: {
                        $cond: [
                            "$hasVariants",
                            { $sum: { $map: { input: "$variantInventory", as: "v", in: { $multiply: [{ $ifNull: ["$$v.quantity", 0] }, { $ifNull: ["$$v.unitPrice", 0] }] } } } },
                            { $multiply: [{ $ifNull: ["$quantity", 0] }, { $ifNull: ["$unitPrice", 0] }] },
                        ],
                    },
                },
            },
        ];

        // Items with any stock movement in the last 90 days are "moving"; the rest with stock on hand are dead stock
        const since = new Date(now.getTime() - DEAD_DAYS * 864e5);
        const movingItems = await StockMovement.distinct("item", { companyId, date: { $gte: since } });
        const expiryLimit = new Date(now.getTime() + EXPIRY_DAYS * 864e5);

        const [totals, byWarehouse, byGroup, lowStock, expiring, deadStock, movementAgg, recentMovements] = await Promise.all([
            Inventory.aggregate([
                ...base,
                {
                    $group: {
                        _id: null,
                        value: { $sum: "$value" }, qty: { $sum: "$qty" },
                        committed: { $sum: "$committedQty" }, onOrder: { $sum: "$onOrderQty" }, records: { $sum: 1 },
                        low: { $sum: { $cond: [{ $and: [{ $gt: ["$qty", 0] }, { $gt: ["$reorderLevel", 0] }, { $lte: ["$qty", "$reorderLevel"] }] }, 1, 0] } },
                        out: { $sum: { $cond: [{ $lte: ["$qty", 0] }, 1, 0] } },
                    },
                },
            ]),
            Inventory.aggregate([
                ...base,
                { $group: { _id: "$warehouse", value: { $sum: "$value" }, qty: { $sum: "$qty" } } },
                { $sort: { value: -1 } }, { $limit: 8 },
                { $lookup: { from: whColl, localField: "_id", foreignField: "_id", as: "wh" } },
                { $project: { _id: 0, name: { $ifNull: [{ $first: "$wh.warehouseName" }, "Unknown warehouse"] }, value: 1, qty: 1 } },
            ]),
            Inventory.aggregate([
                ...base, ...lookupItem,
                { $group: { _id: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$it.itemGroup", ""] } }, 0] }, "$it.itemGroup", "Ungrouped"] }, value: { $sum: "$value" }, qty: { $sum: "$qty" } } },
                { $sort: { value: -1 } }, { $limit: 8 },
                { $project: { _id: 0, name: "$_id", value: 1, qty: 1 } },
            ]),
            Inventory.aggregate([
                ...base,
                { $match: { $expr: { $and: [{ $gt: ["$reorderLevel", 0] }, { $lte: ["$qty", "$reorderLevel"] }] } } },
                { $sort: { qty: 1 } }, { $limit: 10 },
                ...lookupItem, ...lookupWh,
                { $project: { _id: 0, ...label, qty: 1, reorderLevel: 1, reorderQuantity: 1 } },
            ]),
            Inventory.aggregate([
                { $match: { companyId } },
                { $unwind: "$batches" },
                { $match: { "batches.quantity": { $gt: 0 }, "batches.expiryDate": { $lte: expiryLimit } } },
                { $sort: { "batches.expiryDate": 1 } }, { $limit: 8 },
                ...lookupItem, ...lookupWh,
                { $project: { _id: 0, ...label, batch: "$batches.batchNumber", expiryDate: "$batches.expiryDate", qty: "$batches.quantity" } },
            ]),
            Inventory.aggregate([
                ...base,
                { $match: { qty: { $gt: 0 }, item: { $nin: movingItems } } },
                { $sort: { value: -1 } }, { $limit: 8 },
                ...lookupItem, ...lookupWh,
                { $project: { _id: 0, ...label, qty: 1, value: 1 } },
            ]),
            StockMovement.aggregate([
                { $match: { companyId, date: { $gte: from, $lte: to } } },
                {
                    $group: {
                        _id: {
                            d: { $dateToString: { format: fmt, date: "$date", timezone: TZ } },
                            k: {
                                $switch: {
                                    branches: [
                                        { case: { $in: ["$movementType", IN_TYPES] }, then: "in" },
                                        { case: { $in: ["$movementType", OUT_TYPES] }, then: "out" },
                                    ], default: "other"
                                }
                            },
                        },
                        qty: { $sum: { $abs: "$quantity" } },
                    },
                },
            ]),
            StockMovement.find({ companyId })
                .sort({ date: -1 }).limit(8)
                .populate("item", "itemCode itemName").populate("warehouse", "warehouseName")
                .select("item warehouse movementType quantity date remarks").lean(),
        ]);

        const mm = {};
        movementAgg.forEach((r) => {
            mm[r._id.d] = mm[r._id.d] || { label: r._id.d, in: 0, out: 0, other: 0 };
            mm[r._id.d][r._id.k] = r.qty;
        });
        const movements = Object.values(mm).sort((a, b) => a.label.localeCompare(b.label));

        const T = totals[0] || { value: 0, qty: 0, committed: 0, onOrder: 0, records: 0, low: 0, out: 0 };
        return NextResponse.json({
            success: true,
            data: {
                range: { from, to, bucket: fmt === "%Y-%m" ? "month" : "day" },
                thresholds: { deadDays: DEAD_DAYS, expiryDays: EXPIRY_DAYS },
                kpis: {
                    stockValue: T.value, onHand: T.qty, committed: T.committed, available: T.qty - T.committed,
                    onOrder: T.onOrder, records: T.records, lowCount: T.low, outCount: T.out,
                },
                movements, byWarehouse, byGroup, lowStock, expiring, deadStock,
                recentMovements: recentMovements.map((m) => ({
                    _id: m._id, item: m.item?.itemName || "Item not found", code: m.item?.itemCode,
                    warehouse: m.warehouse?.warehouseName, type: m.movementType, qty: m.quantity, date: m.date,
                })),
            },
        });
    } catch (err) {
        console.error("STOCK DASHBOARD ERROR", err);
        return NextResponse.json({ success: false, message: "Failed to load stock dashboard" }, { status: 500 });
    }
}