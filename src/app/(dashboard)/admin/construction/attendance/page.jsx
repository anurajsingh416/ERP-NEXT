"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUser,
  FaProjectDiagram,
  FaSearch,
  FaPlus,
  FaSave,
  FaUsers,
  FaCheckDouble,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

export default function LabourAttendancePage() {
  // ─── State ────────────────────────────────────────────────────────────
  const [attendance, setAttendance] = useState([]);
  const [projects, setProjects] = useState([]);
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filteredProjects, setFilteredProjects] = useState([]);

  // Filters
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // View modes
  const [viewMode, setViewMode] = useState("daily");

  // Monthly view (with AM/PM slots)
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLabour, setMonthlyLabour] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Daily Sheet (bulk)
  const [sheetLabours, setSheetLabours] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAttendance, setEditAttendance] = useState(null);
  const [formLabour, setFormLabour] = useState(null);
  const [formProject, setFormProject] = useState(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSlot, setFormSlot] = useState("AM");
  const [formStatus, setFormStatus] = useState("present");
  const [formCheckIn, setFormCheckIn] = useState("");
  const [formCheckOut, setFormCheckOut] = useState("");
  const [formRemarks, setFormRemarks] = useState("");

  // ─── Fetch initial data ──────────────────────────────────────────────
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

        const [pRes, lRes] = await Promise.all([
          api.get("/construction/projects", headers),
          api.get("/construction/labour", headers),
        ]);

        const projectsData = pRes.data?.data || pRes.data || [];
        const laboursData = lRes.data?.data || lRes.data || [];

        setProjects(projectsData);
        setLabours(laboursData);
        setFilteredProjects(projectsData);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ─── Fetch projects for selected labour ──────────────────────────────
  const fetchProjectsForLabour = async (labourId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/construction/attendance/projects?labourId=${labourId}`, headers);
      const projectIds = res.data.data || [];
      const filtered = projects.filter(p => projectIds.includes(p._id));
      setFilteredProjects(filtered);
    } catch (err) {
      console.error("Error fetching projects for labour:", err);
      setFilteredProjects([]);
    }
  };

  useEffect(() => {
    if (selectedLabour) {
      fetchProjectsForLabour(selectedLabour.value);
    } else {
      setFilteredProjects(projects);
    }
  }, [selectedLabour, projects]);

  // ─── Fetch attendance when filters change ────────────────────────────
  useEffect(() => {
    if (viewMode === "sheet") {
      fetchSheetData();
    } else {
      fetchAttendance();
    }
  }, [
    selectedLabour,
    selectedProject,
    selectedDate,
    viewMode,
    selectedMonth,
    selectedYear,
  ]);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      if (viewMode === "daily") {
        const params = new URLSearchParams();
        if (selectedLabour) params.append("labourId", selectedLabour.value);
        if (selectedProject) params.append("projectId", selectedProject.value);
        if (selectedDate) params.append("date", selectedDate);

        const res = await api.get(`/construction/attendance?${params.toString()}`, headers);
        setAttendance(res.data.data || []);
      } else if (viewMode === "monthly") {
        if (!selectedLabour) {
          setMonthlyData(null);
          setMonthlyLabour(null);
          return;
        }
        const params = new URLSearchParams();
        params.append("labourId", selectedLabour.value);
        if (selectedProject) params.append("projectId", selectedProject.value);
        params.append("month", selectedMonth);
        params.append("year", selectedYear);

        const res = await api.get(`/construction/attendance/monthly?${params.toString()}`, headers);
        setMonthlyData(res.data.data?.attendances || []);
        setMonthlyLabour(res.data.data?.labour || null);
      }
    } catch (err) {
      console.error("Fetch attendance error:", err);
    }
  };

  // ─── Daily Sheet (bulk) ──────────────────────────────────────────────
  const fetchSheetData = async () => {
    setSheetLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      let laboursList = labours;
      const params = new URLSearchParams();
      if (selectedProject) params.append("projectId", selectedProject.value);
      if (selectedDate) params.append("date", selectedDate);
      const res = await api.get(`/construction/attendance?${params.toString()}`, headers);
      const attendanceRecords = res.data.data || [];

      const sheet = laboursList.map(labour => {
        const records = attendanceRecords.filter(a => a.labour._id === labour._id);
        const rec = records.length > 0 ? records[0] : null;
        return {
          labourId: labour._id,
          labourName: labour.name,
          attendanceId: rec?._id || null,
          status: rec?.status || "not-marked",
          checkIn: rec?.checkInTime || "",
          checkOut: rec?.checkOutTime || "",
          remarks: rec?.remarks || "",
          projectId: rec?.project?._id || null,
          projectName: rec?.project?.name || "",
          slot: rec?.slot || "AM",
        };
      });

      setSheetLabours(sheet);
    } catch (err) {
      console.error("Fetch sheet data error:", err);
      toast.error("Failed to load sheet data.");
    } finally {
      setSheetLoading(false);
    }
  };

  const updateSheetRow = (labourId, field, value) => {
    setSheetLabours(prev =>
      prev.map(row =>
        row.labourId === labourId ? { ...row, [field]: value } : row
      )
    );
  };

  const saveSheet = async () => {
    const rowsToSave = sheetLabours.filter(row => row.status !== "not-marked");
    if (rowsToSave.length === 0) {
      toast.info("No changes to save.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      let success = 0;
      for (const row of rowsToSave) {
        const payload = {
          labourId: row.labourId,
          projectId: selectedProject?.value || row.projectId,
          date: selectedDate,
          slot: row.slot || "AM",
          status: row.status,
          checkInTime: row.checkIn || "",
          checkOutTime: row.checkOut || "",
          remarks: row.remarks || "",
        };
        if (row.attendanceId) {
          await api.put(`/construction/attendance/${row.attendanceId}`, payload, headers);
        } else {
          await api.post("/construction/attendance", payload, headers);
        }
        success++;
      }
      toast.success(`Saved ${success} records.`);
      fetchSheetData();
    } catch (err) {
      console.error("Save sheet error:", err);
      toast.error("Failed to save some records.");
    }
  };

  const markAllPresent = () => {
    setSheetLabours(prev =>
      prev.map(row => ({
        ...row,
        status: "present",
        checkIn: "",
        checkOut: "",
        remarks: "",
      }))
    );
  };

  // ─── Modal handlers ──────────────────────────────────────────────────
  const openModal = (attendance = null) => {
    setEditAttendance(attendance);
    if (attendance) {
      setFormLabour({ value: attendance.labour._id, label: attendance.labour.name });
      setFormProject({ value: attendance.project._id, label: attendance.project.name });
      setFormDate(attendance.date.split("T")[0]);
      setFormSlot(attendance.slot || "AM");
      setFormStatus(attendance.status);
      setFormCheckIn(attendance.checkInTime || "");
      setFormCheckOut(attendance.checkOutTime || "");
      setFormRemarks(attendance.remarks || "");
    } else {
      setFormLabour(null);
      setFormProject(null);
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormSlot("AM");
      setFormStatus("present");
      setFormCheckIn("");
      setFormCheckOut("");
      setFormRemarks("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formLabour || !formProject) {
      toast.error("Please select labour and project.");
      return;
    }

    const payload = {
      labourId: formLabour.value,
      projectId: formProject.value,
      date: formDate,
      slot: formSlot,
      status: formStatus,
      checkInTime: formCheckIn,
      checkOutTime: formCheckOut,
      remarks: formRemarks,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editAttendance) {
        await api.put(`/construction/attendance/${editAttendance._id}`, payload, headers);
        toast.success("Attendance updated!");
      } else {
        await api.post("/construction/attendance", payload, headers);
        toast.success("Attendance marked!");
      }
      setIsModalOpen(false);
      if (viewMode === "sheet") fetchSheetData();
      else fetchAttendance();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save.");
    }
  };

  // ─── UI Helpers ──────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      present: "bg-emerald-100 text-emerald-700",
      absent: "bg-red-100 text-red-700",
      "half-day": "bg-amber-100 text-amber-700",
      holiday: "bg-blue-100 text-blue-700",
      "not-marked": "bg-gray-100 text-gray-400",
    };
    const labels = {
      present: "✅ Present",
      absent: "❌ Absent",
      "half-day": "⏳ Half Day",
      holiday: "🎉 Holiday",
      "not-marked": "— Not Marked",
    };
    return (
      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors["not-marked"]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getStatusAbbr = (status) => {
    const map = {
      present: "P",
      absent: "A",
      "half-day": "H",
      holiday: "Hol",
      "not-marked": "—",
    };
    return map[status] || "—";
  };

  const getStatusColor = (status) => {
    const map = {
      present: "bg-emerald-500 hover:bg-emerald-600 text-white",
      absent: "bg-red-500 hover:bg-red-600 text-white",
      "half-day": "bg-amber-500 hover:bg-amber-600 text-white",
      holiday: "bg-blue-500 hover:bg-blue-600 text-white",
      "not-marked": "bg-gray-100 hover:bg-gray-200 text-gray-400",
    };
    return map[status] || "bg-gray-100 text-gray-400";
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaCalendarAlt className="text-indigo-600" /> Labour Attendance
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">AM/PM slot‑based attendance</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Mark Individual
          </button>
        </div>

        {/* ─── Filters ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Lbl text="View Mode" />
              <select className={fi} value={viewMode} onChange={e => setViewMode(e.target.value)}>
                <option value="daily">Daily List</option>
                <option value="monthly">Monthly Register (AM/PM)</option>
                <option value="sheet">Daily Sheet (Bulk)</option>
              </select>
            </div>
            {viewMode === "daily" || viewMode === "sheet" ? (
              <div>
                <Lbl text="Date" req={viewMode === "sheet"} />
                <input
                  type="date"
                  className={fi}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  required={viewMode === "sheet"}
                />
              </div>
            ) : (
              <>
                <div>
                  <Lbl text="Month" />
                  <select className={fi} value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                    {months.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Lbl text="Year" />
                  <select className={fi} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                    {[2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <Lbl text="Project" />
              <Select
                options={projects.map(p => ({ value: p._id, label: p.name }))}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Filter by project..."
                isClearable
              />
            </div>
            {(viewMode === "daily" || viewMode === "monthly") && (
              <div>
                <Lbl text="Labour" />
                <Select
                  options={labours.map(l => ({ value: l._id, label: l.name }))}
                  value={selectedLabour}
                  onChange={setSelectedLabour}
                  placeholder="Select labour..."
                  isClearable
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── Daily List ─── */}
        {viewMode === "daily" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Labour</th>
                    <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                    <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                    <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Slot</th>
                    <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Check In</th>
                    <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Check Out</th>
                    <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                  ) : attendance.length === 0 ? (
                    <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">No records found.</td></tr>
                  ) : (
                    attendance.map(a => (
                      <tr key={a._id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800">{a.labour?.name || "N/A"}</td>
                        <td className="px-6 py-4 font-medium text-indigo-600">{a.project?.name || "N/A"}</td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString("en-GB")}</td>
                        <td className="px-6 py-4 text-center text-xs font-bold text-gray-500">{a.slot || "AM"}</td>
                        <td className="px-6 py-4 text-center"><StatusBadge status={a.status} /></td>
                        <td className="px-6 py-4 text-center text-xs text-gray-600">{a.checkInTime || "—"}</td>
                        <td className="px-6 py-4 text-center text-xs text-gray-600">{a.checkOutTime || "—"}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openModal(a)} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
                            <HiDotsVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Monthly Register with AM/PM slots ─── */}
        {viewMode === "monthly" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {!selectedLabour ? (
              <div className="text-center py-10 text-gray-400">
                <FaUser className="text-4xl mx-auto mb-2 opacity-20" />
                <p>Please select a labour to view monthly attendance.</p>
              </div>
            ) : monthlyData && monthlyData.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{monthlyLabour?.name}</h3>
                    <p className="text-sm text-gray-400">
                      {months[selectedMonth - 1]} {selectedYear}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Present (P)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Absent (A)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Half Day (H)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Holiday (Hol)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200"></span> Not Marked (—)</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200 min-w-[80px]">
                          Labour
                        </th>
                        {monthlyData.map((day, idx) => {
                          const dayNumber = day.day;
                          return (
                            <th
                              key={idx}
                              colSpan={2}
                              className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200"
                              style={{ minWidth: '60px' }}
                            >
                              {dayNumber}
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        <th className="px-3 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200">
                          AM / PM
                        </th>
                        {monthlyData.map((day, idx) => (
                          <React.Fragment key={idx}>
                            <th className="px-1 py-1 text-center text-[9px] font-bold text-gray-400 border-r border-gray-200">
                              AM
                            </th>
                            <th className="px-1 py-1 text-center text-[9px] font-bold text-gray-400 border-r border-gray-200">
                              PM
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-3 py-2 border-r border-gray-200 text-xs font-medium text-gray-700">
                          {monthlyLabour?.name}
                        </td>
                        {monthlyData.map((day, idx) => {
                          const dayRecords = monthlyData.filter(d => d.day === day.day);
                          const amRecord = dayRecords.find(d => d.slot === "AM");
                          const pmRecord = dayRecords.find(d => d.slot === "PM");
                          const amStatus = amRecord?.status || "not-marked";
                          const pmStatus = pmRecord?.status || "not-marked";
                          const amId = amRecord?.attendanceId || null;
                          const pmId = pmRecord?.attendanceId || null;
                          const amProjectId = amRecord?.projectId || null;
                          const pmProjectId = pmRecord?.projectId || null;

                          const renderCell = (status, attendanceId, projectId, slot) => {
                            const colorClass = getStatusColor(status);
                            const abbr = getStatusAbbr(status);
                            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
                            return (
                              <td
                                key={`${idx}-${slot}`}
                                onClick={() => {
                                  const labour = selectedLabour;
                                  if (attendanceId) {
                                    setEditAttendance({ _id: attendanceId, labour: { _id: labour.value, name: labour.label }, project: { _id: projectId, name: "Project" }, date: dateStr, slot: slot, status: status });
                                    setFormLabour(labour);
                                    setFormProject({ value: projectId, label: "Project" });
                                    setFormDate(dateStr);
                                    setFormSlot(slot);
                                    setFormStatus(status);
                                    setFormCheckIn("");
                                    setFormCheckOut("");
                                    setFormRemarks("");
                                  } else {
                                    setEditAttendance(null);
                                    setFormLabour(labour);
                                    setFormProject(selectedProject || null);
                                    setFormDate(dateStr);
                                    setFormSlot(slot);
                                    setFormStatus("present");
                                    setFormCheckIn("");
                                    setFormCheckOut("");
                                    setFormRemarks("");
                                  }
                                  setIsModalOpen(true);
                                }}
                                className={`px-1 py-1 text-center cursor-pointer border-r border-gray-200 ${attendanceId ? "hover:bg-indigo-100" : "hover:bg-gray-50"}`}
                              >
                                <span className={`inline-block w-7 h-7 rounded-full text-[10px] font-bold leading-7 transition-colors ${colorClass}`}>
                                  {abbr}
                                </span>
                              </td>
                            );
                          };

                          return (
                            <React.Fragment key={`day-${idx}`}>
                              {renderCell(amStatus, amId, amProjectId, "AM")}
                              {renderCell(pmStatus, pmId, pmProjectId, "PM")}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-emerald-600">
                      {monthlyData.filter(d => d.status === "present").length}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Present</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-red-600">
                      {monthlyData.filter(d => d.status === "absent").length}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Absent</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-amber-600">
                      {monthlyData.filter(d => d.status === "half-day").length}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Half Day</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-blue-600">
                      {monthlyData.filter(d => d.status === "holiday").length}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Holiday</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-gray-600">
                      {monthlyData.filter(d => d.status === "not-marked" || !d.status).length}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Not Marked</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p>No attendance records for this month.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Daily Sheet (Bulk) ─── */}
        {viewMode === "sheet" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Attendance Sheet – {new Date(selectedDate).toLocaleDateString("en-GB")}
                </h3>
                <p className="text-sm text-gray-400">
                  {sheetLabours.length} labours {selectedProject ? `for ${selectedProject.label}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={markAllPresent}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
                >
                  <FaCheckDouble size={12} /> Mark All Present
                </button>
                <button
                  type="button"
                  onClick={saveSheet}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors"
                >
                  <FaSave size={12} /> Save All
                </button>
              </div>
            </div>

            {sheetLoading ? (
              <div className="text-center py-10 text-gray-400">Loading sheet...</div>
            ) : sheetLabours.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FaUsers className="text-4xl mx-auto mb-2 opacity-20" />
                <p>No labours found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200">#</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200">Labour</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200">Slot</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200">Status</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200">In Time</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200">Out Time</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sheetLabours.map((row, index) => (
                      <tr key={row.labourId} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-4 py-3 text-center text-xs text-gray-400 font-bold border-r border-gray-200">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray-200">
                          {row.labourName}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <select
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
                            value={row.slot || "AM"}
                            onChange={e => updateSheetRow(row.labourId, "slot", e.target.value)}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <select
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
                            value={row.status}
                            onChange={e => updateSheetRow(row.labourId, "status", e.target.value)}
                          >
                            <option value="present">✅ Present</option>
                            <option value="absent">❌ Absent</option>
                            <option value="half-day">⏳ Half Day</option>
                            <option value="holiday">🎉 Holiday</option>
                            <option value="not-marked">— Not Marked</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="time"
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none w-24"
                            value={row.checkIn}
                            onChange={e => updateSheetRow(row.labourId, "checkIn", e.target.value)}
                            disabled={row.status === "not-marked" || row.status === "absent" || row.status === "holiday"}
                          />
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="time"
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none w-24"
                            value={row.checkOut}
                            onChange={e => updateSheetRow(row.labourId, "checkOut", e.target.value)}
                            disabled={row.status === "not-marked" || row.status === "absent" || row.status === "holiday"}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none w-full max-w-xs"
                            value={row.remarks}
                            onChange={e => updateSheetRow(row.labourId, "remarks", e.target.value)}
                            placeholder="Optional notes"
                            disabled={row.status === "not-marked"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaCalendarAlt size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editAttendance ? "Update Attendance" : "Mark Attendance"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <Lbl text="Labour" req />
                <Select
                  options={labours.map(l => ({ value: l._id, label: l.name }))}
                  value={formLabour}
                  onChange={setFormLabour}
                  placeholder="Select labour..."
                  className="text-sm"
                />
              </div>
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
                <Lbl text="Date" req />
                <input type="date" className={fi} value={formDate} onChange={e => setFormDate(e.target.value)} required />
              </div>
              <div>
                <Lbl text="Slot" req />
                <select className={fi} value={formSlot} onChange={e => setFormSlot(e.target.value)} required>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <div>
                <Lbl text="Status" req />
                <select className={fi} value={formStatus} onChange={e => setFormStatus(e.target.value)} required>
                  <option value="present">✅ Present</option>
                  <option value="absent">❌ Absent</option>
                  <option value="half-day">⏳ Half Day</option>
                  <option value="holiday">🎉 Holiday</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Lbl text="Check In Time" />
                  <input type="time" className={fi} value={formCheckIn} onChange={e => setFormCheckIn(e.target.value)} />
                </div>
                <div>
                  <Lbl text="Check Out Time" />
                  <input type="time" className={fi} value={formCheckOut} onChange={e => setFormCheckOut(e.target.value)} />
                </div>
              </div>
              <div>
                <Lbl text="Remarks" />
                <input type="text" className={fi} value={formRemarks} onChange={e => setFormRemarks(e.target.value)} placeholder="Any notes..." />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                  <FaCheckCircle size={12} /> {editAttendance ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}