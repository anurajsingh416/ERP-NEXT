"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaArrowLeft, FaFileInvoice, FaUser, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";

export default function BidDetailPage() {
  const { id, bidId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState(null);

  useEffect(() => {
    const fetchBid = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/construction/tenders/${id}/bids/${bidId}`, headers);
        setBid(res.data.data || res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load bid");
      } finally {
        setLoading(false);
      }
    };
    fetchBid();
  }, [bidId, id]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Bid not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Bid Details
            </h1>
            <p className="text-sm text-gray-500">
              {bid.vendor?.supplierName || bid.vendor?.name || bid.vendor?.contactPersonName || "—"} · {new Date(bid.submittedDate).toLocaleString()}
            </p>
          </div>
          <div className="ml-auto">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                bid.status === "submitted"
                  ? "bg-blue-100 text-blue-700"
                  : bid.status === "evaluated"
                  ? "bg-amber-100 text-amber-700"
                  : bid.status === "awarded"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {bid.status}
            </span>
          </div>
        </div>

        {/* Bid Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Amount</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(bid.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</p>
            <p className="text-lg font-bold text-gray-800">{bid.vendor?.supplierName || bid.vendor?.name || bid.vendor?.contactPersonName || "—"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Items</p>
            <p className="text-lg font-bold text-gray-800">{bid.items?.length || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Score</p>
            <p className="text-lg font-bold text-gray-800">{bid.overallScore?.toFixed(2) || "—"}</p>
          </div>
        </div>

        {/* Evaluation */}
        {bid.evaluation && bid.evaluation.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4">Evaluation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {bid.evaluation.map((ev, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{ev.criterion}</p>
                  <p className="text-lg font-bold text-indigo-600">{ev.score}</p>
                  {ev.remarks && <p className="text-xs text-gray-400">{ev.remarks}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FaFileInvoice className="text-indigo-600" /> Bid Items ({bid.items?.length || 0})
            </h2>
          </div>
          <div className="overflow-x-auto p-6">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Item</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Unit</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Quoted Rate</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bid.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/20 transition-all">
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{item.itemName}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{item.unit}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">₹{item.quotedRate}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}