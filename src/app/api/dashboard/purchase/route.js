export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import PurchaseInvoice from "@/models/InvoiceModel";
import PurchaseOrder from "@/models/PurchaseOrder";
import GRN from "@/models/grnModels";
import DebitNote from "@/models/DebitNoteModel";

// Purchase orders that still need receiving / closing
const OPEN_PO = ["Open", "Pending", "PartiallyOrdered", "FullyOrdered", "PartiallyReceived"];
const UNPAID = ["Pending", "Partial"];
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
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }
        const companyId = new mongoose.Types.ObjectId(user.companyId);

        // ---- Date range (defaults to this month) and the previous period of equal length ----
        const now = new Date();
        const { searchParams } = new URL(req.url);
        const from = parseDate(searchParams.get("from")) || new Date(now.getFullYear(), now.getMonth(), 1);
        const to = parseDate(searchParams.get("to"), true) || now;
        const span = to - from;
        const prevTo = new Date(from.getTime() - 1);
        const prevFrom = new Date(prevTo.getTime() - span);
        const fmt = span / 86400000 > 92 ? "%Y-%m" : "%Y-%m-%d"; // daily for short ranges, monthly for long
        const inRange = (f, t) => ({ postingDate: { $gte: f, $lte: t } });

        const inv = { companyId, status: { $nin: ["cancelled", "rejected"] } };
        const po = { companyId, orderStatus: { $ne: "Cancelled" } };
        const isOverdue = { $and: [{ $gt: ["$validUntil", null] }, { $lt: ["$validUntil", now] }] };
        const byDate = (field) => ({ $dateToString: { format: fmt, date: field, timezone: TZ } });

        const [
            invPeriod, invPrev, payables, invTrend, poTrend, poStatus,
            openPO, topSuppliers, grn, debit, unpaidInvoices, awaitingPOs, recentGrns,
        ] = await Promise.all([
            PurchaseInvoice.aggregate([
                { $match: { ...inv, ...inRange(from, to) } },
                { $group: { _id: null, total: { $sum: "$grandTotal" }, paid: { $sum: "$paidAmount" }, count: { $sum: 1 } } },
            ]),
            PurchaseInvoice.aggregate([
                { $match: { ...inv, ...inRange(prevFrom, prevTo) } },
                { $group: { _id: null, total: { $sum: "$grandTotal" } } },
            ]),
            PurchaseInvoice.aggregate([
                { $match: { ...inv, paymentStatus: { $in: UNPAID } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$remainingAmount" },
                        count: { $sum: 1 },
                        overdue: { $sum: { $cond: [isOverdue, "$remainingAmount", 0] } },
                        overdueCount: { $sum: { $cond: [isOverdue, 1, 0] } },
                    },
                },
            ]),
            PurchaseInvoice.aggregate([
                { $match: { ...inv, ...inRange(from, to) } },
                { $group: { _id: byDate("$postingDate"), total: { $sum: "$grandTotal" } } },
            ]),
            PurchaseOrder.aggregate([
                { $match: { ...po, ...inRange(from, to) } },
                { $group: { _id: byDate("$postingDate"), total: { $sum: "$grandTotal" } } },
            ]),
            PurchaseOrder.aggregate([
                { $match: { ...po, ...inRange(from, to) } },
                { $group: { _id: "$orderStatus", count: { $sum: 1 }, total: { $sum: "$grandTotal" } } },
                { $sort: { count: -1 } },
            ]),
            PurchaseOrder.aggregate([
                { $match: { companyId, orderStatus: { $in: OPEN_PO } } },
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$grandTotal" } } },
            ]),
            PurchaseInvoice.aggregate([
                { $match: { ...inv, ...inRange(from, to) } },
                { $group: { _id: "$supplier", name: { $first: "$supplierName" }, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 5 },
            ]),
            GRN.aggregate([
                { $match: { companyId, ...inRange(from, to) } },
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$grandTotal" } } },
            ]),
            DebitNote.aggregate([
                { $match: { companyId, ...inRange(from, to) } },
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$grandTotal" } } },
            ]),
            PurchaseInvoice.find({ ...inv, paymentStatus: { $in: UNPAID }, remainingAmount: { $gt: 0 } })
                .sort({ postingDate: 1 })
                .limit(8)
                .select("documentNumberPurchaseInvoice supplierName grandTotal remainingAmount validUntil postingDate")
                .lean(),
            PurchaseOrder.find({ companyId, orderStatus: { $in: OPEN_PO } })
                .sort({ postingDate: 1 })
                .limit(8)
                .select("documentNumberPurchaseOrder supplierName grandTotal orderStatus postingDate validUntil")
                .lean(),
            GRN.find({ companyId })
                .sort({ postingDate: -1 })
                .limit(6)
                .select("documentNumberGrn supplierName grandTotal status postingDate")
                .lean(),
        ]);

        // Merge the two trend series by date bucket
        const trendMap = {};
        invTrend.forEach((r) => (trendMap[r._id] = { label: r._id, invoices: r.total, orders: 0 }));
        poTrend.forEach((r) => {
            trendMap[r._id] = trendMap[r._id] || { label: r._id, invoices: 0, orders: 0 };
            trendMap[r._id].orders = r.total;
        });
        const trend = Object.values(trendMap).sort((a, b) => a.label.localeCompare(b.label));

        const cur = invPeriod[0] || { total: 0, paid: 0, count: 0 };
        const prev = invPrev[0]?.total || 0;
        const pay = payables[0] || { total: 0, count: 0, overdue: 0, overdueCount: 0 };

        return NextResponse.json({
            success: true,
            data: {
                range: { from, to, bucket: fmt === "%Y-%m" ? "month" : "day" },
                kpis: {
                    purchases: cur.total,
                    purchasesPrev: prev,
                    changePct: prev ? ((cur.total - prev) / prev) * 100 : null,
                    invoiceCount: cur.count,
                    paid: cur.paid,
                    payables: pay.total,
                    payablesCount: pay.count,
                    overdue: pay.overdue,
                    overdueCount: pay.overdueCount,
                    openPOCount: openPO[0]?.count || 0,
                    openPOValue: openPO[0]?.total || 0,
                    grnCount: grn[0]?.count || 0,
                    grnValue: grn[0]?.total || 0,
                    debitNoteCount: debit[0]?.count || 0,
                    debitNoteValue: debit[0]?.total || 0,
                },
                trend,
                poStatus: poStatus.map((s) => ({ status: s._id || "Unknown", count: s.count, total: s.total })),
                topSuppliers: topSuppliers.map((s) => ({ id: s._id, name: s.name || "Unknown", total: s.total, count: s.count })),
                unpaidInvoices,
                awaitingPOs,
                recentGrns,
            },
        });
    } catch (err) {
        console.error("PURCHASE DASHBOARD ERROR", err);
        return NextResponse.json({ success: false, message: "Failed to load purchase dashboard" }, { status: 500 });
    }
}