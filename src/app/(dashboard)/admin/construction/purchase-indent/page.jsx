"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaPlus,
  FaBoxes,
  FaCheck,
  FaSync,
  FaTrash,
  FaEdit,
  FaTimes,
  FaSave,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

export default function PurchaseIndentPage() {
  const [indents, setIndents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [boqs, setBoqs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Generate Modal ──────────────────────────────────────────────────────
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formProject, setFormProject] = useState(null);
  const [formBoq, setFormBoq] = useState(null);

  // ─── Edit Modal ──────────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editRequiredDate, setEditRequiredDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editItems, setEditItems] = useState([]);
  const [editing, setEditing] = useState(false);

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // ─── Fetch initial data ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [pRes, bRes, iRes] = await Promise.all([
          api.get("/construction/projects", headers),
          api.get("/construction/boq", headers),
          api.get("/construction/purchase-indent", headers),
        ]);

        setProjects(pRes.data?.data || pRes.data || []);
        setBoqs(bRes.data?.data || bRes.data || []);
        setIndents(iRes.data?.data || iRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ─── Fetch indents with filters ──────────────────────────────────────────
  const fetchIndents = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = new URLSearchParams();
      if (selectedProject) params.append("projectId", selectedProject.value);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const res = await api.get(`/construction/purchase-indent?${params.toString()}`, headers);
      setIndents(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Fetch indents error:", err);
    }
  }, [selectedProject, statusFilter]);

  useEffect(() => {
    fetchIndents();
  }, [fetchIndents]);

  // ─── Generate from BOQ ────────────────────────────────────────────────────
  const generateFromBOQ = async () => {
    if (!formBoq || !formProject) {
      toast.error("Please select both Project and BOQ");
      return;
    }
    setGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.post(
        "/construction/purchase-indent/generate-from-boq",
        {
          boqId: formBoq.value,
          projectId: formProject.value,
        },
        headers
      );
      toast.success(res.data.message || "Purchase Indent generated!");
      setIsGenerateModalOpen(false);
      setFormProject(null);
      setFormBoq(null);
      await fetchIndents();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to generate indent.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Open Edit Modal ─────────────────────────────────────────────────────
  const openEditModal = (indent) => {
    setEditData(indent);
    setEditStatus(indent.status || "pending");
    setEditPriority(indent.priority || "medium");
    setEditRequiredDate(
      indent.requiredDate ? indent.requiredDate.split("T")[0] : ""
    );
    setEditRemarks(indent.remarks || "");
    setEditItems(indent.items || []);
    setIsEditModalOpen(true);
  };

  // ─── Update Indent ──────────────────────────────────────────────────────
  const handleEditSubmit = async () => {
    if (!editData) return;
    setEditing(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        status: editStatus,
        priority: editPriority,
        requiredDate: editRequiredDate || undefined,
        remarks: editRemarks,
      };
      const res = await api.put(
        `/construction/purchase-indent/${editData._id}`,
        payload,
        headers
      );
      toast.success("Purchase Indent updated successfully!");
      setIsEditModalOpen(false);
      setEditData(null);
      await fetchIndents();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update indent.");
    } finally {
      setEditing(false);
    }
  };

  // ─── Delete Indent ──────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this Purchase Indent?"))
      return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/purchase-indent/${id}`, headers);
      toast.success("Purchase Indent deleted!");
      await fetchIndents();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete indent.");
    }
  };

  // ─── UI Helpers ──────────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const fi =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      draft: "bg-gray-100 text-gray-600",
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-blue-100 text-blue-700",
      purchased: "bg-emerald-100 text-emerald-700",
      "partially-purchased": "bg-purple-100 text-purple-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}
      >
        {status}
      </span>
    );
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaBoxes className="text-indigo-600" /> Purchase Indent
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Material requisition from BOQ
            </p>
          </div>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> New Indent
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {indents.filter((i) => i.status === "pending").length}
            </p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Pending</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {indents.filter((i) => i.status === "approved").length}
            </p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Approved</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {indents.filter((i) => i.status === "purchased").length}
            </p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Purchased</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">
              {indents.filter((i) => i.status === "rejected").length}
            </p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Rejected</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Lbl text="Project" />
              <Select
                options={projects.map((p) => ({ value: p._id, label: p.name }))}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="All Projects"
                isClearable
                className="text-sm"
              />
            </div>
            <div>
              <Lbl text="Status" />
              <select
                className={fi}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="purchased">Purchased</option>
                <option value="partially-purchased">Partially Purchased</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Indent #
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Project
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Items
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                      Loading...
                    </td>
                  </tr>
                ) : indents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                      No purchase indents found.
                    </td>
                  </tr>
                ) : (
                  indents.map((i) => (
                    <tr key={i._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {i.indentNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {i.project?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {i.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(i.totalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            i.priority === "critical"
                              ? "bg-red-100 text-red-700"
                              : i.priority === "high"
                              ? "bg-orange-100 text-orange-700"
                              : i.priority === "medium"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {i.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(i)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit Indent"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(i._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Indent"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Modal: Generate from BOQ ──────────────────────────────────────────── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <FaBoxes className="text-indigo-600" size={20} />
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Generate from BOQ
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Lbl text="Project" req />
                <Select
                  options={projects.map((p) => ({ value: p._id, label: p.name }))}
                  value={formProject}
                  onChange={setFormProject}
                  placeholder="Select project..."
                  className="text-sm"
                />
              </div>
              <div>
                <Lbl text="BOQ" req />
                <Select
                  options={boqs.map((b) => ({ value: b._id, label: b.boqNumber }))}
                  value={formBoq}
                  onChange={setFormBoq}
                  placeholder="Select BOQ..."
                  className="text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  onClick={() => {
                    setIsGenerateModalOpen(false);
                    setFormProject(null);
                    setFormBoq(null);
                  }}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={generateFromBOQ}
                  disabled={generating}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaSync size={12} /> Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit Indent ────────────────────────────────────────────────── */}
      {isEditModalOpen && editData && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-amber-50/50 shrink-0">
              <FaEdit className="text-amber-600" size={20} />
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Edit Purchase Indent
              </h2>
              <span className="ml-auto text-xs text-gray-400">
                {editData.indentNumber}
              </span>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Project" />
                  <input
                    type="text"
                    className={`${fi} bg-gray-100 cursor-not-allowed`}
                    value={editData.project?.name || "N/A"}
                    disabled
                  />
                </div>
                <div>
                  <Lbl text="BOQ" />
                  <input
                    type="text"
                    className={`${fi} bg-gray-100 cursor-not-allowed`}
                    value={editData.boq?.boqNumber || "N/A"}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Status" />
                  <select
                    className={fi}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="purchased">Purchased</option>
                    <option value="partially-purchased">Partially Purchased</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Priority" />
                  <select
                    className={fi}
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <Lbl text="Required Date" />
                <input
                  type="date"
                  className={fi}
                  value={editRequiredDate}
                  onChange={(e) => setEditRequiredDate(e.target.value)}
                />
              </div>

              <div>
                <Lbl text="Remarks" />
                <textarea
                  className={`${fi} h-20 resize-none`}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Items List (read-only) */}
              {editItems.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">
                    Items ({editItems.length})
                  </p>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase text-gray-400">
                            Material
                          </th>
                          <th className="px-2 py-1.5 text-center text-[9px] font-bold uppercase text-gray-400">
                            Req Qty
                          </th>
                          <th className="px-2 py-1.5 text-center text-[9px] font-bold uppercase text-gray-400">
                            Avail Qty
                          </th>
                          <th className="px-2 py-1.5 text-center text-[9px] font-bold uppercase text-gray-400">
                            To Purchase
                          </th>
                          <th className="px-2 py-1.5 text-right text-[9px] font-bold uppercase text-gray-400">
                            Est. Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 text-gray-700">
                              {item.itemName}
                            </td>
                            <td className="px-2 py-1.5 text-center text-gray-600">
                              {item.quantityRequired}
                            </td>
                            <td className="px-2 py-1.5 text-center text-gray-600">
                              {item.quantityAvailable || 0}
                            </td>
                            <td className="px-2 py-1.5 text-center font-bold text-indigo-600">
                              {item.quantityToPurchase}
                            </td>
                            <td className="px-2 py-1.5 text-right font-bold text-gray-700">
                              {formatCurrency(item.estimatedAmount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50/80 border-t border-gray-200">
                        <tr>
                          <td colSpan="4" className="px-2 py-1.5 text-right font-bold text-gray-600 text-xs">
                            Total Amount
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold text-indigo-600">
                            {formatCurrency(
                              editItems.reduce(
                                (sum, item) => sum + (item.estimatedAmount || 0),
                                0
                              )
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50 mt-2">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditData(null);
                  }}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editing}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-all disabled:opacity-50"
                >
                  {editing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave size={12} /> Update
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}