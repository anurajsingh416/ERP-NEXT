"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaPlus,
  FaTrash,
  FaSave,
  FaSearch,
  FaBoxes,
  FaCalendarAlt,
  FaFileContract,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

let idCounter = 0;
const generateId = () => ++idCounter;

const defaultRow = () => ({
  _id: generateId(),
  itemId: null,
  boqItemId: null,
  materialName: "",
  unit: "",
  quantity: 1,
  rate: 0,
  amount: 0,
  location: "",
  remarks: "",
});

export default function MaterialConsumptionPage() {
  const router = useRouter();
  const [consumptions, setConsumptions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editConsumption, setEditConsumption] = useState(null);

  // Filters
  const [filterProject, setFilterProject] = useState(null);
  const [filterWorkOrder, setFilterWorkOrder] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  // Form state
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [consumptionDate, setConsumptionDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState([defaultRow()]);
  const [remarks, setRemarks] = useState("");
  const [itemsMaster, setItemsMaster] = useState([]);

  // ─── Fetch data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [cRes, pRes, woRes] = await Promise.all([
          api.get("/construction/material-consumption", headers),
          api.get("/construction/projects", headers),
          api.get("/construction/work-orders", headers),
        ]);

        setConsumptions(cRes.data?.data || cRes.data || []);
        setProjects(pRes.data?.data || pRes.data || []);
        setWorkOrders(woRes.data?.data || woRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ─── Fetch items master ──────────────────────────────────────────────
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/items", headers);
        setItemsMaster(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to fetch items:", err);
      }
    };
    fetchItems();
  }, []);

  // ─── Open/Close Modal ──────────────────────────────────────────────
  const openModal = (record = null) => {
    setEditConsumption(record);
    if (record) {
      setSelectedProject({ value: record.project._id, label: record.project.name });
      setSelectedWorkOrder(
        record.workOrderId ? { value: record.workOrderId._id, label: record.workOrderId.workOrderNumber } : null
      );
      setConsumptionDate(record.consumptionDate.split("T")[0]);
      setRows(record.items.map(item => ({ ...item, _id: generateId() })) || [defaultRow()]);
      setRemarks(record.remarks || "");
    } else {
      setSelectedProject(null);
      setSelectedWorkOrder(null);
      setConsumptionDate(new Date().toISOString().split("T")[0]);
      setRows([defaultRow()]);
      setRemarks("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditConsumption(null);
  };

  // ─── Row handlers ──────────────────────────────────────────────────
  const addRow = () => setRows(prev => [...prev, defaultRow()]);
  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter(r => r._id !== id));
  };
  const handleRowChange = (id, field, value) => {
    setRows(prev =>
      prev.map(row => {
        if (row._id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "quantity" || field === "rate") {
          const qty = parseFloat(updated.quantity) || 0;
          const rate = parseFloat(updated.rate) || 0;
          updated.amount = qty * rate;
        }
        return updated;
      })
    );
  };

  // ─── Handle material selection ────────────────────────────────────
  const handleMaterialSelect = (id, selectedOption) => {
    setRows(prev =>
      prev.map(row => {
        if (row._id !== id) return row;
        if (selectedOption) {
          return {
            ...row,
            itemId: selectedOption.value,
            materialName: selectedOption.label,
            unit: selectedOption.unit || "",
          };
        } else {
          return {
            ...row,
            itemId: null,
            materialName: "",
            unit: "",
          };
        }
      })
    );
  };

  // ─── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      toast.error("Please select a project.");
      return;
    }
    const validRows = rows.filter(r => r.materialName && r.materialName.trim() !== "");
    if (validRows.length === 0) {
      toast.error("Please add at least one material with name.");
      return;
    }

    const payload = {
      project: selectedProject.value,
      workOrderId: selectedWorkOrder?.value || null,
      consumptionDate,
      items: validRows.map(({ _id, itemId, boqItemId, materialName, unit, quantity, rate, amount, location, remarks }) => ({
        itemId: itemId || null,
        boqItemId: boqItemId || null,
        materialName,
        unit,
        quantity: parseFloat(quantity) || 0,
        rate: parseFloat(rate) || 0,
        amount: parseFloat(amount) || 0,
        location: location || "",
        remarks: remarks || "",
      })),
      remarks,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editConsumption) {
        const res = await api.put(`/construction/material-consumption/${editConsumption._id}`, payload, headers);
        setConsumptions(prev => prev.map(c => c._id === editConsumption._id ? res.data.data || res.data : c));
        toast.success("Consumption updated!");
      } else {
        const res = await api.post("/construction/material-consumption", payload, headers);
        setConsumptions(prev => [res.data.data || res.data, ...prev]);
        toast.success("Consumption recorded!");
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save.");
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  // ─── Build dropdown options ──────────────────────────────────────
  const itemOptions = itemsMaster.map(item => ({
    value: item._id,
    label: item.itemName || item.name || "Unnamed",
    unit: item.uom || item.unit || "",
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaBoxes className="text-indigo-600" /> Material Consumption
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Record daily material usage against BOQ items & work orders</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            <FaPlus size={12} /> New Entry
          </button>
        </div>

        {/* ─── Filters ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Lbl text="Project" />
              <Select
                options={projects.map(p => ({ value: p._id, label: p.name }))}
                value={filterProject}
                onChange={setFilterProject}
                placeholder="All projects"
                isClearable
              />
            </div>
            <div>
              <Lbl text="Work Order" />
              <Select
                options={workOrders.map(wo => ({ value: wo._id, label: wo.workOrderNumber }))}
                value={filterWorkOrder}
                onChange={setFilterWorkOrder}
                placeholder="All work orders"
                isClearable
              />
            </div>
            <div>
              <Lbl text="Date" />
              <input type="date" className={fi} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={() => {
                  setFilterProject(null);
                  setFilterWorkOrder(null);
                  setFilterDate(new Date().toISOString().split("T")[0]);
                }}
                className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* ─── List Table ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Work Order</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Materials</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : consumptions.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No consumption records.</td></tr>
                ) : (
                  consumptions.map(c => (
                    <tr key={c._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {new Date(c.consumptionDate).toLocaleDateString("en-GB")}
                      </td>
                      {/* ─── Project Link ─── */}
                      <td
                        className="px-6 py-4 font-medium text-indigo-600 hover:underline cursor-pointer"
                        onClick={() => c.project?._id && router.push(`/construction/projects/${c.project._id}`)}
                      >
                        {c.project?.name || "N/A"}
                      </td>
                      {/* ─── Work Order Link ─── */}
                      <td
                        className="px-6 py-4 text-indigo-600 hover:underline cursor-pointer"
                        onClick={() => c.workOrderId?._id && router.push(`/construction/work-orders/${c.workOrderId._id}`)}
                      >
                        {c.workOrderId?.workOrderNumber || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.items.map(i => i.materialName).join(", ")}</td>
                      <td className="px-6 py-4 text-center">{c.items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(c.items.reduce((sum, i) => sum + (i.amount || 0), 0))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openModal(c)} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
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

      {/* ─── Modal ────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm"><FaBoxes size={20} /></div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{editConsumption ? "Edit Consumption" : "Record Consumption"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map(p => ({ value: p._id, label: p.name }))}
                    value={selectedProject}
                    onChange={setSelectedProject}
                    placeholder="Select project..."
                    className="text-sm"
                  />
                </div>
                <div>
                  <Lbl text="Work Order (optional)" />
                  <Select
                    options={workOrders.map(wo => ({ value: wo._id, label: wo.workOrderNumber }))}
                    value={selectedWorkOrder}
                    onChange={setSelectedWorkOrder}
                    placeholder="Select work order..."
                    className="text-sm"
                    isClearable
                  />
                </div>
                <div>
                  <Lbl text="Consumption Date" req />
                  <input type="date" className={fi} value={consumptionDate} onChange={e => setConsumptionDate(e.target.value)} required />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Materials Consumed</p>
                  <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                    <FaPlus size={10} /> Add Row
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-sm divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[200px]">Material Name</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate (₹)</th>
                        <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount (₹)</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Location</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {rows.map((row) => {
                        const selectedOption = row.itemId
                          ? itemOptions.find(opt => opt.value === row.itemId) || null
                          : null;

                        return (
                          <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-2">
                              <Select
                                className="text-xs"
                                options={itemOptions}
                                value={selectedOption}
                                onChange={(selected) => handleMaterialSelect(row._id, selected)}
                                placeholder="Select material..."
                                isClearable
                                isSearchable
                                noOptionsMessage={() => itemOptions.length === 0 ? "No items found" : "No matches"}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={row.unit || ""}
                                onChange={e => handleRowChange(row._id, "unit", e.target.value)}
                                placeholder="nos"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={row.quantity || 0}
                                onChange={e => handleRowChange(row._id, "quantity", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={row.rate || 0}
                                onChange={e => handleRowChange(row._id, "rate", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-700">
                              {formatCurrency(row.amount || 0)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
                                value={row.location || ""}
                                onChange={e => handleRowChange(row._id, "location", e.target.value)}
                                placeholder="Site location"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(row._id)}
                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                disabled={rows.length === 1}
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

              <div>
                <Lbl text="Remarks" />
                <textarea className={`${fi} h-16 resize-none`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes..." />
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                  <FaSave size={12} /> {editConsumption ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}