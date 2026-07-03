"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaFileInvoice,
  FaEye,
  FaPrint,
  FaPlus,
  FaTrash,
  FaCheck,
  FaTimes,
  FaFilter,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ProgressBillingListPage() {
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOrderType, setFilterOrderType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBills, setSelectedBills] = useState([]);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async (orderType = filterOrderType, status = filterStatus) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = new URLSearchParams();
      if (orderType && orderType !== "all") params.append("orderType", orderType);
      if (status && status !== "all") params.append("status", status);
      const res = await api.get(`/construction/progress-billing?${params.toString()}`, headers);
      setBills(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bills.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type, value) => {
    if (type === "orderType") {
      setFilterOrderType(value);
      fetchBills(value, filterStatus);
    } else {
      setFilterStatus(value);
      fetchBills(filterOrderType, value);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/progress-billing/${id}`, headers);
      toast.success("Bill deleted.");
      fetchBills(filterOrderType, filterStatus);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete.");
    }
  };

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const StatusBadge = ({ status }) => {
    const colors = {
      draft: "bg-gray-100 text-gray-600",
      issued: "bg-blue-100 text-blue-700",
      paid: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> Progress Bills
            </h1>
            <p className="text-sm text-gray-400">Manage all progress bills</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/admin/construction/progress-billing")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              <FaPlus size={12} /> New Bill
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" size={14} />
            <span className="text-xs font-bold text-gray-400 uppercase">Filters:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500">Type:</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filterOrderType}
              onChange={(e) => handleFilterChange("orderType", e.target.value)}
            >
              <option value="all">All</option>
              <option value="contractor">Contractor</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500">Status:</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filterStatus}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button
            onClick={() => {
              setFilterOrderType("all");
              setFilterStatus("all");
              fetchBills("all", "all");
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Clear All
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Bill #</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Party</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">No bills found.</td></tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{bill.billNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          bill.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {bill.orderType === "customer" ? "Customer" : "Contractor"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">{bill.project?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {bill.orderType === "customer"
                          ? bill.customer?.customerName || bill.customer?.name || "—"
                          : bill.contractor?.supplierName || bill.contractor?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-800">
                        {formatCurrency(bill.grandTotal || bill.total || 0)}
                      </td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={bill.status} /></td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {new Date(bill.billDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/construction/progress-billing/${bill._id}`)}
                          className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <FaEye size={16} />
                        </button>
                        <button
                          onClick={() => window.open(`/admin/construction/progress-billing/${bill._id}/print`, "_blank")}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Print"
                        >
                          <FaPrint size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(bill._id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}