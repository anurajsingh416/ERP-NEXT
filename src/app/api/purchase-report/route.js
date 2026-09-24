import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import PurchaseRequest from "@/models/PurchaseRequestModel";
import PurchaseQuotation from "@/models/PurchaseQuotationModel";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchaseInvoice from "@/models/InvoiceModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
    await dbConnect();
    try {
        const token = getTokenFromHeader(req);
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        const decoded = verifyJWT(token);
        if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
        const companyId = new mongoose.Types.ObjectId(decoded.companyId);

        const [
            requestsByStatus,
            quotationsByStatus,
            ordersByStatus,
            invoiceSummary,
            monthlyTrend,
            topSuppliers,
            recentInvoices,
        ] = await Promise.all([
            // ── Purchase Requests, grouped by status ──
            PurchaseRequest.aggregate([
                { $match: { companyId } },
                { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$totalEstimatedAmount" } } },
            ]),

            // ── Quotations, grouped by status ──
            PurchaseQuotation.aggregate([
                { $match: { companyId } },
                { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$grandTotal" } } },
            ]),

            // ── Purchase Orders, grouped by orderStatus ──
            PurchaseOrder.aggregate([
                { $match: { companyId } },
                { $group: { _id: "$orderStatus", count: { $sum: 1 }, value: { $sum: "$grandTotal" } } },
            ]),

            // ── Invoices — overall totals + breakdown by payment status ──
            PurchaseInvoice.aggregate([
                { $match: { companyId } },
                {
                    $facet: {
                        totals: [
                            {
                                $group: {
                                    _id: null,
                                    totalSpend: { $sum: "$grandTotal" },
                                    totalPaid: { $sum: "$paidAmount" },
                                    totalPending: { $sum: "$remainingAmount" },
                                    count: { $sum: 1 },
                                },
                            },
                        ],
                        byStatus: [
                            { $group: { _id: "$paymentStatus", count: { $sum: 1 }, value: { $sum: "$grandTotal" } } },
                        ],
                    },
                },
            ]),

            // ── Monthly spend trend (last 12 months) ──
            PurchaseInvoice.aggregate([
                { $match: { companyId } },
                {
                    $group: {
                        _id: { year: { $year: "$postingDate" }, month: { $month: "$postingDate" } },
                        total: { $sum: "$grandTotal" },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
                { $limit: 12 },
            ]),

            // ── Top 5 suppliers by spend ──
            PurchaseInvoice.aggregate([
                { $match: { companyId } },
                { $group: { _id: "$supplierName", total: { $sum: "$grandTotal" }, invoiceCount: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 5 },
            ]),

            // ── Most recent 20 invoices, for the table ──
            PurchaseInvoice.find({ companyId })
                .sort({ postingDate: -1 })
                .limit(20)
                .select("documentNumberPurchaseInvoice supplierName postingDate grandTotal paymentStatus remainingAmount")
                .lean(),
        ]);

        const toMap = (arr) => arr.reduce((acc, r) => ({ ...acc, [r._id || "Unknown"]: { count: r.count, value: r.value || 0 } }), {});

        return NextResponse.json({
            success: true,
            data: {
                requests: toMap(requestsByStatus),
                quotations: toMap(quotationsByStatus),
                orders: toMap(ordersByStatus),
                invoices: {
                    totals: invoiceSummary[0]?.totals[0] || { totalSpend: 0, totalPaid: 0, totalPending: 0, count: 0 },
                    byStatus: toMap(invoiceSummary[0]?.byStatus || []),
                },
                monthlyTrend: monthlyTrend.map((m) => ({
                    label: `${m._id.month}/${m._id.year}`,
                    total: m.total,
                })),
                topSuppliers,
                recentInvoices,
            },
        });
    } catch (err) {
        console.error("GET purchase-report error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}