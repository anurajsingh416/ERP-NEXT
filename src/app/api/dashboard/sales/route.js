export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesInvoice from "@/models/SalesInvoice";
import SalesOrder from "@/models/SalesOrder";
import CreditNote from "@/models/CreditMemo";
import POSSale from "@/models/pos/POSInvoice";

const CLOSED_ORDER = ["Complete", "Completed", "Closed", "Cancelled"];
const UNPAID = ["Pending", "Partial"];
const TZ = "Asia/Kolkata";

const parseDate = (s, endOfDay) => {
    if (!s) return null;
    const d = new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
    return isNaN(d) ? null : d;
};
const pct = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : null);

export async function GET(req) {
    try {
        await dbConnect();
        const user = verifyJWT(getTokenFromHeader(req));
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        const companyId = new mongoose.Types.ObjectId(user.companyId);

        // Range (default this month) + previous period of the same length
        const now = new Date();
        const { searchParams } = new URL(req.url);
        const from = parseDate(searchParams.get("from")) || new Date(now.getFullYear(), now.getMonth(), 1);
        const to = parseDate(searchParams.get("to"), true) || now;
        const span = to - from;
        const prevFrom = new Date(from.getTime() - 1 - span);
        const fmt = span / 86400000 > 92 ? "%Y-%m" : "%Y-%m-%d";
        const between = (field, f, t) => ({ [field]: { $gte: f, $lte: t } });
        const byDate = (field) => ({ $dateToString: { format: fmt, date: field, timezone: TZ } });

        const inv = { companyId, status: { $ne: "Cancelled" } };
        const pos = { companyId, status: { $nin: ["Cancelled", "cancelled", "Refunded", "Void"] } };
        const cn = { companyId, status: { $nin: ["Cancelled", "cancelled"] } };
        const isOverdue = { $and: [{ $gt: ["$dueDate", null] }, { $lt: ["$dueDate", now] }] };

        // Sum of `amt` for the current period vs the previous one, in a single pass
        const split = (dateField, amt) => ({
            cur: { $sum: { $cond: [{ $gte: [dateField, from] }, amt, 0] } },
            prev: { $sum: { $cond: [{ $lt: [dateField, from] }, amt, 0] } },
            count: { $sum: { $cond: [{ $gte: [dateField, from] }, 1, 0] } },
        });

        const [
            invAgg, posAgg, cnAgg, receivables, openOrders, orderStatus, invTrend, posTrend,
            paySplit, topCustomers, invItems, posItems, unpaidInvoices, openOrderList,
        ] = await Promise.all([
            SalesInvoice.aggregate([
                { $match: { ...inv, ...between("invoiceDate", prevFrom, to) } },
                {
                    $group: {
                        _id: null, ...split("$invoiceDate", "$grandTotal"),
                        paid: { $sum: { $cond: [{ $gte: ["$invoiceDate", from] }, "$paidAmount", 0] } }
                    }
                },
            ]),
            POSSale.aggregate([
                { $match: { ...pos, ...between("createdAt", prevFrom, to) } },
                {
                    $group: {
                        _id: null, ...split("$createdAt", "$grandTotal"),
                        due: { $sum: { $cond: [{ $gte: ["$createdAt", from] }, { $ifNull: ["$dueAmount", 0] }, 0] } }
                    }
                },
            ]),
            CreditNote.aggregate([
                { $match: { ...cn, ...between("postingDate", prevFrom, to) } },
                { $group: { _id: null, ...split("$postingDate", "$grandTotal") } },
            ]),
            SalesInvoice.aggregate([
                { $match: { ...inv, paymentStatus: { $in: UNPAID } } },
                {
                    $group: {
                        _id: null, total: { $sum: "$remainingAmount" }, count: { $sum: 1 },
                        overdue: { $sum: { $cond: [isOverdue, "$remainingAmount", 0] } },
                        overdueCount: { $sum: { $cond: [isOverdue, 1, 0] } }
                    }
                },
            ]),
            SalesOrder.aggregate([
                { $match: { companyId, status: { $nin: CLOSED_ORDER } } },
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$grandTotal" } } },
            ]),
            SalesOrder.aggregate([
                { $match: { companyId, ...between("createdAt", from, to) } },
                { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$grandTotal" } } },
                { $sort: { count: -1 } },
            ]),
            SalesInvoice.aggregate([
                { $match: { ...inv, ...between("invoiceDate", from, to) } },
                { $group: { _id: byDate("$invoiceDate"), total: { $sum: "$grandTotal" } } },
            ]),
            POSSale.aggregate([
                { $match: { ...pos, ...between("createdAt", from, to) } },
                { $group: { _id: byDate("$createdAt"), total: { $sum: "$grandTotal" } } },
            ]),
            SalesInvoice.aggregate([
                { $match: { ...inv, ...between("invoiceDate", from, to) } },
                { $group: { _id: "$paymentStatus", count: { $sum: 1 }, total: { $sum: "$grandTotal" } } },
            ]),
            SalesInvoice.aggregate([
                { $match: { ...inv, ...between("invoiceDate", from, to) } },
                { $group: { _id: "$customer", name: { $first: "$customerName" }, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 5 },
            ]),
            SalesInvoice.aggregate([
                { $match: { ...inv, ...between("invoiceDate", from, to) } },
                { $unwind: "$items" },
                { $group: { _id: { $ifNull: ["$items.itemName", "$items.itemCode"] }, qty: { $sum: "$items.quantity" }, revenue: { $sum: "$items.totalAmount" } } },
            ]),
            POSSale.aggregate([
                { $match: { ...pos, ...between("createdAt", from, to) } },
                { $unwind: "$items" },
                { $group: { _id: "$items.itemName", qty: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } } } },
            ]),
            SalesInvoice.find({ ...inv, paymentStatus: { $in: UNPAID }, remainingAmount: { $gt: 0 } })
                .sort({ invoiceDate: 1 }).limit(8)
                .select("invoiceNumber customerName remainingAmount dueDate invoiceDate").lean(),
            SalesOrder.find({ companyId, status: { $nin: CLOSED_ORDER } })
                .sort({ createdAt: 1 }).limit(8)
                .select("documentNumberOrder customerName grandTotal status expectedDeliveryDate createdAt").lean(),
        ]);

        // Trend: merge invoice + POS series by date bucket
        const tm = {};
        invTrend.forEach((r) => (tm[r._id] = { label: r._id, invoices: r.total, pos: 0 }));
        posTrend.forEach((r) => { tm[r._id] = tm[r._id] || { label: r._id, invoices: 0, pos: 0 }; tm[r._id].pos = r.total; });
        const trend = Object.values(tm).sort((a, b) => a.label.localeCompare(b.label));

        // Top items: combine invoice and POS lines by item name
        const im = {};
        [...invItems, ...posItems].forEach((r) => {
            const k = r._id || "Unnamed item";
            im[k] = im[k] || { name: k, qty: 0, revenue: 0 };
            im[k].qty += r.qty || 0;
            im[k].revenue += r.revenue || 0;
        });
        const topItems = Object.values(im).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

        const I = invAgg[0] || { cur: 0, prev: 0, count: 0, paid: 0 };
        const P = posAgg[0] || { cur: 0, prev: 0, count: 0, due: 0 };
        const C = cnAgg[0] || { cur: 0, prev: 0, count: 0 };
        const R = receivables[0] || { total: 0, count: 0, overdue: 0, overdueCount: 0 };
        const net = I.cur + P.cur - C.cur;
        const netPrev = I.prev + P.prev - C.prev;

        return NextResponse.json({
            success: true,
            data: {
                range: { from, to, bucket: fmt === "%Y-%m" ? "month" : "day" },
                kpis: {
                    net, changePct: pct(net, netPrev),
                    creditNotes: C.cur, creditNoteCount: C.count,
                    invoiceSales: I.cur, invoiceCount: I.count,
                    posSales: P.cur, posCount: P.count,
                    collected: I.paid + (P.cur - P.due),
                    receivables: R.total, receivablesCount: R.count, overdue: R.overdue, overdueCount: R.overdueCount,
                    openOrderCount: openOrders[0]?.count || 0, openOrderValue: openOrders[0]?.total || 0,
                },
                trend,
                orderStatus: orderStatus.map((s) => ({ status: s._id || "Unknown", count: s.count, total: s.total })),
                paymentSplit: paySplit.map((s) => ({ status: s._id || "Unknown", count: s.count, total: s.total })),
                topCustomers: topCustomers.map((c) => ({ id: c._id, name: c.name || "Unknown", total: c.total })),
                topItems,
                unpaidInvoices,
                openOrders: openOrderList,
            },
        });
    } catch (err) {
        console.error("SALES DASHBOARD ERROR", err);
        return NextResponse.json({ success: false, message: "Failed to load sales dashboard" }, { status: 500 });
    }
}