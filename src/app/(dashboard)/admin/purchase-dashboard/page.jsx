"use client";

import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { FiPlus } from "react-icons/fi";
import {
    useDashboard, PageHeader, PAGE, ErrorBanner, Kpi, Delta, Card, Table, Empty, StatusList,
    inr, compact, day, words, COLORS,
} from "@/components/dashboard/shared";

export default function PurchaseDashboardPage() {
    const dash = useDashboard("/api/dashboard/purchase");
    const { data, loading, error, load } = dash;
    const k = data?.kpis;

    return (
        <div className={PAGE}>
            <PageHeader title="Purchase dashboard" dash={dash} action={
                <Link href="/admin/purchase-order-view/new" className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                    <FiPlus /> New purchase order
                </Link>
            } />

            <ErrorBanner error={error} onRetry={load} />

            <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 ${loading ? "opacity-60" : ""}`}>
                <Kpi title="Purchases" value={compact(k?.purchases)}
                    sub={k?.changePct == null ? `${k?.invoiceCount ?? 0} invoices` : <Delta pct={k.changePct} upIsGood={false} />} />
                <Kpi title="Paid" value={compact(k?.paid)} sub={<span className={k?.paid > 0 ? "text-emerald-600" : ""}>Against invoices in this period</span>} />
                <Kpi title="Payables outstanding" value={compact(k?.payables)} sub={<span className={k?.payablesCount > 0 ? "text-amber-600" : ""}>{k?.payablesCount ?? 0} unpaid invoices</span>} />
                <Kpi title="Overdue" value={compact(k?.overdue)} sub={!k ? "" : k.overdueCount > 0 ? <span className="text-rose-600">{k.overdueCount} past due date</span> : <span className="text-emerald-600">Nothing overdue</span>}
                    tone={k?.overdue > 0 ? "text-rose-600" : ""} />
                <Kpi title="Open purchase orders" value={k?.openPOCount ?? 0} sub={`${compact(k?.openPOValue)} still to receive or close`} />
                <Kpi title="Goods received" value={k?.grnCount ?? 0} sub={`${compact(k?.grnValue)} · ${k?.debitNoteCount ?? 0} debit notes`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card title={`Ordered vs invoiced (${data?.range.bucket === "month" ? "by month" : "by day"})`} className="lg:col-span-2">
                    {data?.trend.length ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.trend}>
                                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => compact(v).replace("₹", "")} width={56} />
                                    <Tooltip formatter={(v) => inr(v)} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="orders" name="Purchase orders" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="invoices" name="Purchase invoices" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty loading={loading} text="No purchase orders or invoices in this period." />}
                </Card>

                <Card title="Purchase orders by status">
                    <StatusList rows={data?.poStatus} loading={loading} empty="No purchase orders in this period." />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card title="Top suppliers by spend">
                    {data?.topSuppliers.length ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topSuppliers} layout="vertical" margin={{ left: 8 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} />
                                    <Tooltip formatter={(v) => inr(v)} />
                                    <Bar dataKey="total" name="Spend" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty loading={loading} text="No supplier spend in this period." />}
                </Card>

                <Card title="Unpaid supplier invoices, oldest first" className="lg:col-span-2">
                    <Table
                        head={["Invoice", "Supplier", "Due", "Balance"]}
                        empty={loading ? "Loading…" : "No unpaid invoices."}
                        rows={(data?.unpaidInvoices || []).map((i) => {
                            const late = i.validUntil && new Date(i.validUntil) < new Date();
                            return [
                                <Link key="a" className="text-indigo-600 hover:underline" href={`/admin/purchaseInvoice-view/view/${i._id}`}>{i.documentNumberPurchaseInvoice}</Link>,
                                i.supplierName || "—",
                                <span key="b" className={late ? "text-rose-600 font-medium" : ""}>{day(i.validUntil)}</span>,
                                <span key="c" className="font-medium text-slate-900">{inr(i.remainingAmount)}</span>,
                            ];
                        })}
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Purchase orders waiting to be received" className="lg:col-span-2">
                    <Table
                        head={["Order", "Supplier", "Status", "Value"]}
                        empty={loading ? "Loading…" : "Nothing waiting to be received."}
                        rows={(data?.awaitingPOs || []).map((o) => [
                            <Link key="a" className="text-indigo-600 hover:underline" href={`/admin/purchase-order-view/view/${o._id}`}>{o.documentNumberPurchaseOrder}</Link>,
                            o.supplierName || "—",
                            words(o.orderStatus || ""),
                            <span key="c" className="font-medium text-slate-900">{inr(o.grandTotal)}</span>,
                        ])}
                    />
                </Card>

                <Card title="Latest goods receipts">
                    <Table
                        head={["GRN", "Supplier", "Date"]}
                        empty={loading ? "Loading…" : "No receipts yet."}
                        rows={(data?.recentGrns || []).map((g) => [
                            <Link key="a" className="text-indigo-600 hover:underline" href={`/admin/grn-view/view/${g._id}`}>{g.documentNumberGrn}</Link>,
                            g.supplierName || "—",
                            day(g.postingDate),
                        ])}
                    />
                </Card>
            </div>
        </div>
    );
}