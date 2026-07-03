"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaBoxes,
  FaFileContract,
  FaWarehouse,
  FaUser,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StockTransferViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState(null);

  useEffect(() => {
    const fetchTransfer = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/construction/stock-transfer/${id}`, headers);
        setTransfer(res.data.data || res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load transfer details.");
      } finally {
        setLoading(false);
      }
    };
    fetchTransfer();
  }, [id, router]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading transfer details...</div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Transfer not found.</div>
      </div>
    );
  }

  const totalAmount = transfer.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <FaBoxes className="text-indigo-600" /> {transfer.transferNumber}
          </h1>
          <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
            <span className="font-bold text-gray-400">Total:</span>
            <span className="font-black text-indigo-600">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project</p>
            <p className="text-lg font-bold text-gray-800">{transfer.project?.name || "—"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Work Order</p>
            <p className="text-lg font-bold text-indigo-600">{transfer.workOrder?.workOrderNumber || "—"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</p>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
              transfer.workOrder?.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
            }`}>
              {transfer.workOrder?.orderType === "customer" ? "Customer" : "Contractor"}
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
            <span className={`text-lg font-bold ${
              transfer.status === "completed" ? "text-emerald-600" :
              transfer.status === "draft" ? "text-gray-600" : "text-red-600"
            }`}>
              {transfer.status}
            </span>
          </div>
        </div>

        {/* Warehouse Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <FaWarehouse className="text-indigo-500" size={14} /> Source Warehouse
            </p>
            <p className="text-sm font-bold text-gray-700">
              {transfer.sourceWarehouseName || transfer.sourceWarehouse || "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <FaWarehouse className="text-emerald-500" size={14} /> Destination Warehouse
            </p>
            <p className="text-sm font-bold text-gray-700">
              {transfer.destinationWarehouseName || transfer.destinationWarehouse || "—"}
            </p>
          </div>
        </div>

        {/* Transferred Date */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FaCalendarAlt size={14} className="text-gray-400" /> Transferred Date
          </p>
          <p className="text-sm font-bold text-gray-700">
            {transfer.transferredDate ? new Date(transfer.transferredDate).toLocaleString() : "—"}
          </p>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FaBoxes className="text-indigo-600" /> Transferred Items ({transfer.items?.length || 0})
            </h2>
          </div>
          <div className="overflow-x-auto p-6">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Item</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfer.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/20">
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {item.itemName || item.itemId || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{item.unit || "—"}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{item.rate}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {(!transfer.items || transfer.items.length === 0) && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-400 italic">No items transferred.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        {transfer.remarks && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remarks</p>
            <p className="text-sm text-gray-700">{transfer.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
}