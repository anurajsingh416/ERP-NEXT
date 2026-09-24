"use client";

import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import {
    useDashboard, PageHeader, PAGE, ErrorBanner, Kpi, Card, Table, Empty,
    inr, compact, num, day, words, COLORS,
} from "@/components/dashboard/shared";

const HBar = ({ rows, loading, empty }) =>
    rows?.length ? (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} />
                    <Tooltip formatter={(v) => inr(v)} />
                    <Bar dataKey="value" name="Stock value" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    ) : <Empty loading={loading} text={empty} />;

export default function StockDashboardPage() {
    const dash = useDashboard("/api/dashboard/stock");
    const { data, loading, error, load, range } = dash;
    const k = data?.kpis;
    const t = data?.thresholds;

    return (
        <div className={PAGE}>
            <PageHeader title="Stock dashboard" dash={dash}
                subtitle="Stock levels are as of now. Only the movement chart follows the date range."
                action={
                    <Link href="/admin/InventoryView" className="shrink-0 px-3 h-9 inline-flex items-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300">
                        Inventory view
                    </Link>
                } />

            <ErrorBanner error={error} onRetry={load} />

            <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 ${loading ? "opacity-60" : ""}`}>
                <Kpi title="Stock value" value={compact(k?.stockValue)} sub="Quantity × unit price" />
                <Kpi title="Available" value={num(k?.available)} sub={`${num(k?.onHand)} on hand · ${num(k?.committed)} committed`} />
                <Kpi title="Stock records" value={k?.records ?? 0} sub="Item and warehouse combinations" />
                <Kpi title="Low stock" value={k?.lowCount ?? 0} sub="At or below reorder level" tone={k?.lowCount > 0 ? "text-amber-600" : ""} />
                <Kpi title="Out of stock" value={k?.outCount ?? 0} sub="Zero quantity on hand" tone={k?.outCount > 0 ? "text-rose-600" : ""} />
                <Kpi title="On order" value={num(k?.onOrder)} sub="Ordered from suppliers, not received" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card title={`Stock movement (${data?.range.bucket === "month" ? "by month" : "by day"}, units)`} className="lg:col-span-2">
                    {data?.movements.length ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.movements}>
                                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} width={48} />
                                    <Tooltip />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="in" name="Stock in" fill={COLORS.good} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="out" name="Stock out" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="other" name="Transfers and adjustments" fill={COLORS.tertiary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty loading={loading} text="No stock movements in this period." />}
                </Card>

                <Card title="Stock value by warehouse">
                    <HBar rows={data?.byWarehouse} loading={loading} empty="No stock recorded yet." />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card title="Stock value by item group">
                    <HBar rows={data?.byGroup} loading={loading} empty="No stock recorded yet." />
                </Card>

                <Card title="Items to reorder" className="lg:col-span-2">
                    <Table
                        head={["Item", "Warehouse", "On hand", "Reorder level", "Reorder quantity"]}
                        empty={loading ? "Loading…" : "Nothing is at or below its reorder level."}
                        rows={(data?.lowStock || []).map((r) => [
                            <span key="a">{r.item}{r.code ? <span className="text-slate-400"> · {r.code}</span> : null}</span>,
                            r.warehouse || "—",
                            <span key="b" className={r.qty <= 0 ? "text-rose-600 font-medium" : "font-medium text-slate-900"}>{num(r.qty)}</span>,
                            num(r.reorderLevel), r.reorderQuantity ? num(r.reorderQuantity) : "—",
                        ])}
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card title={`Batches expiring within ${t?.expiryDays ?? 60} days or already expired`}>
                    <Table
                        head={["Item", "Batch", "Expiry", "Quantity"]}
                        empty={loading ? "Loading…" : "No batches close to expiry."}
                        rows={(data?.expiring || []).map((r) => {
                            const gone = new Date(r.expiryDate) < new Date();
                            return [
                                r.item, r.batch || "—",
                                <span key="a" className={gone ? "text-rose-600 font-medium" : ""}>{day(r.expiryDate)}</span>,
                                num(r.qty),
                            ];
                        })}
                    />
                </Card>

                <Card title={`Not moved in ${t?.deadDays ?? 90} days (largest value first)`}>
                    <Table
                        head={["Item", "Warehouse", "On hand", "Value"]}
                        empty={loading ? "Loading…" : "Every item with stock has moved recently."}
                        rows={(data?.deadStock || []).map((r) => [
                            r.item, r.warehouse || "—", num(r.qty),
                            <span key="a" className="font-medium text-slate-900">{inr(r.value)}</span>,
                        ])}
                    />
                </Card>
            </div>

            <Card title="Latest stock movements">
                <Table
                    head={["Date", "Item", "Warehouse", "Type", "Quantity"]}
                    empty={loading ? "Loading…" : "No stock movements yet."}
                    rows={(data?.recentMovements || []).map((m) => [
                        day(m.date), m.item, m.warehouse || "—", words(m.type || ""),
                        <span key="a" className={m.qty < 0 ? "text-rose-600" : "text-emerald-600"}>{m.qty > 0 ? "+" : ""}{num(m.qty)}</span>,
                    ])}
                />
            </Card>
        </div>
    );
}