"use client";

import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { FiPlus } from "react-icons/fi";
import {
    useDashboard, PageHeader, PAGE, ErrorBanner, Kpi, Delta, Card, Table, Empty, StatusList,
    inr, compact, num, day, words, COLORS,
} from "@/components/dashboard/shared";

export default function SalesDashboardPage() {
    const dash = useDashboard("/api/dashboard/sales");
    const { data, loading, error, load, range } = dash;
    const k = data?.kpis;

    return (
        <div className={PAGE}>
            <PageHeader title="Sales dashboard" dash={dash} action={
                <Link href="/admin/sales-invoice-view/new" className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                    <FiPlus /> New invoice
                </Link>
            } />

            <ErrorBanner error={error} onRetry={load} />

            <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 ${loading ? "opacity-60" : ""}`}>
                <Kpi title="Net sales" value={compact(k?.net)}
                    sub={k?.changePct == null ? `after ${compact(k?.creditNotes)} credit notes` : <Delta pct={k.changePct} />} />
                <Kpi title="Invoiced sales" value={compact(k?.invoiceSales)} sub={`${k?.invoiceCount ?? 0} invoices`} />
                <Kpi title="POS sales" value={compact(k?.posSales)} sub={`${k?.posCount ?? 0} bills`} />
                <Kpi title="Collected" value={compact(k?.collected)} sub="Invoices paid plus POS payments" />
                <Kpi title="Receivables" value={compact(k?.receivables)}
                    sub={<span className={k?.overdue > 0 ? "text-rose-600" : ""}>{compact(k?.overdue)} overdue · {k?.overdueCount ?? 0} invoices</span>} />
                <Kpi title="Open sales orders" value={k?.openOrderCount ?? 0} sub={`${compact(k?.openOrderValue)} not yet completed`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card title={`Sales trend (${data?.range.bucket === "month" ? "by month" : "by day"})`} className="lg:col-span-2">
                    {data?.trend.length ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.trend}>
                                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => compact(v).replace("₹", "")} width={56} />
                                    <Tooltip formatter={(v) => inr(v)} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="invoices" name="Invoices" stackId="s" fill={COLORS.primary} />
                                    <Bar dataKey="pos" name="POS" stackId="s" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty loading={loading} text="No sales in this period." />}
                </Card>

                <div className="flex flex-col gap-6">
                    <Card title="Invoices by payment status">
                        <StatusList rows={data?.paymentSplit} loading={loading} empty="No invoices in this period." />
                    </Card>
                    <Card title="Sales orders by status">
                        <StatusList rows={data?.orderStatus} loading={loading} empty="No sales orders in this period." />
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card title="Top customers">
                    {data?.topCustomers.length ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topCustomers} layout="vertical" margin={{ left: 8 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} />
                                    <Tooltip formatter={(v) => inr(v)} />
                                    <Bar dataKey="total" name="Sales" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty loading={loading} text="No customer sales in this period." />}
                </Card>

                <Card title="Top selling items" className="lg:col-span-2">
                    <Table
                        wrap
                        head={["Item", "Quantity", "Revenue"]}
                        empty={loading ? "Loading…" : "No items sold in this period."}
                        rows={(data?.topItems || []).map((i) => [
                            i.name, num(i.qty), <span key="r" className="font-medium text-slate-900">{inr(i.revenue)}</span>,
                        ])}
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Unpaid invoices, oldest first">
                    <Table
                        head={["Invoice", "Customer", "Due", "Balance"]}
                        empty={loading ? "Loading…" : "No unpaid invoices."}
                        rows={(data?.unpaidInvoices || []).map((i) => {
                            const late = i.dueDate && new Date(i.dueDate) < new Date();
                            return [
                                <Link key="a" className="text-indigo-600 hover:underline" href={`/admin/sales-invoice-view/view/${i._id}`}>{i.invoiceNumber}</Link>,
                                i.customerName || "—",
                                <span key="b" className={late ? "text-rose-600 font-medium" : ""}>{day(i.dueDate)}</span>,
                                <span key="c" className="font-medium text-slate-900">{inr(i.remainingAmount)}</span>,
                            ];
                        })}
                    />
                </Card>

                <Card title="Open sales orders, oldest first">
                    <Table
                        head={["Order", "Customer", "Delivery", "Status", "Value"]}
                        empty={loading ? "Loading…" : "No open sales orders."}
                        rows={(data?.openOrders || []).map((o) => [
                            <Link key="a" className="text-indigo-600 hover:underline" href={`/admin/sales-order-view/view/${o._id}`}>{o.documentNumberOrder}</Link>,
                            o.customerName || "—",
                            day(o.expectedDeliveryDate),
                            words(o.status || ""),
                            <span key="c" className="font-medium text-slate-900">{inr(o.grandTotal)}</span>,
                        ])}
                    />
                </Card>
            </div>
        </div>
    );
}