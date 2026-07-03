"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { FaPlus, FaTrash, FaSave, FaCalendarAlt } from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";

// ─── Unique ID generator ────────────────────────────────────────────────────
let idCounter = 0;
const generateId = () => ++idCounter;

// ─── Default row factories ──────────────────────────────────────────────────
const defaultWorkRow = () => ({ _id: generateId(), activityName: "", floorLocation: "" });
const defaultPlanRow = () => ({ _id: generateId(), activityName: "", floorLocation: "" });
const defaultIssueRow = () => ({ _id: generateId(), description: "" });
const defaultManpowerRow = () => ({
  _id: generateId(),
  contractorId: null,
  contractorName: "",
  carpenter: 0,
  fitter: 0,
  mason: 0,
  machineOperator: 0,
  foreman: 0,
  helper: 0,
});
const defaultMaterialStockRow = () => ({
  _id: generateId(),
  materialId: null,
  materialName: "",
  unit: "",
  receivedYesterday: 0,
  receivedToday: 0,
  totalReceived: 0,
  consumedYesterday: 0,
  consumedToday: 0,
  totalConsumed: 0,
  stockBalance: 0,
});
const defaultMaterialConsumptionRow = () => ({
  _id: generateId(),
  activityName: "",
  quantity: 0,
  unit: "",
  cement: 0,
  steel: 0,
  bricks4: 0,
  bricks6: 0,
});

// ─── Memoized Dynamic Table ───────────────────────────────────────────────
const DynamicTable = React.memo(({
  title,
  fields,
  state,
  setState,
  addDefault,
  renderRow,
}) => {
  const addRow = useCallback(() => {
    setState(prev => [...prev, addDefault()]);
  }, [setState, addDefault]);

  const removeRow = useCallback((id) => {
    setState(prev => {
      if (prev.length === 1) return prev;
      return prev.filter(row => row._id !== id);
    });
  }, [setState]);

  return (
    <div className="border-t border-gray-200 pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">{title}</h3>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FaPlus size={10} /> Add Row
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
        <table className="w-full text-sm divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {fields.map((f, i) => (
                <th key={i} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {state.map((row) => (
              <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors">
                {renderRow(row)}
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row._id)}
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={state.length === 1}
                  >
                    <FaTrash size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
DynamicTable.displayName = "DynamicTable";

// ─── Main Component ────────────────────────────────────────────────────────
export default function DailyReportPage() {
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editReport, setEditReport] = useState(null);

  // ─── Form State ───
  const [selectedProject, setSelectedProject] = useState(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [workInProgress, setWorkInProgress] = useState([defaultWorkRow()]);
  const [tomorrowPlan, setTomorrowPlan] = useState([defaultPlanRow()]);
  const [issues, setIssues] = useState([defaultIssueRow()]);
  const [manpower, setManpower] = useState([defaultManpowerRow()]);
  const [materialStock, setMaterialStock] = useState([defaultMaterialStockRow()]);
  const [materialConsumption, setMaterialConsumption] = useState([defaultMaterialConsumptionRow()]);
  const [siteIncharge, setSiteIncharge] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");

  const router = useRouter();

  // ─── Fetch Data ───
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) { setLoading(false); return; }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [pRes, rRes, sRes, iRes] = await Promise.all([
          api.get("/construction/projects", headers), // ensure this endpoint populates owner & members
          api.get("/construction/daily-report", headers),
          api.get("/suppliers", headers),
          api.get("/items", headers),
        ]);

        setProjects(pRes.data?.data || pRes.data || []);
        setReports(rRes.data?.data || rRes.data || []);
        setSuppliers(sRes.data?.data || sRes.data || []);
        setItems(iRes.data?.data || iRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ─── Auto‑set Site In‑charge based on selected project ──────────────────
  useEffect(() => {
    // Only auto-fill if we are creating a new report (not editing)
    if (editReport) return;
    if (!selectedProject) {
      setSiteIncharge("");
      return;
    }
    const project = projects.find(p => p._id === selectedProject.value);
    if (!project) return;

    let incharge = "";
    if (project.owner && project.owner.name) {
      incharge = project.owner.name;
    } else if (project.members && project.members.length > 0) {
      incharge = project.members[0].name;
    }
    setSiteIncharge(incharge);
  }, [selectedProject, projects, editReport]);

  // ─── Modal Open / Close ───
  const openModal = (report = null) => {
    setEditReport(report);
    if (report) {
      setSelectedProject({ value: report.project._id, label: report.project.name });
      setReportDate(report.reportDate.split("T")[0]);
      setWorkInProgress(
        report.workInProgress.length
          ? report.workInProgress.map(row => ({ ...row, _id: generateId() }))
          : [defaultWorkRow()]
      );
      setTomorrowPlan(
        report.tomorrowPlan.length
          ? report.tomorrowPlan.map(row => ({ ...row, _id: generateId() }))
          : [defaultPlanRow()]
      );
      setIssues(
        report.issues.length
          ? report.issues.map(row => ({ ...row, _id: generateId() }))
          : [defaultIssueRow()]
      );
      setManpower(
        report.manpower.length
          ? report.manpower.map(row => ({ ...row, _id: generateId() }))
          : [defaultManpowerRow()]
      );
      setMaterialStock(
        report.materialStock.length
          ? report.materialStock.map(row => ({ ...row, _id: generateId() }))
          : [defaultMaterialStockRow()]
      );
      setMaterialConsumption(
        report.materialConsumption.length
          ? report.materialConsumption.map(row => ({ ...row, _id: generateId() }))
          : [defaultMaterialConsumptionRow()]
      );
      setSiteIncharge(report.siteIncharge || "");
      setReviewedBy(report.reviewedBy || "");
    } else {
      setSelectedProject(null);
      setReportDate(new Date().toISOString().split("T")[0]);
      setWorkInProgress([defaultWorkRow()]);
      setTomorrowPlan([defaultPlanRow()]);
      setIssues([defaultIssueRow()]);
      setManpower([defaultManpowerRow()]);
      setMaterialStock([defaultMaterialStockRow()]);
      setMaterialConsumption([defaultMaterialConsumptionRow()]);
      setSiteIncharge("");
      setReviewedBy("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditReport(null);
  };

  // ─── Field Change Handlers ───────────────────────────────────────────────
  const handleFieldChange = (setter, id, field, value) => {
    setter(prev =>
      prev.map(row =>
        row._id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleContractorSelect = (id, selectedOption) => {
    setManpower(prev =>
      prev.map(row =>
        row._id === id
          ? {
            ...row,
            contractorId: selectedOption ? selectedOption.value : null,
            contractorName: selectedOption ? selectedOption.label : "",
          }
          : row
      )
    );
  };

  const handleMaterialStockSelect = (id, selectedOption) => {
    setMaterialStock(prev =>
      prev.map(row => {
        if (row._id !== id) return row;
        if (selectedOption) {
          const item = items.find(i => i._id === selectedOption.value);
          return {
            ...row,
            materialId: selectedOption.value,
            materialName: selectedOption.label,
            unit: item?.uom || item?.unit || "",
          };
        } else {
          return {
            ...row,
            materialId: null,
            materialName: "",
            unit: "",
          };
        }
      })
    );
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      alert("Please select a project.");
      return;
    }

    const filterEmpty = (arr, keys) =>
      arr.filter(row => keys.some(k => row[k] && row[k].toString().trim() !== ""));

    const cleanWork = filterEmpty(workInProgress, ["activityName"]);
    const cleanPlan = filterEmpty(tomorrowPlan, ["activityName"]);
    const cleanIssues = filterEmpty(issues, ["description"]);
    const cleanManpower = manpower.filter(row => row.contractorName && row.contractorName.trim() !== "");
    const cleanStock = materialStock.filter(row => row.materialName && row.materialName.trim() !== "");
    const cleanConsumption = filterEmpty(materialConsumption, ["activityName"]);

    const payload = {
      project: selectedProject.value,
      reportDate,
      workInProgress: cleanWork.map(({ _id, ...rest }) => rest),
      tomorrowPlan: cleanPlan.map(({ _id, ...rest }) => rest),
      issues: cleanIssues.map(({ _id, ...rest }) => rest),
      manpower: cleanManpower.map(({ _id, contractorId, ...rest }) => rest),
      materialStock: cleanStock.map(({ _id, materialId, ...rest }) => rest),
      materialConsumption: cleanConsumption.map(({ _id, ...rest }) => rest),
      siteIncharge,
      reviewedBy,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editReport) {
        const res = await api.put(`/construction/daily-report/${editReport._id}`, payload, headers);
        setReports(reports.map(r => r._id === editReport._id ? res.data.data || res.data : r));
      } else {
        const res = await api.post("/construction/daily-report", payload, headers);
        setReports([res.data.data || res.data, ...reports]);
      }
      closeModal();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save. Check console.");
    }
  };

  // ─── UI Helpers ──────────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaCalendarAlt className="text-indigo-600" /> Daily Site Reports
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Track daily progress, manpower, materials and issues</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> New Report
          </button>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Activities</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Issues</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Manpower</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">No reports yet.</td></tr>
                ) : (
                  reports.map(r => (
                    <tr key={r._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">{new Date(r.reportDate).toLocaleDateString("en-GB")}</td>
                      <td className="px-6 py-4 font-medium text-indigo-600">{r.project?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{r.workInProgress?.length || 0}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{r.issues?.length || 0}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{r.manpower?.reduce((sum, m) => sum + (m.carpenter + m.fitter + m.mason + m.machineOperator + m.foreman + m.helper), 0) || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openModal(r)} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
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
      </div>

      {/* ─── Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm"><FaCalendarAlt size={20} /></div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{editReport ? "Edit Daily Report" : "New Daily Report"}</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map(p => ({ value: p._id, label: p.name }))}
                    value={selectedProject}
                    onChange={setSelectedProject}
                    placeholder="Select Project..."
                    className="text-sm"
                    required
                  />
                </div>
                <div>
                  <Lbl text="Report Date" req />
                  <input type="date" className={fi} value={reportDate} onChange={e => setReportDate(e.target.value)} required />
                </div>
                <div>
                  <Lbl text="Site In-charge" />
                  <input
                    type="text"
                    className={fi}
                    value={siteIncharge}
                    onChange={e => setSiteIncharge(e.target.value)}
                    placeholder="Auto-filled from project"
                    readOnly={!editReport} // make it read‑only when creating (optional)
                  />
                </div>
              </div>

              {/* ─── Work in Progress ─── */}
              <DynamicTable
                title="Work in Progress"
                fields={[{ key: "activity", label: "Activity" }, { key: "floor", label: "Floor / Location" }]}
                state={workInProgress}
                setState={setWorkInProgress}
                addDefault={defaultWorkRow}
                renderRow={(row) => (
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className={fi}
                        value={row.activityName}
                        onChange={e => handleFieldChange(setWorkInProgress, row._id, "activityName", e.target.value)}
                        placeholder="Activity"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className={fi}
                        value={row.floorLocation}
                        onChange={e => handleFieldChange(setWorkInProgress, row._id, "floorLocation", e.target.value)}
                        placeholder="Floor / Location"
                      />
                    </td>
                  </>
                )}
              />

              {/* ─── Tomorrow's Plan ─── */}
              <DynamicTable
                title="Tomorrow's Plan"
                fields={[{ key: "activity", label: "Activity" }, { key: "floor", label: "Floor / Location" }]}
                state={tomorrowPlan}
                setState={setTomorrowPlan}
                addDefault={defaultPlanRow}
                renderRow={(row) => (
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className={fi}
                        value={row.activityName}
                        onChange={e => handleFieldChange(setTomorrowPlan, row._id, "activityName", e.target.value)}
                        placeholder="Activity"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className={fi}
                        value={row.floorLocation}
                        onChange={e => handleFieldChange(setTomorrowPlan, row._id, "floorLocation", e.target.value)}
                        placeholder="Floor / Location"
                      />
                    </td>
                  </>
                )}
              />

              {/* ─── Issues ─── */}
              <DynamicTable
                title="Issues / Delays"
                fields={[{ key: "desc", label: "Description" }]}
                state={issues}
                setState={setIssues}
                addDefault={defaultIssueRow}
                renderRow={(row) => (
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className={fi}
                      value={row.description}
                      onChange={e => handleFieldChange(setIssues, row._id, "description", e.target.value)}
                      placeholder="Issue description"
                    />
                  </td>
                )}
              />

              {/* ─── Manpower ─── */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Manpower</h3>
                  <button
                    type="button"
                    onClick={() => setManpower(prev => [...prev, defaultManpowerRow()])}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <FaPlus size={10} /> Add Contractor
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-sm divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[150px]">Contractor</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Carpenter</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Fitter</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Mason</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">M/c Op.</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Foreman</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Helper</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {manpower.map((row) => {
                        const currentSupplier = suppliers.find(s => s._id === row.contractorId);
                        const selectedOption = currentSupplier
                          ? { value: currentSupplier._id, label: currentSupplier.supplierName || currentSupplier.name || currentSupplier.contactPersonName || currentSupplier.contactPerson }
                          : null;
                        return (
                          <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-2">
                              <Select
                                className="text-xs"
                                options={suppliers.map(s => ({
                                  value: s._id,
                                  label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id
                                }))}
                                value={selectedOption}
                                onChange={(opt) => handleContractorSelect(row._id, opt)}
                                placeholder="Select contractor..."
                                isClearable
                              />
                              {!row.contractorName && (
                                <p className="text-[8px] text-amber-500 mt-0.5">Select a contractor</p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.carpenter}
                                onChange={e => handleFieldChange(setManpower, row._id, "carpenter", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.fitter}
                                onChange={e => handleFieldChange(setManpower, row._id, "fitter", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.mason}
                                onChange={e => handleFieldChange(setManpower, row._id, "mason", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.machineOperator}
                                onChange={e => handleFieldChange(setManpower, row._id, "machineOperator", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.foreman}
                                onChange={e => handleFieldChange(setManpower, row._id, "foreman", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.helper}
                                onChange={e => handleFieldChange(setManpower, row._id, "helper", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setManpower(prev => prev.filter(r => r._id !== row._id))}
                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                disabled={manpower.length === 1}
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
              </div>

              {/* ─── Material Stock ─── */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Material Stock</h3>
                  <button
                    type="button"
                    onClick={() => setMaterialStock(prev => [...prev, defaultMaterialStockRow()])}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <FaPlus size={10} /> Add Material
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-xs divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[120px]">Material</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Recd Y'day</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Recd Today</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Rec</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Cons Y'day</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Cons Today</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Cons</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Stock Bal</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {materialStock.map((row) => {
                        const currentItem = items.find(i => i._id === row.materialId);
                        const selectedOption = currentItem
                          ? { value: currentItem._id, label: currentItem.itemName || currentItem.name }
                          : null;
                        return (
                          <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-2 py-2">
                              <Select
                                className="text-xs"
                                options={items.map(i => ({ value: i._id, label: i.itemName || i.name || i._id }))}
                                value={selectedOption}
                                onChange={(opt) => handleMaterialStockSelect(row._id, opt)}
                                placeholder="Select material..."
                                isClearable
                              />
                              {!row.materialName && (
                                <p className="text-[8px] text-amber-500 mt-0.5">Select a material</p>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                className={`${fi} text-xs text-center`}
                                value={row.unit}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "unit", e.target.value)}
                                placeholder="Unit"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.receivedYesterday}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "receivedYesterday", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.receivedToday}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "receivedToday", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.totalReceived}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "totalReceived", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.consumedYesterday}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "consumedYesterday", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.consumedToday}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "consumedToday", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.totalConsumed}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "totalConsumed", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                className={`${fi} text-xs text-center`}
                                value={row.stockBalance}
                                onChange={e => handleFieldChange(setMaterialStock, row._id, "stockBalance", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setMaterialStock(prev => prev.filter(r => r._id !== row._id))}
                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                disabled={materialStock.length === 1}
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
              </div>

              {/* ─── Material Consumption ─── */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Material Consumption per Activity</h3>
                  <button
                    type="button"
                    onClick={() => setMaterialConsumption(prev => [...prev, defaultMaterialConsumptionRow()])}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <FaPlus size={10} /> Add Activity
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-xs divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[100px]">Activity</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Cement</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Steel</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Bricks 4"</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Bricks 6"</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {materialConsumption.map((row) => (
                        <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              className={fi}
                              value={row.activityName}
                              onChange={e => handleFieldChange(setMaterialConsumption, row._id, "activityName", e.target.value)}
                              placeholder="Activity"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="any"
                              className={`${fi} text-xs text-center`}
                              value={row.quantity}
                              onChange={e => handleFieldChange(setMaterialConsumption, row._id, "quantity", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              className={`${fi} text-xs text-center`}
                              value={row.unit}
                              onChange={e => handleFieldChange(setMaterialConsumption, row._id, "unit", e.target.value)}
                              placeholder="Unit"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="any"
                              className={`${fi} text-xs text-center`}
                              value={row.cement}
                              onChange={e => handleFieldChange(setMaterialConsumption, row._id, "cement", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="any"
                              className={`${fi} text-xs text-center`}
                              value={row.steel}
                              onChange={e => handleFieldChange(setMaterialConsumption, row._id, "steel", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="any"
                              className={`${fi} text-xs text-center`}
                              value={row.bricks4}
                              onChange={e => handleFieldChange(setMaterialConsumption, row._id, "bricks4", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="any"
                              className={`${fi} text-xs text-center`}
                              value={row.bricks6}
                              onChange={e => handleFieldChange(setMaterialConsumption, row._id, "bricks6", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setMaterialConsumption(prev => prev.filter(r => r._id !== row._id))}
                              className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                              disabled={materialConsumption.length === 1}
                            >
                              <FaTrash size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Lbl text="Reviewed By" />
                  <input type="text" className={fi} value={reviewedBy} onChange={e => setReviewedBy(e.target.value)} placeholder="Reviewer name" />
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-6 py-4">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                  <FaSave size={12} /> {editReport ? "Update Report" : "Save Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
