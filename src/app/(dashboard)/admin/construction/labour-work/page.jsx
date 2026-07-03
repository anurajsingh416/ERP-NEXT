"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Select from "react-select";
import { useRouter } from "next/navigation";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaUsers,
  FaProjectDiagram,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlay,
  FaPause,
  FaStop,
  FaListUl,
  FaUser,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

// ─── Helper: Generate unique ID for rows ─────────────────────────────────
let idCounter = 0;
const generateId = () => ++idCounter;

export default function LabourWorkPage() {
  const [works, setWorks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editWork, setEditWork] = useState(null);

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [filterProject, setFilterProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  // ─── Form state ──────────────────────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedLabours, setSelectedLabours] = useState([]);
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [workType, setWorkType] = useState("other");
  const [location, setLocation] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");

  // ─── Progress modal ──────────────────────────────────────────────────────
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);
  const [progressLabour, setProgressLabour] = useState(null);
  const [progressDescription, setProgressDescription] = useState("");
  const [progressHours, setProgressHours] = useState("");
  const [progressStatus, setProgressStatus] = useState("in-progress");

  const router = useRouter();

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

        const [pRes, lRes, wRes] = await Promise.all([
          api.get("/construction/projects", headers),
          api.get("/construction/labour", headers),
          api.get("/construction/labour-work", headers),
        ]);

        setProjects(pRes.data?.data || pRes.data || []);
        setLabours(lRes.data?.data || lRes.data || []);
        setWorks(wRes.data?.data || wRes.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ─── Fetch works with filters ────────────────────────────────────────────
  const fetchWorks = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject.value);
      if (filterStatus) params.append("status", filterStatus);

      const res = await api.get(`/construction/labour-work?${params.toString()}`, headers);
      setWorks(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Fetch works error:", err);
    }
  }, [filterProject, filterStatus]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  // ─── Open Modal ──────────────────────────────────────────────────────────
  const openModal = (work = null) => {
    setEditWork(work);
    if (work) {
      setSelectedProject({ value: work.project._id, label: work.project.name });
      setSelectedLabours(
        work.assignedLabours?.map((l) => ({
          value: l._id,
          label: l.name,
        })) || []
      );
      setWorkTitle(work.workTitle || "");
      setWorkDescription(work.workDescription || "");
      setWorkType(work.workType || "other");
      setLocation(work.location || "");
      setEstimatedDays(work.estimatedDays || "");
      setStartDate(
        work.startDate?.split("T")[0] || new Date().toISOString().split("T")[0]
      );
      setRemarks(work.remarks || "");
    } else {
      setSelectedProject(null);
      setSelectedLabours([]);
      setWorkTitle("");
      setWorkDescription("");
      setWorkType("other");
      setLocation("");
      setEstimatedDays("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setRemarks("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditWork(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      toast.error("Please select a project.");
      return;
    }
    if (!selectedLabours || selectedLabours.length === 0) {
      toast.error("Please assign at least one labour.");
      return;
    }
    if (!workTitle || !workDescription || !estimatedDays) {
      toast.error("Please fill all required fields.");
      return;
    }

    const payload = {
      project: selectedProject.value,
      assignedLabours: selectedLabours.map((l) => l.value),
      workTitle,
      workDescription,
      workType,
      location,
      estimatedDays: parseFloat(estimatedDays) || 0,
      startDate,
      remarks,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      if (editWork) {
        // ✅ FIX: Proper PUT request with ID
        const res = await api.put(
          `/construction/labour-work/${editWork._id}`,
          payload,
          headers
        );
        setWorks(
          works.map((w) =>
            w._id === editWork._id ? res.data.data || res.data : w
          )
        );
        toast.success("Work updated successfully!");
      } else {
        const res = await api.post("/construction/labour-work", payload, headers);
        setWorks([res.data.data || res.data, ...works]);
        toast.success("Work assigned successfully!");
      }
      closeModal();
      fetchWorks(); // Refresh list
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(err.response?.data?.message || "Failed to save.");
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this work assignment?"))
      return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/labour-work/${id}`, headers);
      setWorks(works.filter((w) => w._id !== id));
      toast.success("Work deleted.");
      fetchWorks();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete.");
    }
  };

  // ─── Update Status ──────────────────────────────────────────────────────
  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { status: newStatus };
      if (newStatus === "completed") {
        payload.endDate = new Date().toISOString();
        // Calculate actual days
        const work = works.find((w) => w._id === id);
        if (work?.startDate) {
          const start = new Date(work.startDate);
          const end = new Date();
          const diffTime = Math.abs(end - start);
          payload.actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
      const res = await api.put(
        `/construction/labour-work/${id}`,
        payload,
        headers
      );
      setWorks(
        works.map((w) => (w._id === id ? res.data.data || res.data : w))
      );
      toast.success(`Status updated to ${newStatus}`);
      fetchWorks();
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status.");
    }
  };

  // ─── Progress Modal ──────────────────────────────────────────────────────
  const openProgressModal = (work) => {
    setSelectedWork(work);
    setProgressLabour(null);
    setProgressDescription("");
    setProgressHours("");
    setProgressStatus("in-progress");
    setProgressModalOpen(true);
  };

  // ─── Add Progress Log ────────────────────────────────────────────────────
  const handleAddProgress = async () => {
    if (!progressLabour) {
      toast.error("Please select a labour.");
      return;
    }
    if (!progressDescription || !progressHours) {
      toast.error("Please fill all fields.");
      return;
    }

    const payload = {
      labourId: progressLabour.value,
      description: progressDescription,
      hoursWorked: parseFloat(progressHours) || 0,
      status: progressStatus,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      // ✅ FIX: Correct progress endpoint with ID
      const res = await api.post(
        `/construction/labour-work/${selectedWork._id}/progress`,
        payload,
        headers
      );
      setWorks(
        works.map((w) =>
          w._id === selectedWork._id ? res.data.data || res.data : w
        )
      );
      toast.success("Progress added!");
      setProgressModalOpen(false);
      fetchWorks();
    } catch (err) {
      console.error("Progress add error:", err);
      toast.error(err.response?.data?.message || "Failed to add progress.");
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
      assigned: "bg-gray-100 text-gray-600",
      "in-progress": "bg-blue-100 text-blue-700",
      completed: "bg-emerald-100 text-emerald-700",
      delayed: "bg-red-100 text-red-700",
      cancelled: "bg-gray-300 text-gray-500",
    };
    const icons = {
      assigned: <FaClock className="text-[8px]" />,
      "in-progress": <FaPlay className="text-[8px]" />,
      completed: <FaCheckCircle className="text-[8px]" />,
      delayed: <FaExclamationTriangle className="text-[8px]" />,
      cancelled: <FaTimes className="text-[8px]" />,
    };
    return (
      <span
        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${colors[status] || colors.assigned}`}
      >
        {icons[status]} {status}
      </span>
    );
  };

  const workTypeLabels = {
    masonry: "🧱 Masonry",
    plastering: "🪄 Plastering",
    flooring: "🪑 Flooring",
    tiling: "🔲 Tiling",
    painting: "🎨 Painting",
    carpentry: "🪚 Carpentry",
    plumbing: "🔧 Plumbing",
    electrical: "⚡ Electrical",
    roofing: "🏠 Roofing",
    other: "📦 Other",
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaUsers className="text-indigo-600" /> Labour Work Assignment
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Assign work to labours and track progress
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Assign Work
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Lbl text="Filter by Project" />
              <Select
                options={projects.map((p) => ({ value: p._id, label: p.name }))}
                value={filterProject}
                onChange={setFilterProject}
                placeholder="All Projects"
                isClearable
                className="text-sm"
              />
            </div>
            <div>
              <Lbl text="Filter by Status" />
              <select
                className={fi}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Works Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Work
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Project
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Assigned To
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Est. Days
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actual
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
                ) : works.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                      No work assignments found.
                    </td>
                  </tr>
                ) : (
                  works.map((w) => (
                    <tr key={w._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{w.workTitle}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[200px]">
                          {w.workDescription}
                        </div>
                        <span className="text-[8px] text-gray-400 uppercase">
                          {workTypeLabels[w.workType] || w.workType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-indigo-600">
                        {w.project?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {w.assignedLabours?.map((l) => (
                          <div
                            key={l._id}
                            className="text-xs text-gray-600 flex items-center gap-1"
                          >
                            <FaUser className="text-[8px] text-gray-300" />
                            {l.name}
                          </div>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {w.estimatedDays || 0} days
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-gray-600">
                        {w.actualDays || 0} days
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={w.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Progress button */}
                          {(w.status === "assigned" || w.status === "in-progress") && (
                            <button
                              onClick={() => openProgressModal(w)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Add Progress"
                            >
                              <FaPlay size={12} />
                            </button>
                          )}
                          {/* Status quick actions */}
                          {w.status === "assigned" && (
                            <button
                              onClick={() => updateStatus(w._id, "in-progress")}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Start Work"
                            >
                              <FaPlay size={12} />
                            </button>
                          )}
                          {w.status === "in-progress" && (
                            <button
                              onClick={() => updateStatus(w._id, "completed")}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Complete Work"
                            >
                              <FaCheckCircle size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => openModal(w)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(w._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <FaTrash size={12} />
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

      {/* ─── Modal: Assign Work ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaUsers size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editWork ? "Edit Work Assignment" : "Assign Work to Labour"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map((p) => ({ value: p._id, label: p.name }))}
                    value={selectedProject}
                    onChange={setSelectedProject}
                    placeholder="Select Project..."
                    className="text-sm"
                    required
                  />
                </div>
                <div>
                  <Lbl text="Assign Labours" req />
                  <Select
                    isMulti
                    options={labours.map((l) => ({
                      value: l._id,
                      label: `${l.name} (${l.skill})`,
                    }))}
                    value={selectedLabours}
                    onChange={setSelectedLabours}
                    placeholder="Select labours..."
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Lbl text="Work Title" req />
                <input
                  type="text"
                  className={fi}
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  placeholder="e.g., 10x10 Wall Construction"
                  required
                />
              </div>

              <div>
                <Lbl text="Work Description" req />
                <textarea
                  className={`${fi} h-20 resize-none`}
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Detailed description of the work..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="Work Type" />
                  <select
                    className={fi}
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                  >
                    {Object.entries(workTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Lbl text="Location" />
                  <input
                    type="text"
                    className={fi}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Building A, Floor 2"
                  />
                </div>
                <div>
                  <Lbl text="Estimated Days" req />
                  <input
                    type="number"
                    step="0.5"
                    className={fi}
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(e.target.value)}
                    placeholder="e.g., 2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Start Date" />
                  <input
                    type="date"
                    className={fi}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Lbl text="Remarks" />
                  <input
                    type="text"
                    className={fi}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  <FaSave size={12} /> {editWork ? "Update Work" : "Assign Work"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Add Progress ──────────────────────────────────────────────── */}
      {progressModalOpen && selectedWork && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-blue-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                <FaPlay size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">Add Progress</h2>
                <p className="text-xs text-gray-400">{selectedWork.workTitle}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Lbl text="Labour" req />
                <Select
                  options={
                    selectedWork.assignedLabours?.map((l) => ({
                      value: l._id,
                      label: l.name,
                    })) || []
                  }
                  value={progressLabour}
                  onChange={setProgressLabour}
                  placeholder="Select labour..."
                  className="text-sm"
                />
              </div>
              <div>
                <Lbl text="Progress Description" req />
                <input
                  type="text"
                  className={fi}
                  value={progressDescription}
                  onChange={(e) => setProgressDescription(e.target.value)}
                  placeholder="What was done today?"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Lbl text="Hours Worked" req />
                  <input
                    type="number"
                    step="0.5"
                    className={fi}
                    value={progressHours}
                    onChange={(e) => setProgressHours(e.target.value)}
                    placeholder="e.g., 4"
                  />
                </div>
                <div>
                  <Lbl text="Status" />
                  <select
                    className={fi}
                    value={progressStatus}
                    onChange={(e) => setProgressStatus(e.target.value)}
                  >
                    <option value="in-progress">In Progress</option>
                    <option value="completed-day">Completed Day</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProgress}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all"
                >
                  <FaCheckCircle size={12} /> Add Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}