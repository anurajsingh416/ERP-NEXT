"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FaEdit, FaTrash, FaEye, FaSearch, FaPlus, FaFileAlt, FaCopy, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

const StatusBadge = ({ status }) => {
    const map = {
        Draft: "bg-gray-100 text-gray-500",
        Pending: "bg-amber-50 text-amber-600",
        Ordered: "bg-green-50 text-green-600",
        "Partially Ordered": "bg-blue-50 text-blue-600",
        Received: "bg-teal-50 text-teal-600",
        Cancelled: "bg-red-50 text-red-500",
        "Quoted": "bg-purple-50 text-purple-600"
    };
    return (
        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
            {status || "—"}
        </span>
    );
};

export default function PurchaseRequestList() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, draft: 0, pending: 0, ordered: 0, partiallyOrdered: 0, received: 0 });
    const router = useRouter();
    const limit = 10;

    const fetchStats = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/purchase-request?stats=true", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.success && res.data.data) setStats(res.data.data);
        } catch (err) {
            console.error("Stats fetch failed:", err);
        }
    }, []);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/purchase-request", {
                headers: { Authorization: `Bearer ${token}` },
                params: { page: currentPage, limit, search: search.trim(), status: filterStatus === "All" ? "" : filterStatus },
            });
            setRequests(res.data.data || []);
            setTotalCount(res.data.total || 0);
            setTotalPages(Math.max(1, Math.ceil((res.data.total || 0) / limit)));
        } catch (err) {
            toast.error("Failed to load purchase requests");
        } finally {
            setLoading(false);
        }
    }, [currentPage, search, filterStatus]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);
    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handleDelete = async (id) => {
        if (!confirm("Delete this purchase request?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/purchase-request/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Deleted");
            fetchRequests();
            fetchStats();
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const displayStats = {
        total: stats.total ?? totalCount,
        draft: stats.draft ?? 0,
        pending: stats.pending ?? 0,
        ordered: stats.ordered ?? 0,
        partiallyOrdered: stats.partiallyOrdered ?? 0,
        received: stats.received ?? 0,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Purchase Requests</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Raise and track material requests before quotation</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { fetchRequests(); fetchStats(); }}
                            className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300"
                        >
                            Refresh
                        </button>
                        <Link href="/admin/purchase-request-view/new">
                            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
                                <FaPlus className="text-xs" /> New Request
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                    {[
                        { label: "Total Requests", value: displayStats.total, emoji: "📝", filter: "All" },
                        { label: "Draft", value: displayStats.draft, emoji: "📄", filter: "Draft" },
                        { label: "Pending", value: displayStats.pending, emoji: "⏳", filter: "Pending" },
                        { label: "Ordered", value: displayStats.ordered, emoji: "✅", filter: "Ordered" },
                        { label: "Received", value: displayStats.received, emoji: "📦", filter: "Received" },
                    ].map((s) => (
                        <div
                            key={s.label}
                            onClick={() => setFilterStatus(s.filter)}
                            className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all cursor-pointer
                ${filterStatus === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200"}`}
                        >
                            <span className="text-2xl">{s.emoji}</span>
                            <div>
                                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                                <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
                        <div className="relative flex-1 min-w-[180px] max-w-xs">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
                            <input
                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search title or request no..."
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap ml-auto">
                            {["All", "Draft", "Pending", "Ordered", "Partially Ordered", "Received", "Cancelled"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStatus === s ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {["#", "Request No.", "Title", "Purpose", "Date", "Status", "Actions"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            {Array(7).fill(0).map((__, j) => (
                                                <td key={j} className="px-4 py-4">
                                                    <div className="h-3 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-20">
                                            <FaFileAlt className="mx-auto text-4xl text-gray-100 mb-3" />
                                            <p className="text-sm font-medium text-gray-400">No purchase requests found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((r, idx) => (
                                        <tr key={r._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                                            <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{(currentPage - 1) * limit + idx + 1}</td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {r.requestNumber || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-bold text-gray-900">
                                                <Link href={`/admin/purchase-request-view/view/${r._id}`} className="hover:underline">{r.title}</Link>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-gray-500">{r.purpose}</td>
                                            <td className="px-4 py-4 text-xs text-gray-500">
                                                {r.transactionDate ? new Date(r.transactionDate).toLocaleDateString("en-GB") : "—"}
                                            </td>
                                            <td className="px-4 py-4"><StatusBadge status={r.status} /></td>
                                            <td className="px-4 py-4">
                                                <ActionMenu
                                                    actions={[
                                                        { icon: <FaEye />, label: "View", onClick: () => router.push(`/admin/purchase-request-view/view/${r._id}`) },
                                                        { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/admin/purchase-request-view/new?editId=${r._id}`) },
                                                        ...(r.status !== "Cancelled" ? [{
                                                            icon: <FaCopy />,
                                                            label: "Create Quotation",
                                                            onClick: () => router.push(`/admin/PurchaseQuotationList/new?fromRequestId=${r._id}`),
                                                        }] : []),
                                                        { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => handleDelete(r._id) },
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1">
                                <FaChevronLeft className="text-xs" /> Prev
                            </button>
                            <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1">
                                Next <FaChevronRight className="text-xs" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
    );
}