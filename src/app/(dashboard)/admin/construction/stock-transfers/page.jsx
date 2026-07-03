"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaBoxes,
  FaEye,
  FaSearch,
  FaSync,
  FaWarehouse,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StockTransfersListPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchTransfers = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/construction/stock-transfer?page=${page}&limit=20`, headers);
      setTransfers(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load transfers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const filteredTransfers = transfers.filter((t) => {
    const search = t.transferNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   t.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   t.workOrder?.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = filterStatus === "all" || t.status === filterStatus;
    return search && status;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaBoxes className="text-indigo-600" /> Stock Transfers
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              View all stock transfer history
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/construction/stock-transfer")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaWarehouse size={14} /> New Transfer
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search by transfer #, project, or WO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={() => fetchTransfers()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <FaSync size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Transfer #</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Work Order</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Items</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Amount</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Remarks</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">No transfers found.</td></tr>
                ) : (
                  filteredTransfers.map((t) => (
                    <tr key={t._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{t.transferNumber}</td>
                      <td className="px-6 py-4 text-gray-700">{t.project?.name || "—"}</td>
                      <td className="px-6 py-4 text-gray-700">{t.workOrder?.workOrderNumber || "—"}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{t.items?.length || 0}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(t.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          t.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                          t.status === "draft" ? "bg-gray-100 text-gray-600" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {t.transferredDate ? new Date(t.transferredDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">{t.remarks || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => router.push(`/admin/construction/stock-transfers/${t._id}`)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                          <FaEye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => fetchTransfers(meta.page - 1)}
              disabled={meta.page <= 1}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {meta.page} of {meta.pages}
            </span>
            <button
              onClick={() => fetchTransfers(meta.page + 1)}
              disabled={meta.page >= meta.pages}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}