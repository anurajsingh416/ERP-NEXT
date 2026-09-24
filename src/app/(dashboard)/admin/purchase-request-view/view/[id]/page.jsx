"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEdit, FaArrowLeft, FaFileAlt } from "react-icons/fa";

const STATUS_STYLES = {
    Draft: "bg-gray-100 text-gray-500",
    Pending: "bg-amber-50 text-amber-600",
    Ordered: "bg-green-50 text-green-600",
    "Partially Ordered": "bg-blue-50 text-blue-600",
    Received: "bg-teal-50 text-teal-600",
    Cancelled: "bg-red-50 text-red-500",
    "Quoted": "bg-purple-50 text-purple-600"
};

const SectionCard = ({ icon: Icon, title, children, color = "indigo" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-${color}-100 overflow-hidden mb-6`}>
        <div className={`bg-${color}-50 px-5 py-3 border-b border-${color}-100 flex items-center gap-2`}>
            <Icon className={`text-${color}-500 text-sm`} />
            <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Field = ({ label, value }) => (
    <div>
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
    </div>
);

export default function PurchaseRequestDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [quotations, setQuotations] = useState([]);

    useEffect(() => {
        if (!data?._id) return;
        const token = localStorage.getItem("token");
        axios.get("/api/purchase-quotation", { headers: { Authorization: `Bearer ${token}` }, params: { purchaseRequestId: data._id, limit: 50 } })
            .then((res) => setQuotations(res.data.data || []));
    }, [data]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios.get("/api/purchase-request", {
            headers: { Authorization: `Bearer ${token}` },
            params: { id },
        })
            .then((res) => setData(res.data.data))
            .catch(() => toast.error("Failed to load purchase request"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
                <p className="text-gray-400">Purchase Request not found</p>
                <button onClick={() => router.push("/admin/purchase-request-view")} className="text-indigo-600 text-sm font-semibold">
                    Back to list
                </button>
            </div>
        );
    }

    const totalEstimated = data.items?.reduce((sum, i) => sum + (i.estimatedAmount || 0), 0) || 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
                <button onClick={() => router.push("/admin/purchase-request-view")}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-4">
                    <FaArrowLeft size={11} /> Back to Purchase Requests
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{data.title}</h1>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[data.status] || "bg-gray-100 text-gray-500"}`}>
                                {data.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1 font-mono">{data.requestNumber}</p>
                    </div>
                    <div className="flex gap-2">
                        {data.status !== "Cancelled" && (
                            <button
                                onClick={() => router.push(`/admin/PurchaseQuotationList/new?fromRequestId=${data._id}`)}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-orange-400 text-white text-sm font-semibold hover:bg-orange-300 shadow-sm"
                            >
                                Create Quotation
                            </button>
                        )}
                        <button
                            onClick={() => router.push(`/admin/purchase-request-view/new?editId=${data._id}`)}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
                        >
                            <FaEdit size={12} /> Edit
                        </button>
                    </div>
                </div>

                <SectionCard icon={FaFileAlt} title="Request Details">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <Field label="Purpose" value={data.purpose} />
                        <Field label="Transaction Date" value={data.transactionDate ? new Date(data.transactionDate).toLocaleDateString("en-GB") : "—"} />
                        <Field label="Required By" value={data.requiredBy ? new Date(data.requiredBy).toLocaleDateString("en-GB") : "—"} />
                        <Field label="Price List" value={data.priceList} />
                        <Field label="Created" value={data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-GB") : "—"} />
                        <Field label="Last Updated" value={data.updatedAt ? new Date(data.updatedAt).toLocaleDateString("en-GB") : "—"} />
                    </div>
                </SectionCard>

                <SectionCard icon={FaFileAlt} title="Items">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-indigo-600">
                                    {["No.", "Item Code", "Item Name", "UOM", "Required By", "Quantity"/*, "Est. Rate", "Est. Amount*/].map((h) => (
                                        <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-white">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.items?.map((line, idx) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                                        <td className="px-3 py-2.5 font-mono text-xs text-indigo-600">{line.itemCode}</td>
                                        <td className="px-3 py-2.5 text-gray-800 font-medium">{line.itemName}</td>
                                        <td className="px-3 py-2.5 text-gray-500">{line.uom}</td>
                                        <td className="px-3 py-2.5 text-gray-500">{line.requiredBy ? new Date(line.requiredBy).toLocaleDateString("en-GB") : "—"}</td>
                                        <td className="px-3 py-2.5 text-gray-800 font-semibold">{line.quantity}</td>
                                        {/* <td className="px-3 py-2.5 text-gray-500">{line.estimatedRate ? `₹${line.estimatedRate}` : "—"}</td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-gray-800">
                                            ₹{Number(line.estimatedAmount || 0).toLocaleString("en-IN")}
                                        </td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                <SectionCard icon={FaFileAlt} title={`Quotations Received (${quotations.length})`}>
                    {quotations.length === 0 ? (
                        <p className="text-sm text-gray-400">No quotations yet — use "Copy → Quotation" above to request pricing from a supplier.</p>
                    ) : (
                        <>
                            <div className="space-y-2 mb-4">
                                {quotations.map((q) => (
                                    <div key={q._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{q.supplierName}</p>
                                            <p className="text-xs text-gray-400 font-mono">{q.documentNumber}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-gray-700">₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}</span>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.status === "Rejected" ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"}`}>
                                                {q.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {quotations.length >= 2 && (
                                <button
                                    onClick={() => router.push(`/admin/purchase-request-view/compare/${data._id}`)}
                                    className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                                >
                                    Compare Quotations
                                </button>
                            )}
                        </>
                    )}
                </SectionCard>

                {/* <SectionCard icon={FaFileAlt} title="Financial Summary">
                    <Field label="Estimated Total" value={`₹${totalEstimated.toLocaleString("en-IN")}`} />
                </SectionCard> */}

                {data.remarks && (
                    <SectionCard icon={FaFileAlt} title="Remarks">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.remarks}</p>
                    </SectionCard>
                )}
            </div>
        </div>
    );
}