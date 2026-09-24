"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaTrophy } from "react-icons/fa";

export default function CompareQuotations() {
    const { id } = useParams(); // purchaseRequest id
    const router = useRouter();
    const [request, setRequest] = useState(null);
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        Promise.all([
            axios.get("/api/purchase-request", { ...authHeaders, params: { id } }),
            axios.get("/api/purchase-quotation", { ...authHeaders, params: { purchaseRequestId: id, limit: 50 } }),
        ])
            .then(([reqRes, quoRes]) => {
                setRequest(reqRes.data.data);
                setQuotations((quoRes.data.data || []));
            })
            .catch(() => toast.error("Failed to load comparison data"))
            .finally(() => setLoading(false));
    }, [id]);

    // Union of item codes across all quotations, so every row lines up
    const allItemCodes = [...new Set(quotations.flatMap((q) => q.items.map((i) => i.itemCode)))];

    const getCell = (quotation, itemCode) => quotation.items.find((i) => i.itemCode === itemCode);

    const cheapestForItem = (itemCode) => {
        let min = Infinity, winnerId = null;
        quotations.forEach((q) => {
            const cell = getCell(q, itemCode);
            if (cell && cell.unitPrice < min) { min = cell.unitPrice; winnerId = q._id; }
        });
        return winnerId;
    };

    const LOCKED_STATUSES = ["ConvertedToOrder", "PartiallyOrdered", "FullyOrdered"];

    const handleSelectWinner = async (winner) => {
        if (LOCKED_STATUSES.includes(winner.status)) {
            toast.error("This quotation has already been converted to a Purchase Order and can't be reselected.");
            return;
        }
        const alreadyConverted = quotations.find((q) => LOCKED_STATUSES.includes(q.status));
        if (alreadyConverted && alreadyConverted._id !== winner._id) {
            toast.error(`${alreadyConverted.supplierName}'s quotation has already been converted to a PO — this request can't be re-decided.`);
            return;
        }

        if (!confirm(`Select ${winner.supplierName} as the winning quotation? Other quotations for this request will be marked Rejected.`)) return;
        setSelecting(true);
        try {
            const others = quotations.filter((q) => q._id !== winner._id && !LOCKED_STATUSES.includes(q.status));
            await Promise.all([
                axios.put(`/api/purchase-quotation?id=${winner._id}`, { status: "Open" }, authHeaders),
                ...others.map((q) => axios.put(`/api/purchase-quotation?id=${q._id}`, { status: "Rejected" }, authHeaders)),
            ]);
            toast.success(`${winner.supplierName} selected — opening Purchase Order`);
            router.push(`/admin/purchase-order-view/new?pqId=${winner._id}`);
        } catch (err) {
            console.error("Select winner failed:", err.response?.data || err.message);
            toast.error(err.response?.data?.error || "Failed to finalize selection");
        } finally {
            setSelecting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

    if (quotations.length < 2) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
                <p className="text-gray-400">Need at least 2 quotations to compare.</p>
                <button onClick={() => router.back()} className="text-indigo-600 text-sm font-semibold">Go back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
                <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-4">
                    <FaArrowLeft size={11} /> Back
                </button>

                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Compare Quotations</h1>
                <p className="text-sm text-gray-400 mb-6 font-mono">{request?.requestNumber} — {request?.title}</p>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto mb-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-indigo-600">
                                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-white">Item</th>
                                {quotations.map((q) => (
                                    <th key={q._id} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-white">
                                        <div>{q.supplierName}</div>
                                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${q.status === "Rejected" ? "bg-red-400/30 text-red-50" : "bg-white/20 text-white"
                                            }`}>
                                            {q.status}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* ── Item price rows ── */}
                            {allItemCodes.map((code) => {
                                const winnerId = cheapestForItem(code);
                                return (
                                    <tr key={code} className="border-b border-gray-100">
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            {quotations[0].items.find((i) => i.itemCode === code)?.itemName || code}
                                        </td>
                                        {quotations.map((q) => {
                                            const cell = getCell(q, code);
                                            const isWinner = q._id === winnerId;
                                            return (
                                                <td key={q._id} className={`px-4 py-3 ${isWinner ? "bg-green-50 font-bold text-green-700" : "text-gray-600"}`}>
                                                    {cell ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            ₹{cell.unitPrice}
                                                            {isWinner && <FaTrophy className="text-amber-400" />}
                                                        </span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {/* ── Grand Total row ── */}
                            <tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td className="px-4 py-3 font-bold text-gray-800">Grand Total</td>
                                {quotations.map((q) => (
                                    <td key={q._id} className="px-4 py-3 font-bold text-gray-900">₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}</td>
                                ))}
                            </tr>

                            {/* ── Valid Until row ── */}
                            <tr>
                                <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Valid Until</td>
                                {quotations.map((q) => (
                                    <td key={q._id} className="px-4 py-3 text-xs text-gray-500">
                                        {q.validUntil ? new Date(q.validUntil).toLocaleDateString("en-GB") : "—"}
                                    </td>
                                ))}
                            </tr>

                            {/* ── Action row (single, locked-aware) ── */}
                            <tr>
                                <td className="px-4 py-3"></td>
                                {quotations.map((q) => {
                                    const locked = LOCKED_STATUSES.includes(q.status);
                                    return (
                                        <td key={q._id} className="px-4 py-3">
                                            <button
                                                onClick={() => handleSelectWinner(q)}
                                                disabled={selecting || locked}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${locked ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                                    }`}
                                            >
                                                {locked ? "Already Converted" : q.status === "Rejected" ? `Reselect ${q.supplierName}` : `Select ${q.supplierName}`}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}