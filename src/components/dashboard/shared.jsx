"use client";

import { useEffect, useState, useCallback } from "react";
import { FiAlertCircle } from "react-icons/fi";

export const inr = (n = 0) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const compact = (n = 0) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : inr(n);
export const num = (n = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export const day = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const words = (s = "") => s.replace(/([a-z])([A-Z])/g, "$1 $2");
export const COLORS = { primary: "#4f46e5", secondary: "#64748b", tertiary: "#94a3b8", good: "#10b981" };
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const presets = [
    { key: "month", label: "This month", get: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n]; } },
    { key: "30", label: "Last 30 days", get: () => { const n = new Date(); return [new Date(n.getTime() - 29 * 864e5), n]; } },
    { key: "fy", label: "This financial year", get: () => { const n = new Date(); const y = n.getMonth() < 3 ? n.getFullYear() - 1 : n.getFullYear(); return [new Date(y, 3, 1), n]; } },
];

/** Loads `${endpoint}?from=&to=` with the stored JWT and tracks the chosen date range. */
export function useDashboard(endpoint) {
    const [preset, setPreset] = useState("month");
    const [range, setRange] = useState(() => presets[0].get().map(iso));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${endpoint}?from=${range[0]}&to=${range[1]}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Request failed");
            setData(json.data);
        } catch (e) {
            setError(e.message || "Could not load the dashboard");
        } finally {
            setLoading(false);
        }
    }, [endpoint, range]);

    useEffect(() => { load(); }, [load]);

    return {
        data, loading, error, load, range, preset,
        pickPreset: (p) => { setPreset(p.key); setRange(p.get().map(iso)); },
        setCustom: (i, v) => { setPreset("custom"); setRange((r) => (i === 0 ? [v, r[1]] : [r[0], v])); },
    };
}

export const PAGE = "min-h-screen bg-slate-50 p-4 md:p-8 text-slate-700 [&_*]:!font-sans";

export const periodText = ([a, b]) => {
    const f = new Date(`${a}T00:00:00`), t = new Date(`${b}T00:00:00`);
    const n = Math.round((t - f) / 864e5) + 1;
    return `${day(f)} to ${day(t)}, compared with the ${n} ${n === 1 ? "day" : "days"} before`;
};

export function RangeBar({ dash }) {
    const { range, preset, pickPreset, setCustom } = dash;
    const dateCls = "h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700";
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                {presets.map((p) => (
                    <button key={p.key} onClick={() => pickPreset(p)}
                        className={`px-3 h-7 rounded-md text-sm font-medium transition ${preset === p.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                        {p.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <input type="date" value={range[0]} max={range[1]} aria-label="From date" onChange={(e) => setCustom(0, e.target.value)} className={dateCls} />
                <span>to</span>
                <input type="date" value={range[1]} min={range[0]} aria-label="To date" onChange={(e) => setCustom(1, e.target.value)} className={dateCls} />
            </div>
        </div>
    );
}

export function PageHeader({ title, subtitle, dash, action }) {
    return (
        <header className="mb-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                    <p className="text-sm text-slate-500 mt-1">{subtitle || periodText(dash.range)}</p>
                </div>
                {action}
            </div>
            <div className="mt-4"><RangeBar dash={dash} /></div>
        </header>
    );
}

export function ErrorBanner({ error, onRetry }) {
    if (!error) return null;
    return (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="flex items-center gap-2"><FiAlertCircle /> {error}</span>
            <button onClick={onRetry} className="font-medium underline">Try again</button>
        </div>
    );
}

export function Kpi({ title, value, sub, tone = "" }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-0">
            <p className="text-sm text-slate-500">{title}</p>
            <p className={`text-2xl font-semibold tabular-nums mt-1 ${tone || "text-slate-900"}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
        </div>
    );
}

export function Delta({ pct, upIsGood = true }) {
    if (pct == null) return null;
    const good = (pct > 0) === upIsGood;
    return <span className={good ? "text-emerald-600" : "text-amber-600"}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs previous</span>;
}

export function Card({ title, className = "", children }) {
    return (
        <section className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">{title}</h2>
            {children}
        </section>
    );
}

export function Table({ head, rows, empty, wrap = false }) {
    if (!rows.length) return <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                        {head.map((h) => <th key={h} className="py-2 pr-4 font-medium whitespace-nowrap">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {r.map((c, j) => (
                                <td key={j}
                                    className={`py-2.5 pr-4 ${wrap && j === 0 ? "whitespace-normal break-words min-w-[10rem] max-w-xs align-top" : "whitespace-nowrap"}`}>
                                    {c}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export const Empty = ({ loading, text }) => (
    <p className="text-sm text-slate-400 py-10 text-center">{loading ? "Loading…" : text}</p>
);

export function StatusList({ rows, loading, empty }) {
    if (!rows?.length) return <Empty loading={loading} text={empty} />;
    return (
        <ul className="divide-y divide-slate-100">
            {rows.map((s) => (
                <li key={s.status} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-slate-700">{words(s.status)}</span>
                    <span className="text-right">
                        <span className="font-semibold text-slate-900">{s.count}</span>
                        <span className="text-slate-400 ml-2">{compact(s.total)}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}