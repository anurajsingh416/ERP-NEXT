"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaUsers,
  FaProjectDiagram,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaBox,
  FaClipboardList,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

export default function WorkAssignmentPage() {
  const [works, setWorks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [labours, setLabours] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editWork, setEditWork] = useState(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [formProject, setFormProject] = useState(null);
  const [formAssignedLabours, setFormAssignedLabours] = useState([]);
  const [formWorkTitle, setFormWorkTitle] = useState("");
  const [formWorkDescription, setFormWorkDescription] = useState("");
  const [formWorkType, setFormWorkType] = useState("other");
  const [formLocation, setFormLocation] = useState("");
  const [formEstimatedDays, setFormEstimatedDays] = useState(1);
  const [formEstimatedHours, setFormEstimatedHours] = useState(0);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [formEndDate, setFormEndDate] = useState("");
  const [formMaterials, setFormMaterials] = useState([]);
  const [formRemarks, setFormRemarks] = useState("");

  // Progress log form
  const [progressDesc, setProgressDesc] = useState("");
  const [progressHours, setProgressHours] = useState(0);
  const [progressLabour, setProgressLabour] = useState(null);
  const [progressStatus, setProgressStatus] = useState("in-progress");

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

        const [pRes, lRes, wRes, iRes] = await Promise.all([
          api.get("/construction/projects", headers),
          api.get("/construction/labour", headers),
          api.get("/construction/work-assignment", headers),
          api.get("/items?limit=1000", headers),
        ]);

        setProjects(pRes.data?.data || pRes.data || []);
        setLabours(lRes.data?.data || lRes.data || []);
        setWorks(wRes.data?.data || wRes.data || []);
        setInventoryItems(iRes.data?.data || iRes.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchWorks();
  }, [selectedProject, statusFilter]);

  const fetchWorks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const params = new URLSearchParams();
      if (selectedProject) params.append("projectId", selectedProject.value);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const res = await api.get(`/construction/work-assignment?${params.toString()}`, headers);
      setWorks(res.data.data || []);
    } catch (err) {
      console.error("Fetch works error:", err);
    }
  };

  // ---- Build material options with variants (like BOQ page) ----
  const materialOptions = useMemo(() => {
    const options = [];
    inventoryItems.forEach(item => {
      // If item has variants, add each variant as a separate option
      if (item.variants && item.variants.length > 0) {
        item.variants.forEach(variant => {
          // Build variant label with attributes
          let variantLabel = item.itemName;
          if (variant.attributes) {
            const attrStr = Object.entries(variant.attributes)
              .map(([key, val]) => `${key}: ${val}`)
              .join(", ");
            variantLabel += ` (${attrStr})`;
          } else {
            variantLabel += ` (${variant.sku || "variant"})`;
          }
          options.push({
            value: item._id, // store parent item ID
            label: variantLabel,
            isVariant: true,
            parentId: item._id,
            variantData: variant,
            parentItem: item,
            uom: variant.uom || item.uom || "nos",
          });
        });
      } else {
        // No variants – add the parent item
        options.push({
          value: item._id,
          label: item.itemName,
          isVariant: false,
          parentId: null,
          variantData: null,
          parentItem: item,
          uom: item.uom || "nos",
        });
      }
    });
    return options;
  }, [inventoryItems]);

  // ---- Materials handlers (similar to BOQ page) ----
  const addMaterialRow = () => {
    setFormMaterials([
      ...formMaterials,
      {
        materialId: null,
        materialName: "",
        quantity: 0,
        unit: "nos",
        notes: "",
        isCustom: true,
        variantDetails: null,
      },
    ]);
  };

  const removeMaterialRow = (index) => {
    const newMaterials = [...formMaterials];
    newMaterials.splice(index, 1);
    setFormMaterials(newMaterials);
  };

  const updateMaterialField = (index, field, value) => {
    const newMaterials = [...formMaterials];
    newMaterials[index][field] = value;
    setFormMaterials(newMaterials);
  };

  // ---- Handle material/variant selection (like BOQ page) ----
  const handleMaterialSelect = (index, selectedOption) => {
    const newMaterials = [...formMaterials];
    if (selectedOption) {
      // Check if it's a custom option (created by user)
      if (selectedOption.__isNew__) {
        newMaterials[index].materialId = null;
        newMaterials[index].materialName = selectedOption.label;
        newMaterials[index].unit = "nos";
        newMaterials[index].isCustom = true;
        newMaterials[index].variantDetails = null;
      } else {
        // Existing inventory item or variant
        const item = selectedOption.parentItem || inventoryItems.find(i => i._id === selectedOption.value);
        if (item) {
          newMaterials[index].materialId = selectedOption.value;
          newMaterials[index].materialName = selectedOption.label;
          newMaterials[index].unit = selectedOption.uom || item.uom || "nos";
          newMaterials[index].isCustom = false;
          // Store variant details if variant
          if (selectedOption.isVariant && selectedOption.variantData) {
            newMaterials[index].variantDetails = {
              sku: selectedOption.variantData.sku,
              attributes: selectedOption.variantData.attributes,
              price: selectedOption.variantData.price,
            };
            // Also store parent ID as materialId (parent item)
            newMaterials[index].materialId = selectedOption.parentId;
          } else {
            newMaterials[index].variantDetails = null;
          }
        }
      }
    } else {
      // cleared
      newMaterials[index].materialId = null;
      newMaterials[index].materialName = "";
      newMaterials[index].unit = "nos";
      newMaterials[index].isCustom = true;
      newMaterials[index].variantDetails = null;
    }
    setFormMaterials(newMaterials);
  };

  // ---- Form submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formProject || !formWorkTitle || !formWorkDescription) {
      toast.error("Please fill all required fields.");
      return;
    }

    // Prepare materials: remove empty rows (where materialName is empty)
    const cleanMaterials = formMaterials.filter(m => m.materialName && m.materialName.trim() !== "");

    const payload = {
      project: formProject.value,
      assignedLabours: formAssignedLabours.map(l => l.value),
      workTitle: formWorkTitle,
      workDescription: formWorkDescription,
      workType: formWorkType,
      location: formLocation,
      estimatedDays: parseFloat(formEstimatedDays) || 0.5,
      estimatedHours: parseFloat(formEstimatedHours) || 0,
      startDate: formStartDate,
      endDate: formEndDate || undefined,
      materialsUsed: cleanMaterials.map(m => ({
        materialId: m.materialId || null,
        materialName: m.materialName,
        quantity: parseFloat(m.quantity) || 0,
        unit: m.unit || "nos",
        notes: m.notes || "",
      })),
      remarks: formRemarks,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editWork) {
        const res = await api.put(`/construction/work-assignment/${editWork._id}`, payload, headers);
        setWorks(works.map(w => w._id === editWork._id ? res.data.data : w));
        toast.success("Work updated successfully!");
      } else {
        const res = await api.post("/construction/work-assignment", payload, headers);
        setWorks([res.data.data, ...works]);
        toast.success("Work created successfully!");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save.");
    }
  };

  const resetForm = () => {
    setFormProject(null);
    setFormAssignedLabours([]);
    setFormWorkTitle("");
    setFormWorkDescription("");
    setFormWorkType("other");
    setFormLocation("");
    setFormEstimatedDays(1);
    setFormEstimatedHours(0);
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate("");
    setFormMaterials([]);
    setFormRemarks("");
    setEditWork(null);
  };

  const openModal = (work = null) => {
    setEditWork(work);
    if (work) {
      setFormProject({ value: work.project._id, label: work.project.name });
      setFormAssignedLabours(work.assignedLabours.map(l => ({ value: l._id, label: l.name })));
      setFormWorkTitle(work.workTitle);
      setFormWorkDescription(work.workDescription);
      setFormWorkType(work.workType);
      setFormLocation(work.location || "");
      setFormEstimatedDays(work.estimatedDays || 1);
      setFormEstimatedHours(work.estimatedHours || 0);
      setFormStartDate(work.startDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
      setFormEndDate(work.endDate?.split("T")[0] || "");
      // Populate materials (matching the schema)
      setFormMaterials(
        work.materialsUsed?.map(m => ({
          materialId: m.materialId?._id || m.materialId || null,
          materialName: m.materialName || m.materialId?.itemName || "",
          quantity: m.quantity || 0,
          unit: m.unit || "nos",
          notes: m.notes || "",
          isCustom: !m.materialId,
          variantDetails: null,
        })) || []
      );
      setFormRemarks(work.remarks || "");
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this work?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/work-assignment/${id}`, headers);
      setWorks(works.filter(w => w._id !== id));
      toast.success("Work deleted.");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete.");
    }
  };

  // Progress Log
  const openProgressModal = (workId) => {
    setSelectedWorkId(workId);
    setProgressDesc("");
    setProgressHours(0);
    setProgressLabour(null);
    setProgressStatus("in-progress");
    setProgressModalOpen(true);
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!progressDesc) {
      toast.error("Please enter progress description.");
      return;
    }

    const payload = {
      workId: selectedWorkId,
      labourId: progressLabour?.value || null,
      description: progressDesc,
      hoursWorked: parseFloat(progressHours) || 0,
      status: progressStatus,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post("/construction/work-assignment/progress", payload, headers);
      toast.success("Progress log added!");
      setProgressModalOpen(false);
      fetchWorks();
    } catch (err) {
      console.error("Progress error:", err);
      toast.error(err.response?.data?.message || "Failed to add progress.");
    }
  };

  // UI Helpers
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      assigned: "bg-blue-100 text-blue-700",
      "in-progress": "bg-amber-100 text-amber-700",
      completed: "bg-emerald-100 text-emerald-700",
      delayed: "bg-red-100 text-red-700",
      cancelled: "bg-gray-100 text-gray-600",
    };
    return (
      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.assigned}`}>
        {status}
      </span>
    );
  };

  const getStatusCount = (status) => works.filter(w => w.status === status).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaClipboardList className="text-indigo-600" /> Work Assignments
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Assign and track work for labours</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> New Work
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{getStatusCount("assigned")}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Assigned</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{getStatusCount("in-progress")}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">In Progress</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{getStatusCount("completed")}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Completed</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{getStatusCount("delayed")}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Delayed</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-600">{getStatusCount("cancelled")}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Cancelled</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Lbl text="Project" />
              <Select
                options={projects.map(p => ({ value: p._id, label: p.name }))}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="All Projects"
                isClearable
              />
            </div>
            <div>
              <Lbl text="Status" />
              <select className={fi} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
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
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Work Title</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Labours</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Est. Days</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : works.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No work assignments found.</td></tr>
                ) : (
                  works.map((w, idx) => (
                    <tr key={w._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{w.workTitle}</td>
                      <td className="px-6 py-4 font-medium text-indigo-600">{w.project?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {w.assignedLabours?.map(l => l.name).join(", ") || "No labours"}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">{w.estimatedDays}d</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={w.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openProgressModal(w._id)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 transition-colors"
                            title="Add Progress"
                          >
                            <FaClock size={14} />
                          </button>
                          <button onClick={() => openModal(w)} className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors">
                            <FaEdit size={14} />
                          </button>
                          <button onClick={() => handleDelete(w._id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
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

      {/* Work Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <FaClipboardList className="text-indigo-600" size={20} />
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editWork ? "Update Work" : "Create Work Assignment"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* === Basic Fields === */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map(p => ({ value: p._id, label: p.name }))}
                    value={formProject}
                    onChange={setFormProject}
                    placeholder="Select project..."
                    className="text-sm"
                  />
                </div>
                <div>
                  <Lbl text="Assigned Labours" />
                  <Select
                    isMulti
                    options={labours.map(l => ({ value: l._id, label: l.name }))}
                    value={formAssignedLabours}
                    onChange={setFormAssignedLabours}
                    placeholder="Select labours..."
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Work Title" req />
                  <input
                    type="text"
                    className={fi}
                    value={formWorkTitle}
                    onChange={e => setFormWorkTitle(e.target.value)}
                    placeholder="e.g., Wall Plastering - Ground Floor"
                  />
                </div>
                <div>
                  <Lbl text="Work Type" />
                  <select className={fi} value={formWorkType} onChange={e => setFormWorkType(e.target.value)}>
                    <option value="masonry">Masonry</option>
                    <option value="plastering">Plastering</option>
                    <option value="flooring">Flooring</option>
                    <option value="tiling">Tiling</option>
                    <option value="painting">Painting</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="roofing">Roofing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <Lbl text="Work Description" req />
                <textarea
                  className={`${fi} h-20 resize-none`}
                  value={formWorkDescription}
                  onChange={e => setFormWorkDescription(e.target.value)}
                  placeholder="Detailed description of the work..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="Location" />
                  <input
                    type="text"
                    className={fi}
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    placeholder="Floor / Area / Room"
                  />
                </div>
                <div>
                  <Lbl text="Est. Days" req />
                  <input
                    type="number"
                    step="0.5"
                    className={fi}
                    value={formEstimatedDays}
                    onChange={e => setFormEstimatedDays(e.target.value)}
                    placeholder="0.5"
                  />
                </div>
                <div>
                  <Lbl text="Est. Hours" />
                  <input
                    type="number"
                    className={fi}
                    value={formEstimatedHours}
                    onChange={e => setFormEstimatedHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Start Date" />
                  <input type="date" className={fi} value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
                </div>
                <div>
                  <Lbl text="End Date" />
                  <input type="date" className={fi} value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
                </div>
              </div>

              {/* -------- MATERIALS SECTION (like BOQ page) -------- */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FaBox /> Materials Used
                  </p>
                  <button
                    type="button"
                    onClick={addMaterialRow}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <FaPlus size={10} /> Add Material
                  </button>
                </div>

                {formMaterials.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    No materials added. Click "Add Material" to add.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <tr>
                          <th className="px-3 py-2 text-left min-w-[220px]">Material / Variant</th>
                          <th className="px-3 py-2 text-center w-[100px]">Qty</th>
                          <th className="px-3 py-2 text-center w-[80px]">Unit</th>
                          <th className="px-3 py-2 text-left min-w-[150px]">Notes</th>
                          <th className="px-3 py-2 text-center w-[50px]">#</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {formMaterials.map((mat, idx) => {
                          // Find current value for CreatableSelect
                          let currentValue = null;
                          if (mat.materialId && !mat.isCustom) {
                            const foundOption = materialOptions.find(opt => opt.value === mat.materialId);
                            if (foundOption) {
                              currentValue = foundOption;
                            } else {
                              currentValue = { value: mat.materialId, label: mat.materialName };
                            }
                          } else if (mat.materialName && mat.isCustom) {
                            currentValue = { value: mat.materialName, label: mat.materialName, __isNew__: true };
                          }
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-2">
                                <CreatableSelect
                                  className="text-xs"
                                  options={materialOptions}
                                  value={currentValue}
                                  onChange={(opt) => handleMaterialSelect(idx, opt)}
                                  placeholder="Search or type material..."
                                  isClearable
                                  formatCreateLabel={(input) => `Create "${input}" (Custom)`}
                                />
                                {mat.variantDetails && (
                                  <p className="text-[8px] text-indigo-500 mt-0.5">
                                    Variant: {mat.variantDetails.sku} - {Object.entries(mat.variantDetails.attributes || {}).map(([k,v]) => `${k}: ${v}`).join(', ')}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                  value={mat.quantity || 0}
                                  onChange={e => updateMaterialField(idx, "quantity", parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                  value={mat.unit || "nos"}
                                  onChange={e => updateMaterialField(idx, "unit", e.target.value)}
                                  placeholder="nos"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
                                  value={mat.notes || ""}
                                  onChange={e => updateMaterialField(idx, "notes", e.target.value)}
                                  placeholder="Notes..."
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeMaterialRow(idx)}
                                  className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <FaTrash size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* -------- END OF MATERIALS SECTION -------- */}

              <div>
                <Lbl text="Remarks" />
                <input
                  type="text"
                  className={fi}
                  value={formRemarks}
                  onChange={e => setFormRemarks(e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50 sticky bottom-0 bg-white py-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  <FaSave size={12} /> {editWork ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {progressModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-3">
                <FaClock className="text-amber-600" size={20} />
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Add Progress</h2>
              </div>
              <button onClick={() => setProgressModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleProgressSubmit} className="p-6 space-y-4">
              <div>
                <Lbl text="Labour" />
                <Select
                  options={labours.map(l => ({ value: l._id, label: l.name }))}
                  value={progressLabour}
                  onChange={setProgressLabour}
                  placeholder="Select labour..."
                  isClearable
                />
              </div>
              <div>
                <Lbl text="Progress Description" req />
                <input
                  type="text"
                  className={fi}
                  value={progressDesc}
                  onChange={e => setProgressDesc(e.target.value)}
                  placeholder="What was done today?"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Lbl text="Hours Worked" />
                  <input
                    type="number"
                    step="0.5"
                    className={fi}
                    value={progressHours}
                    onChange={e => setProgressHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Lbl text="Status" />
                  <select className={fi} value={progressStatus} onChange={e => setProgressStatus(e.target.value)}>
                    <option value="started">Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed-day">Completed for the Day</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setProgressModalOpen(false)} className="text-sm font-bold text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-all">
                  <FaCheckCircle size={12} /> Add Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}