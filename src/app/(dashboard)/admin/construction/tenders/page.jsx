"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaFileContract } from "react-icons/fa";
import { toast } from "react-toastify";

export default function TendersPage() {
  const router = useRouter();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/construction/tenders", headers);
      setTenders(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this tender?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/tenders/${id}`, headers);
      toast.success("Tender deleted");
      fetchTenders();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = tenders.filter(t => {
    const search = t.tenderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   t.project?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = statusFilter === "all" || t.status === statusFilter;
    return search && status;
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-600",
    published: "bg-blue-100 text-blue-700",
    closed: "bg-amber-100 text-amber-700",
    awarded: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileContract className="text-indigo-600" /> Tenders
            </h1>
            <p className="text-sm text-gray-400">Manage tenders and bidding process</p>
          </div>
          <button
            onClick={() => router.push("/admin/construction/tenders/create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg"
          >
            <FaPlus size={12} /> New Tender
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search by number, title, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
              <option value="awarded">Awarded</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={fetchTenders} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Refresh</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Tender #</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Title</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Project</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Deadline</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Status</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">No tenders found.</td></tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-indigo-600">{t.tenderNumber}</td>
                      <td className="px-6 py-4">{t.title}</td>
                      <td className="px-6 py-4">{t.project?.name || "—"}</td>
                      <td className="px-6 py-4">{t.submissionDeadline ? new Date(t.submissionDeadline).toLocaleDateString() : "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusColors[t.status] || "bg-gray-100 text-gray-600"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/construction/tenders/${t._id}`)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                          title="View"
                        >
                          <FaEye size={14} />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/construction/tenders/${t._id}/edit`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all ml-1"
                          title="Edit"
                          disabled={t.status === "awarded" || t.status === "cancelled"}
                        >
                          <FaEdit size={14} />
                        </button>
                        {t.status === "draft" && (
                          <button
                            onClick={() => handleDelete(t._id)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-all ml-1"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        )}
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