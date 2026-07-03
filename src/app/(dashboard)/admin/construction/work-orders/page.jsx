"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaPlus,
  FaTrash,
  FaCheck,
  FaSync,
  FaFileContract,
  FaCalendarAlt,
  FaBoxes,
  FaArrowRight,
  FaEllipsisV,
  FaEdit,
  FaFileInvoice,
  FaTrashAlt,
  FaExchangeAlt,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

let idCounter = 0;
const generateId = () => ++idCounter;

const defaultItem = () => ({
  _id: generateId(),
  boqItemId: null,
  description: "",
  unit: "nos",
  quantity: 1,
  rate: 0,
  amount: 0,
  section: "",
  subSection: "",
  subSectionIndex: 1,
  transferFromStock: false,
});

const defaultMaterial = () => ({
  _id: generateId(),
  itemId: null,
  itemName: "",
  description: "",
  unit: "nos",
  quantity: 1,
  rate: 0,
  amount: 0,
  section: "",
  subSection: "",
  subSectionIndex: 1,
  transferFromStock: false,
  type: "material",
});

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [boqs, setBoqs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editWorkOrder, setEditWorkOrder] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [selectedOrders, setSelectedOrders] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBoq, setSelectedBoq] = useState(null);
  const [workOrderType, setWorkOrderType] = useState("contractor");
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [woNumber, setWoNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedStart, setExpectedStart] = useState("");
  const [expectedEnd, setExpectedEnd] = useState("");
  const [items, setItems] = useState([defaultItem()]);
  const [materials, setMaterials] = useState([]); // ✅ new: materials array
  const [remarks, setRemarks] = useState("");
  const [generating, setGenerating] = useState(false);

  const [boqSections, setBoqSections] = useState([]);
  const [boqSubSections, setBoqSubSections] = useState([]);
  const [boqSectionMap, setBoqSectionMap] = useState({});

  // ─── Fetch data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [woRes, pRes, boqRes, sRes] = await Promise.all([
          api.get("/construction/work-orders", headers),
          api.get("/construction/projects", headers),
          api.get("/construction/boq", headers),
          api.get("/suppliers", headers),
        ]);
        setWorkOrders(woRes.data?.data || woRes.data || []);
        setProjects(pRes.data?.data || pRes.data || []);
        setBoqs(boqRes.data?.data || boqRes.data || []);
        setSuppliers(sRes.data?.data || sRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ─── Fetch BOQ details ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBoq) {
      setBoqSections([]);
      setBoqSubSections([]);
      setBoqSectionMap({});
      return;
    }
    const fetchBoqDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
        const boqData = res.data.data || res.data;
        const boqItems = boqData.items || [];
        const sections = [...new Set(boqItems.map(i => i.section).filter(Boolean))];
        const map = {};
        sections.forEach(sec => {
          map[sec] = [...new Set(boqItems.filter(i => i.section === sec).map(i => i.subSection).filter(Boolean))];
        });
        setBoqSections(sections.map(s => ({ value: s, label: s })));
        setBoqSectionMap(map);
        const allSubSections = [...new Set(boqItems.map(i => i.subSection).filter(Boolean))];
        setBoqSubSections(allSubSections.map(s => ({ value: s, label: s })));
      } catch (err) {
        console.error("Failed to fetch BOQ details:", err);
      }
    };
    fetchBoqDetails();
  }, [selectedBoq]);

  // ─── Navigate to stock transfer ──────────────────────────────────
  const handleTransferSelected = () => {
    if (selectedOrders.length === 0) {
      toast.warning("Please select at least one work order.");
      return;
    }
    router.push(`/admin/construction/stock-transfer?ids=${selectedOrders.join(",")}`);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(workOrders.map(wo => wo._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (id) => {
    setSelectedOrders(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  // ─── Generate from BOQ ──────────────────────────────────────────────
  const handleGenerateFromBoq = async () => {
    if (!selectedBoq) {
      toast.error("Please select a BOQ.");
      return;
    }
    setGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
      const boqData = res.data.data || res.data;
      const boqItems = boqData.items || [];
      const boqMaterials = boqData.materials || [];

      // Generate items from BOQ items
      const generatedItems = boqItems.map(item => ({
        _id: generateId(),
        boqItemId: item._id,
        description: item.itemName || "",
        unit: item.unit || "nos",
        quantity: item.quantity || 0,
        rate: item.rate || 0,
        amount: item.amount || 0,
        section: item.section || "Other Work",
        subSection: item.subSection || "Main",
        subSectionIndex: item.subSectionIndex || 1,
        transferFromStock: false,
      }));

      // Generate materials from BOQ materials
      const generatedMaterials = boqMaterials.map(mat => ({
        _id: generateId(),
        itemId: mat.itemId || null,
        itemName: mat.itemName || "",
        description: mat.description || "",
        unit: mat.unit || "nos",
        quantity: mat.quantity || 0,
        rate: mat.rate || 0,
        amount: mat.amount || 0,
        section: mat.section || "Other Work",
        subSection: mat.subSection || "Main",
        subSectionIndex: mat.subSectionIndex || 1,
        transferFromStock: false,
        type: "material",
      }));

      setItems(generatedItems);
      setMaterials(generatedMaterials);
      toast.success(`Added ${generatedItems.length} items and ${generatedMaterials.length} materials from BOQ.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch BOQ items.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Item/Material Row Management ──────────────────────────────────
  const addItemRow = () => setItems(prev => [...prev, defaultItem()]);
  const removeItemRow = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(item => item._id !== id));
  };
  const addMaterialRow = () => setMaterials(prev => [...prev, defaultMaterial()]);
  const removeMaterialRow = (id) => {
    if (materials.length === 0) return;
    setMaterials(prev => prev.filter(mat => mat._id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev =>
      prev.map(item => {
        if (item._id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          const qty = parseFloat(updated.quantity) || 0;
          const rate = parseFloat(updated.rate) || 0;
          updated.amount = qty * rate;
        }
        if (field === "section") {
          updated.subSection = "";
        }
        return updated;
      })
    );
  };

  const handleMaterialChange = (id, field, value) => {
    setMaterials(prev =>
      prev.map(mat => {
        if (mat._id !== id) return mat;
        const updated = { ...mat, [field]: value };
        if (field === "quantity" || field === "rate") {
          const qty = parseFloat(updated.quantity) || 0;
          const rate = parseFloat(updated.rate) || 0;
          updated.amount = qty * rate;
        }
        if (field === "section") {
          updated.subSection = "";
        }
        return updated;
      })
    );
  };

  // ─── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      toast.error("Please select a project.");
      return;
    }
    if (!selectedBoq) {
      toast.error("Please select a BOQ.");
      return;
    }
    if (workOrderType === "contractor" && !selectedContractor) {
      toast.error("Please select a contractor.");
      return;
    }
    if (workOrderType === "customer" && !selectedProject.customer) {
      toast.error("Selected project has no customer linked.");
      return;
    }
    let validItems = items.filter(item => item.description && item.description.trim() !== "");
    let validMaterials = materials.filter(mat => mat.itemName && mat.itemName.trim() !== "");

    if (workOrderType === "customer") {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
        const boqData = res.data.data || res.data;
        validItems = (boqData.items || []).map(item => ({
          _id: generateId(),
          boqItemId: item._id,
          itemName: item.itemName || item.description || "",
          description: item.description || item.itemName || "",
          unit: item.unit || "nos",
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          section: item.section || "Other Work",
          subSection: item.subSection || "Main",
          subSectionIndex: item.subSectionIndex || 1,
          transferFromStock: false,
        }));
        validMaterials = (boqData.materials || []).map(mat => ({
          _id: generateId(),
          itemId: mat.itemId || null,
          itemName: mat.itemName || "",
          description: mat.description || "",
          unit: mat.unit || "nos",
          quantity: mat.quantity || 0,
          rate: mat.rate || 0,
          amount: mat.amount || 0,
          section: mat.section || "Other Work",
          subSection: mat.subSection || "Main",
          subSectionIndex: mat.subSectionIndex || 1,
          transferFromStock: false,
          type: "material",
        }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load full BOQ.");
        return;
      }
    }
    if (validItems.length === 0 && validMaterials.length === 0) {
      toast.error("Please add at least one item or material with description.");
      return;
    }

    const payload = {
      orderType: workOrderType,
      project: selectedProject.value,
      boq: selectedBoq?.value || null,
      contractor: workOrderType === "contractor" ? selectedContractor.value : null,
      workOrderNumber: woNumber || `WO-${Date.now().toString().slice(-6)}`,
      status,
      issuedDate,
      expectedStart: expectedStart || undefined,
      expectedEnd: expectedEnd || undefined,
      items: validItems.map(({ boqItemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex, transferFromStock }) => ({
        boqItemId,
        itemName: itemName || description,
        description: description || itemName,
        unit,
        quantity: parseFloat(quantity) || 0,
        rate: parseFloat(rate) || 0,
        amount: parseFloat(amount) || 0,
        section: section || "Other Work",
        subSection: subSection || "Main",
        subSectionIndex: subSectionIndex || 1,
        transferFromStock: !!transferFromStock,
      })),
      materials: validMaterials.map(({ itemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex, transferFromStock, type }) => ({
        itemId: itemId || null,
        itemName,
        description: description || itemName,
        unit,
        quantity: parseFloat(quantity) || 0,
        rate: parseFloat(rate) || 0,
        amount: parseFloat(amount) || 0,
        section: section || "Other Work",
        subSection: subSection || "Main",
        subSectionIndex: subSectionIndex || 1,
        transferFromStock: !!transferFromStock,
        type: "material",
      })),
      remarks,
    };
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editWorkOrder) {
        const res = await api.put(`/construction/work-orders/${editWorkOrder._id}`, payload, headers);
        setWorkOrders(prev => prev.map(wo => wo._id === editWorkOrder._id ? res.data.data || res.data : wo));
        toast.success("Work order updated!");
      } else {
        const res = await api.post("/construction/work-orders", payload, headers);
        setWorkOrders(prev => [res.data.data || res.data, ...prev]);
        toast.success("Work order created!");
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save.");
    }
  };

  // ─── Open/Close Modal ──────────────────────────────────────────────
  const openModal = (wo = null, type = "contractor") => {
    setEditWorkOrder(wo);
    if (wo) {
      setWorkOrderType(wo.orderType || (wo.customer ? "customer" : "contractor"));
      setSelectedProject({ value: wo.project._id, label: wo.project.name, customer: wo.customer || wo.project.customer || null });
      setSelectedBoq(wo.boq ? { value: wo.boq._id, label: wo.boq.boqNumber } : null);
      setSelectedContractor(
        wo.contractor
          ? { value: wo.contractor._id, label: wo.contractor.supplierName || wo.contractor.name || wo.contractor.contactPersonName || wo.contractor._id }
          : null
      );
      setWoNumber(wo.workOrderNumber);
      setStatus(wo.status);
      setIssuedDate(wo.issuedDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
      setExpectedStart(wo.expectedStart?.split("T")[0] || "");
      setExpectedEnd(wo.expectedEnd?.split("T")[0] || "");
      setItems(wo.items.map(item => ({
        ...item,
        _id: generateId(),
        transferFromStock: item.transferFromStock || false,
      })));
      setMaterials((wo.materials || []).map(mat => ({
        ...mat,
        _id: generateId(),
        transferFromStock: mat.transferFromStock || false,
      })));
      setRemarks(wo.remarks || "");
    } else {
      setWorkOrderType(type);
      setSelectedProject(null);
      setSelectedBoq(null);
      setSelectedContractor(null);
      setWoNumber(`${type === "customer" ? "CWO" : "WO"}-${Date.now().toString().slice(-6)}`);
      setStatus("draft");
      setIssuedDate(new Date().toISOString().split("T")[0]);
      setExpectedStart("");
      setExpectedEnd("");
      setItems([defaultItem()]);
      setMaterials([]);
      setRemarks("");
    }
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditWorkOrder(null);
  };

  // ─── Delete Work Order ──────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this work order? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/work-orders/${id}`, headers);
      setWorkOrders(prev => prev.filter(wo => wo._id !== id));
      toast.success("Work order deleted successfully.");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete work order.");
    }
    setOpenMenuId(null);
  };

  // ─── Create Bill ────────────────────────────────────────────────────
  const handleCreateBill = (woId) => {
    if (!woId) {
      toast.warning("No work order selected.");
      return;
    }
    router.push(`/admin/construction/progress-billing/create?workOrderId=${woId}`);
    setOpenMenuId(null);
  };

  // ─── Transfer Materials ─────────────────────────────────────────────
  const handleTransferMaterials = (woId) => {
    if (!woId) {
      toast.warning("No work order selected.");
      return;
    }
    router.push(`/admin/construction/stock-transfer?ids=${woId}`);
    setOpenMenuId(null);
  };

  // ─── UI helpers ──────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      draft: "bg-gray-100 text-gray-600",
      issued: "bg-blue-100 text-blue-700",
      "in-progress": "bg-amber-100 text-amber-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>{status}</span>;
  };

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const supplierOptions = suppliers.map(s => ({
    value: s._id,
    label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id,
  }));

  const getCustomerName = (customer) =>
    customer?.customerName || customer?.name || customer?.contactPersonName || "No customer linked";

  const getWorkOrderParty = (wo) =>
    wo.orderType === "customer"
      ? getCustomerName(wo.customer)
      : wo.contractor?.supplierName || wo.contractor?.name || "—";

  const getSubSectionOptions = (section) => {
    if (!section) return [];
    const subs = boqSectionMap[section] || [];
    return subs.map(s => ({ value: s, label: s }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileContract className="text-indigo-600" /> Work Orders
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage work orders with items and materials
            </p>
          </div>
          <div className="flex gap-2">
            {selectedOrders.length > 0 && (
              <button
                onClick={handleTransferSelected}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
              >
                <FaArrowRight size={12} /> Transfer {selectedOrders.length}
              </button>
            )}
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              <FaPlus size={12} /> New Work Order
            </button>
            <button
              onClick={() => openModal(null, "customer")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-lg shadow-slate-100 transition-all"
            >
              <FaFileContract size={12} /> Customer Full BOQ
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-4 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedOrders.length === workOrders.length && workOrders.length > 0}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">WO #</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Party</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Items</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : workOrders.length === 0 ? (
                  <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 italic">No work orders found.</td></tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(wo._id)}
                          onChange={() => handleSelectOrder(wo._id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        <button onClick={() => router.push(`/admin/construction/work-orders/${wo._id}`)} className="hover:underline">
                          {wo.workOrderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${wo.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"}`}>
                          {wo.orderType === "customer" ? "Customer" : "Contractor"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">{wo.project?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-600">{getWorkOrderParty(wo)}</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={wo.status} /></td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        {(wo.items?.length || 0) + (wo.materials?.length || 0)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(
                          (wo.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0) +
                          (wo.materials?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0)
                        )}
                      </td>
                      <td className="px-6 py-4 text-right ">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === wo._id ? null : wo._id)}
                          className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"
                        >
                          <HiDotsVertical size={18} />
                        </button>
                        {openMenuId === wo._id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                            <button
                              onClick={() => openModal(wo)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                            >
                              <FaEdit size={14} className="text-indigo-500" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleCreateBill(wo._id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                            >
                              <FaFileInvoice size={14} className="text-emerald-500" />
                              Create Bill
                            </button>
                            <button
                              onClick={() => handleTransferMaterials(wo._id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                            >
                              <FaExchangeAlt size={14} className="text-blue-500" />
                              Transfer Materials
                            </button>
                            <button
                              onClick={() => handleDelete(wo._id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <FaTrashAlt size={14} />
                              Delete
                            </button>
                          </div>
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

      {/* ─── Modal ────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaFileContract size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editWorkOrder ? "Edit Work Order" : "New Work Order"}
              </h2>
              <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
                <span className="font-bold text-gray-400">Items:</span>
                <span className="font-black text-indigo-600">
                  {items.filter(i => i.description && i.description.trim() !== "").length +
                   materials.filter(m => m.itemName && m.itemName.trim() !== "").length}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Lbl text="Order Type" req />
                  <select
                    className={fi}
                    value={workOrderType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setWorkOrderType(nextType);
                      setSelectedContractor(null);
                      if (!editWorkOrder) {
                        setWoNumber(`${nextType === "customer" ? "CWO" : "WO"}-${Date.now().toString().slice(-6)}`);
                      }
                    }}
                    disabled={!!editWorkOrder}
                  >
                    <option value="contractor">Contractor</option>
                    <option value="customer">Customer Full BOQ</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map(p => ({ value: p._id, label: p.name, customer: p.customer || null }))}
                    value={selectedProject}
                    onChange={(project) => {
                      setSelectedProject(project);
                      if (project && selectedBoq) {
                        const selectedBoqDoc = boqs.find(b => b._id === selectedBoq.value);
                        if (selectedBoqDoc?.project?._id && selectedBoqDoc.project._id !== project.value) {
                          setSelectedBoq(null);
                        }
                      }
                    }}
                    placeholder="Select project..."
                    className="text-sm"
                  />
                </div>
                <div>
                  <Lbl text="BOQ" req />
                  <Select
                    options={boqs
                      .filter(b => !selectedProject || (b.project?._id || b.project) === selectedProject.value)
                      .map(b => ({ value: b._id, label: b.boqNumber }))}
                    value={selectedBoq}
                    onChange={setSelectedBoq}
                    placeholder="Select BOQ..."
                    className="text-sm"
                    isClearable
                  />
                </div>
                <div>
                  {workOrderType === "customer" ? (
                    <>
                      <Lbl text="Customer" req />
                      <div className="min-h-[38px] flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700">
                        {getCustomerName(selectedProject?.customer)}
                      </div>
                    </>
                  ) : (
                    <>
                      <Lbl text="Contractor" req />
                      <Select
                        options={supplierOptions}
                        value={selectedContractor}
                        onChange={setSelectedContractor}
                        placeholder="Select contractor..."
                        className="text-sm"
                        noOptionsMessage={() => supplierOptions.length === 0 ? "No suppliers found" : "No matches"}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="WO Number" req />
                  <input type="text" className={fi} value={woNumber} onChange={e => setWoNumber(e.target.value)} required />
                </div>
                <div>
                  <Lbl text="Issued Date" />
                  <input type="date" className={fi} value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
                </div>
                <div>
                  <Lbl text="Status" />
                  <select className={fi} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Expected Start" />
                  <input type="date" className={fi} value={expectedStart} onChange={e => setExpectedStart(e.target.value)} />
                </div>
                <div>
                  <Lbl text="Expected End" />
                  <input type="date" className={fi} value={expectedEnd} onChange={e => setExpectedEnd(e.target.value)} />
                </div>
              </div>

              {/* BOQ Items */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">BOQ Items</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateFromBoq}
                      disabled={generating || !selectedBoq}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                    >
                      <FaSync size={10} className={generating ? "animate-spin" : ""} /> Generate from BOQ
                    </button>
                    <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                      <FaPlus size={10} /> Add Item
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm mb-4">
                  <table className="w-full text-sm divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Section</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Sub‑Section</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[200px]">Description</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate (₹)</th>
                        <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount (₹)</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Transfer</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {items.map((item) => {
                        const sectionOptions = boqSections;
                        const subSectionOptions = getSubSectionOptions(item.section);
                        return (
                          <tr key={item._id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-2">
                              <Select
                                className="text-xs"
                                options={sectionOptions}
                                value={sectionOptions.find(opt => opt.value === item.section) || null}
                                onChange={(selected) => handleItemChange(item._id, "section", selected?.value || "")}
                                placeholder="Select section"
                                isClearable
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                className="text-xs"
                                options={subSectionOptions}
                                value={subSectionOptions.find(opt => opt.value === item.subSection) || null}
                                onChange={(selected) => handleItemChange(item._id, "subSection", selected?.value || "")}
                                placeholder="Select sub‑section"
                                isClearable
                                isDisabled={!item.section}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
                                value={item.description}
                                onChange={(e) => handleItemChange(item._id, "description", e.target.value)}
                                placeholder="Description..."
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={item.unit}
                                onChange={(e) => handleItemChange(item._id, "unit", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item._id, "quantity", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={item.rate}
                                onChange={(e) => handleItemChange(item._id, "rate", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-700">
                              {formatCurrency(item.amount || 0)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.transferFromStock || false}
                                onChange={(e) => handleItemChange(item._id, "transferFromStock", e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemRow(item._id)}
                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                disabled={items.length === 1}
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

              {/* Materials */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Additional Materials</p>
                  <button type="button" onClick={addMaterialRow} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                    <FaPlus size={10} /> Add Material
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-sm divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Section</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Sub‑Section</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[200px]">Material Name</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate (₹)</th>
                        <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount (₹)</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Transfer</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {materials.map((mat) => {
                        const sectionOptions = boqSections;
                        const subSectionOptions = getSubSectionOptions(mat.section);
                        return (
                          <tr key={mat._id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-3 py-2">
                              <Select
                                className="text-xs"
                                options={sectionOptions}
                                value={sectionOptions.find(opt => opt.value === mat.section) || null}
                                onChange={(selected) => handleMaterialChange(mat._id, "section", selected?.value || "")}
                                placeholder="Select section"
                                isClearable
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                className="text-xs"
                                options={subSectionOptions}
                                value={subSectionOptions.find(opt => opt.value === mat.subSection) || null}
                                onChange={(selected) => handleMaterialChange(mat._id, "subSection", selected?.value || "")}
                                placeholder="Select sub‑section"
                                isClearable
                                isDisabled={!mat.section}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none"
                                value={mat.itemName || mat.description || ""}
                                onChange={(e) => handleMaterialChange(mat._id, "itemName", e.target.value)}
                                placeholder="Material name..."
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
                                value={mat.unit}
                                onChange={(e) => handleMaterialChange(mat._id, "unit", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
                                value={mat.quantity}
                                onChange={(e) => handleMaterialChange(mat._id, "quantity", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
                                value={mat.rate}
                                onChange={(e) => handleMaterialChange(mat._id, "rate", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-700">
                              {formatCurrency(mat.amount || 0)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={mat.transferFromStock || false}
                                onChange={(e) => handleMaterialChange(mat._id, "transferFromStock", e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeMaterialRow(mat._id)}
                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                disabled={materials.length === 0}
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
                <textarea className={`${fi} h-16 resize-none`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Additional notes..." />
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                  <FaCheck size={12} /> {editWorkOrder ? "Update Work Order" : "Create Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import api from "@/lib/api";
// import Select from "react-select";
// import {
//   FaPlus,
//   FaTrash,
//   FaCheck,
//   FaSync,
//   FaFileContract,
//   FaCalendarAlt,
//   FaBoxes,
//   FaArrowRight,
//   FaEllipsisV,
//   FaEdit,
//   FaFileInvoice,
//   FaTrashAlt,
// } from "react-icons/fa";
// import { HiDotsVertical } from "react-icons/hi";
// import { toast } from "react-toastify";

// let idCounter = 0;
// const generateId = () => ++idCounter;

// const defaultItem = () => ({
//   _id: generateId(),
//   boqItemId: null,
//   description: "",
//   unit: "nos",
//   quantity: 1,
//   rate: 0,
//   amount: 0,
//   section: "",
//   subSection: "",
//   subSectionIndex: 1,
//   transferFromStock: false,
// });

// export default function WorkOrdersPage() {
//   const router = useRouter();
//   const [workOrders, setWorkOrders] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [boqs, setBoqs] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editWorkOrder, setEditWorkOrder] = useState(null);
//   const [openMenuId, setOpenMenuId] = useState(null); // track which dropdown is open

//   const [selectedOrders, setSelectedOrders] = useState([]);

//   const [selectedProject, setSelectedProject] = useState(null);
//   const [selectedBoq, setSelectedBoq] = useState(null);
//   const [workOrderType, setWorkOrderType] = useState("contractor");
//   const [selectedContractor, setSelectedContractor] = useState(null);
//   const [woNumber, setWoNumber] = useState("");
//   const [status, setStatus] = useState("draft");
//   const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split("T")[0]);
//   const [expectedStart, setExpectedStart] = useState("");
//   const [expectedEnd, setExpectedEnd] = useState("");
//   const [items, setItems] = useState([defaultItem()]);
//   const [remarks, setRemarks] = useState("");
//   const [generating, setGenerating] = useState(false);

//   const [boqSections, setBoqSections] = useState([]);
//   const [boqSubSections, setBoqSubSections] = useState([]);
//   const [boqSectionMap, setBoqSectionMap] = useState({});

//   // ─── Fetch data ──────────────────────────────────────────────────────
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) return;
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const [woRes, pRes, boqRes, sRes] = await Promise.all([
//           api.get("/construction/work-orders", headers),
//           api.get("/construction/projects", headers),
//           api.get("/construction/boq", headers),
//           api.get("/suppliers", headers),
//         ]);
//         setWorkOrders(woRes.data?.data || woRes.data || []);
//         setProjects(pRes.data?.data || pRes.data || []);
//         setBoqs(boqRes.data?.data || boqRes.data || []);
//         setSuppliers(sRes.data?.data || sRes.data || []);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load data.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // ─── Fetch BOQ details ──────────────────────────────────────────────
//   useEffect(() => {
//     if (!selectedBoq) {
//       setBoqSections([]);
//       setBoqSubSections([]);
//       setBoqSectionMap({});
//       return;
//     }
//     const fetchBoqDetails = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
//         const boqData = res.data.data || res.data;
//         const items = boqData.items || [];
//         const sections = [...new Set(items.map(i => i.section).filter(Boolean))];
//         const map = {};
//         sections.forEach(sec => {
//           map[sec] = [...new Set(items.filter(i => i.section === sec).map(i => i.subSection).filter(Boolean))];
//         });
//         setBoqSections(sections.map(s => ({ value: s, label: s })));
//         setBoqSectionMap(map);
//         const allSubSections = [...new Set(items.map(i => i.subSection).filter(Boolean))];
//         setBoqSubSections(allSubSections.map(s => ({ value: s, label: s })));
//       } catch (err) {
//         console.error("Failed to fetch BOQ details:", err);
//       }
//     };
//     fetchBoqDetails();
//   }, [selectedBoq]);

//   // ─── Navigate to stock transfer ──────────────────────────────────
//   const handleTransferSelected = () => {
//     if (selectedOrders.length === 0) {
//       toast.warning("Please select at least one work order.");
//       return;
//     }
//     router.push(`/construction/stock-transfer?ids=${selectedOrders.join(",")}`);
//   };

//   const handleSelectAll = (e) => {
//     if (e.target.checked) {
//       setSelectedOrders(workOrders.map(wo => wo._id));
//     } else {
//       setSelectedOrders([]);
//     }
//   };

//   const handleSelectOrder = (id) => {
//     setSelectedOrders(prev =>
//       prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
//     );
//   };

//   // ─── Generate from BOQ ──────────────────────────────────────────────
//   const handleGenerateFromBoq = async () => {
//     if (!selectedBoq) {
//       toast.error("Please select a BOQ.");
//       return;
//     }
//     setGenerating(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
//       const boqData = res.data.data || res.data;
//       const boqItems = boqData.items || [];
//       const generatedItems = boqItems.map(item => ({
//         _id: generateId(),
//         boqItemId: item._id,
//         description: item.itemName || "",
//         unit: item.unit || "nos",
//         quantity: item.quantity || 0,
//         rate: item.rate || 0,
//         amount: item.amount || 0,
//         section: item.section || "Other Work",
//         subSection: item.subSection || "Main",
//         subSectionIndex: item.subSectionIndex || 1,
//         transferFromStock: false,
//       }));
//       setItems(generatedItems);
//       toast.success(`Added ${generatedItems.length} items from BOQ.`);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to fetch BOQ items.");
//     } finally {
//       setGenerating(false);
//     }
//   };

//   const addItemRow = () => setItems(prev => [...prev, defaultItem()]);
//   const removeItemRow = (id) => {
//     if (items.length === 1) return;
//     setItems(prev => prev.filter(item => item._id !== id));
//   };
//   const handleItemChange = (id, field, value) => {
//     setItems(prev =>
//       prev.map(item => {
//         if (item._id !== id) return item;
//         const updated = { ...item, [field]: value };
//         if (field === "quantity" || field === "rate") {
//           const qty = parseFloat(updated.quantity) || 0;
//           const rate = parseFloat(updated.rate) || 0;
//           updated.amount = qty * rate;
//         }
//         if (field === "section") {
//           updated.subSection = "";
//         }
//         return updated;
//       })
//     );
//   };

//   // ─── Submit ──────────────────────────────────────────────────────────
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!selectedProject) {
//       toast.error("Please select a project.");
//       return;
//     }
//     if (!selectedBoq) {
//       toast.error("Please select a BOQ.");
//       return;
//     }
//     if (workOrderType === "contractor" && !selectedContractor) {
//       toast.error("Please select a contractor.");
//       return;
//     }
//     if (workOrderType === "customer" && !selectedProject.customer) {
//       toast.error("Selected project has no customer linked.");
//       return;
//     }
//     let validItems = items.filter(item => item.description && item.description.trim() !== "");
//     if (workOrderType === "customer") {
//       try {
//         const token = localStorage.getItem("token");
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
//         const boqData = res.data.data || res.data;
//         validItems = (boqData.items || []).map(item => ({
//           _id: generateId(),
//           boqItemId: item._id,
//           itemName: item.itemName || item.description || "",
//           description: item.description || item.itemName || "",
//           unit: item.unit || "nos",
//           quantity: item.quantity || 0,
//           rate: item.rate || 0,
//           amount: item.amount || 0,
//           section: item.section || "Other Work",
//           subSection: item.subSection || "Main",
//           subSectionIndex: item.subSectionIndex || 1,
//           transferFromStock: false,
//         }));
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load full BOQ.");
//         return;
//       }
//     }
//     if (validItems.length === 0) {
//       toast.error("Please add at least one item with description.");
//       return;
//     }
//     const payload = {
//       orderType: workOrderType,
//       project: selectedProject.value,
//       boq: selectedBoq?.value || null,
//       contractor: workOrderType === "contractor" ? selectedContractor.value : null,
//       workOrderNumber: woNumber || `WO-${Date.now().toString().slice(-6)}`,
//       status,
//       issuedDate,
//       expectedStart: expectedStart || undefined,
//       expectedEnd: expectedEnd || undefined,
//       items: validItems.map(({ boqItemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex, transferFromStock }) => ({
//         boqItemId,
//         itemName,
//         description,
//         unit,
//         quantity: parseFloat(quantity) || 0,
//         rate: parseFloat(rate) || 0,
//         amount: parseFloat(amount) || 0,
//         section: section || "Other Work",
//         subSection: subSection || "Main",
//         subSectionIndex: subSectionIndex || 1,
//         transferFromStock: !!transferFromStock,
//       })),
//       remarks,
//     };
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       if (editWorkOrder) {
//         const res = await api.put(`/construction/work-orders/${editWorkOrder._id}`, payload, headers);
//         setWorkOrders(prev => prev.map(wo => wo._id === editWorkOrder._id ? res.data.data || res.data : wo));
//         toast.success("Work order updated!");
//       } else {
//         const res = await api.post("/construction/work-orders", payload, headers);
//         setWorkOrders(prev => [res.data.data || res.data, ...prev]);
//         toast.success("Work order created!");
//       }
//       closeModal();
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to save.");
//     }
//   };

//   // ─── Open/Close Modal ──────────────────────────────────────────────
//   const openModal = (wo = null, type = "contractor") => {
//     setEditWorkOrder(wo);
//     if (wo) {
//       setWorkOrderType(wo.orderType || (wo.customer ? "customer" : "contractor"));
//       setSelectedProject({ value: wo.project._id, label: wo.project.name, customer: wo.customer || wo.project.customer || null });
//       setSelectedBoq(wo.boq ? { value: wo.boq._id, label: wo.boq.boqNumber } : null);
//       setSelectedContractor(
//         wo.contractor
//           ? { value: wo.contractor._id, label: wo.contractor.supplierName || wo.contractor.name || wo.contractor.contactPersonName || wo.contractor._id }
//           : null
//       );
//       setWoNumber(wo.workOrderNumber);
//       setStatus(wo.status);
//       setIssuedDate(wo.issuedDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
//       setExpectedStart(wo.expectedStart?.split("T")[0] || "");
//       setExpectedEnd(wo.expectedEnd?.split("T")[0] || "");
//       setItems(wo.items.map(item => ({
//         ...item,
//         _id: generateId(),
//         transferFromStock: item.transferFromStock || false,
//       })));
//       setRemarks(wo.remarks || "");
//     } else {
//       setWorkOrderType(type);
//       setSelectedProject(null);
//       setSelectedBoq(null);
//       setSelectedContractor(null);
//       setWoNumber(`${type === "customer" ? "CWO" : "WO"}-${Date.now().toString().slice(-6)}`);
//       setStatus("draft");
//       setIssuedDate(new Date().toISOString().split("T")[0]);
//       setExpectedStart("");
//       setExpectedEnd("");
//       setItems([defaultItem()]);
//       setRemarks("");
//     }
//     setIsModalOpen(true);
//     setOpenMenuId(null); // close any open menu
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setEditWorkOrder(null);
//   };

//   // ─── Delete Work Order ──────────────────────────────────────────────
//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this work order? This action cannot be undone.")) return;
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       await api.delete(`/construction/work-orders/${id}`, headers);
//       setWorkOrders(prev => prev.filter(wo => wo._id !== id));
//       toast.success("Work order deleted successfully.");
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to delete work order.");
//     }
//     setOpenMenuId(null);
//   };

//   // ─── Create Bill ────────────────────────────────────────────────────
// const handleCreateBill = (boqId) => {
//   if (!boqId) {
//     toast.warning("No BOQ linked to this work order.");
//     return;
//   }
//   router.push(`/construction/progress-billing?boqId=${boqId}`);
//   setOpenMenuId(null);
// };

//   // ─── UI helpers ──────────────────────────────────────────────────────
//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
//       {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );
//   const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

//   const StatusBadge = ({ status }) => {
//     const colors = {
//       draft: "bg-gray-100 text-gray-600",
//       issued: "bg-blue-100 text-blue-700",
//       "in-progress": "bg-amber-100 text-amber-700",
//       completed: "bg-emerald-100 text-emerald-700",
//       cancelled: "bg-red-100 text-red-700",
//     };
//     return <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>{status}</span>;
//   };

//   const formatCurrency = (num) =>
//     new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

//   const supplierOptions = suppliers.map(s => ({
//     value: s._id,
//     label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id,
//   }));

//   const getCustomerName = (customer) =>
//     customer?.customerName || customer?.name || customer?.contactPersonName || "No customer linked";

//   const getWorkOrderParty = (wo) =>
//     wo.orderType === "customer"
//       ? getCustomerName(wo.customer)
//       : wo.contractor?.supplierName || wo.contractor?.name || "—";

//   const getSubSectionOptions = (section) => {
//     if (!section) return [];
//     const subs = boqSectionMap[section] || [];
//     return subs.map(s => ({ value: s, label: s }));
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//               <FaFileContract className="text-indigo-600" /> Work Orders
//             </h1>
//             <p className="text-sm text-gray-400 mt-0.5">
//               Manage work orders with a single contractor
//             </p>
//           </div>
//           <div className="flex gap-2">
//             {selectedOrders.length > 0 && (
//               <button
//                 onClick={handleTransferSelected}
//                 className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
//               >
//                 <FaArrowRight size={12} /> Transfer {selectedOrders.length}
//               </button>
//             )}
//             <button
//               onClick={() => openModal()}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
//             >
//               <FaPlus size={12} /> New Work Order
//             </button>
//             <button
//               onClick={() => openModal(null, "customer")}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-lg shadow-slate-100 transition-all"
//             >
//               <FaFileContract size={12} /> Customer Full BOQ
//             </button>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   <th className="px-3 py-4 text-center">
//                     <input
//                       type="checkbox"
//                       onChange={handleSelectAll}
//                       checked={selectedOrders.length === workOrders.length && workOrders.length > 0}
//                       className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                   </th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">WO #</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Party</th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Items</th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-50">
//                 {loading ? (
//                   <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
//                 ) : workOrders.length === 0 ? (
//                   <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 italic">No work orders found.</td></tr>
//                 ) : (
//                   workOrders.map((wo) => (
//                     <tr key={wo._id} className="hover:bg-indigo-50/20 transition-colors">
//                       <td className="px-3 py-4 text-center">
//                         <input
//                           type="checkbox"
//                           checked={selectedOrders.includes(wo._id)}
//                           onChange={() => handleSelectOrder(wo._id)}
//                           className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                         />
//                       </td>
//                       <td className="px-6 py-4 font-bold text-indigo-600">
//                         <button onClick={() => router.push(`/construction/work-orders/${wo._id}`)} className="hover:underline">
//                           {wo.workOrderNumber}
//                         </button>
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${wo.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"}`}>
//                           {wo.orderType === "customer" ? "Customer" : "Contractor"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 font-medium text-gray-700">{wo.project?.name || "N/A"}</td>
//                       <td className="px-6 py-4 text-gray-600">{getWorkOrderParty(wo)}</td>
//                       <td className="px-6 py-4 text-center"><StatusBadge status={wo.status} /></td>
//                       <td className="px-6 py-4 text-center text-gray-500">{wo.items?.length || 0}</td>
//                       <td className="px-6 py-4 text-right font-bold text-gray-800">
//                         {formatCurrency(wo.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0)}
//                       </td>
//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={() => setOpenMenuId(openMenuId === wo._id ? null : wo._id)}
//                           className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"
//                         >
//                           <HiDotsVertical size={18} />
//                         </button>
//                         {openMenuId === wo._id && (
//                           <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
//                             <button
//                               onClick={() => openModal(wo)}
//                               className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
//                             >
//                               <FaEdit size={14} className="text-indigo-500" />
//                               Edit
//                             </button>
//                             <button
//                               onClick={() => handleCreateBill(wo.boq?._id)}
//                               className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
//                             >
//                               <FaFileInvoice size={14} className="text-emerald-500" />
//                               Create Bill
//                             </button>
//                             <button
//                               onClick={() => handleDelete(wo._id)}
//                               className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
//                             >
//                               <FaTrashAlt size={14} />
//                               Delete
//                             </button>
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* ─── Modal ────────────────────────────────────────────────────── */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
//             <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
//               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
//                 <FaFileContract size={20} />
//               </div>
//               <h2 className="text-xl font-black text-gray-900 tracking-tight">
//                 {editWorkOrder ? "Edit Work Order" : "New Work Order"}
//               </h2>
//               <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
//                 <span className="font-bold text-gray-400">Items:</span>
//                 <span className="font-black text-indigo-600">
//                   {items.filter(i => i.description && i.description.trim() !== "").length}
//                 </span>
//               </div>
//             </div>

//             <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <div>
//                   <Lbl text="Order Type" req />
//                   <select
//                     className={fi}
//                     value={workOrderType}
//                     onChange={(e) => {
//                       const nextType = e.target.value;
//                       setWorkOrderType(nextType);
//                       setSelectedContractor(null);
//                       if (!editWorkOrder) {
//                         setWoNumber(`${nextType === "customer" ? "CWO" : "WO"}-${Date.now().toString().slice(-6)}`);
//                       }
//                     }}
//                     disabled={!!editWorkOrder}
//                   >
//                     <option value="contractor">Contractor</option>
//                     <option value="customer">Customer Full BOQ</option>
//                   </select>
//                 </div>
//                 <div>
//                   <Lbl text="Project" req />
//                   <Select
//                     options={projects.map(p => ({ value: p._id, label: p.name, customer: p.customer || null }))}
//                     value={selectedProject}
//                     onChange={(project) => {
//                       setSelectedProject(project);
//                       if (project && selectedBoq) {
//                         const selectedBoqDoc = boqs.find(b => b._id === selectedBoq.value);
//                         if (selectedBoqDoc?.project?._id && selectedBoqDoc.project._id !== project.value) {
//                           setSelectedBoq(null);
//                         }
//                       }
//                     }}
//                     placeholder="Select project..."
//                     className="text-sm"
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="BOQ" req />
//                   <Select
//                     options={boqs
//                       .filter(b => !selectedProject || (b.project?._id || b.project) === selectedProject.value)
//                       .map(b => ({ value: b._id, label: b.boqNumber }))}
//                     value={selectedBoq}
//                     onChange={setSelectedBoq}
//                     placeholder="Select BOQ..."
//                     className="text-sm"
//                     isClearable
//                   />
//                 </div>
//                 <div>
//                   {workOrderType === "customer" ? (
//                     <>
//                       <Lbl text="Customer" req />
//                       <div className="min-h-[38px] flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700">
//                         {getCustomerName(selectedProject?.customer)}
//                       </div>
//                     </>
//                   ) : (
//                     <>
//                       <Lbl text="Contractor" req />
//                       <Select
//                         options={supplierOptions}
//                         value={selectedContractor}
//                         onChange={setSelectedContractor}
//                         placeholder="Select contractor..."
//                         className="text-sm"
//                         noOptionsMessage={() => supplierOptions.length === 0 ? "No suppliers found" : "No matches"}
//                       />
//                     </>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div>
//                   <Lbl text="WO Number" req />
//                   <input type="text" className={fi} value={woNumber} onChange={e => setWoNumber(e.target.value)} required />
//                 </div>
//                 <div>
//                   <Lbl text="Issued Date" />
//                   <input type="date" className={fi} value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
//                 </div>
//                 <div>
//                   <Lbl text="Status" />
//                   <select className={fi} value={status} onChange={e => setStatus(e.target.value)}>
//                     <option value="draft">Draft</option>
//                     <option value="issued">Issued</option>
//                     <option value="in-progress">In Progress</option>
//                     <option value="completed">Completed</option>
//                     <option value="cancelled">Cancelled</option>
//                   </select>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="Expected Start" />
//                   <input type="date" className={fi} value={expectedStart} onChange={e => setExpectedStart(e.target.value)} />
//                 </div>
//                 <div>
//                   <Lbl text="Expected End" />
//                   <input type="date" className={fi} value={expectedEnd} onChange={e => setExpectedEnd(e.target.value)} />
//                 </div>
//               </div>

//               {/* Line Items */}
//               <div className="border-t border-gray-200 pt-4 mt-2">
//                 <div className="flex items-center justify-between mb-3">
//                   <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
//                     {workOrderType === "customer" ? "Full BOQ Items" : "Line Items"}
//                   </p>
//                   <div className="flex gap-2">
//                     {workOrderType === "customer" ? (
//                       <span className="text-xs font-bold text-slate-500">
//                         Complete BOQ will be copied on save
//                       </span>
//                     ) : (
//                       <>
//                         <button
//                           type="button"
//                           onClick={handleGenerateFromBoq}
//                           disabled={generating || !selectedBoq}
//                           className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
//                         >
//                           <FaSync size={10} className={generating ? "animate-spin" : ""} /> Generate from BOQ
//                         </button>
//                         <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
//                           <FaPlus size={10} /> Add Row
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </div>

//                 <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
//                   <table className="w-full text-sm divide-y divide-gray-100">
//                     <thead className="bg-gray-50">
//                       <tr>
//                         <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Section</th>
//                         <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Sub‑Section</th>
//                         <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[200px]">Description</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate (₹)</th>
//                         <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount (₹)</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Transfer</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100 bg-white">
//                       {items.map((item) => {
//                         const sectionOptions = boqSections;
//                         const subSectionOptions = getSubSectionOptions(item.section);
//                         return (
//                           <tr key={item._id} className="hover:bg-indigo-50/30 transition-colors">
//                             <td className="px-3 py-2">
//                               <Select
//                                 className="text-xs"
//                                 options={sectionOptions}
//                                 value={sectionOptions.find(opt => opt.value === item.section) || null}
//                                 onChange={(selected) => handleItemChange(item._id, "section", selected?.value || "")}
//                                 placeholder="Select section"
//                                 isClearable
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <Select
//                                 className="text-xs"
//                                 options={subSectionOptions}
//                                 value={subSectionOptions.find(opt => opt.value === item.subSection) || null}
//                                 onChange={(selected) => handleItemChange(item._id, "subSection", selected?.value || "")}
//                                 placeholder="Select sub‑section"
//                                 isClearable
//                                 isDisabled={!item.section}
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="text"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
//                                 value={item.description}
//                                 onChange={(e) => handleItemChange(item._id, "description", e.target.value)}
//                                 placeholder="Description..."
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="text"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.unit}
//                                 onChange={(e) => handleItemChange(item._id, "unit", e.target.value)}
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="number"
//                                 step="any"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.quantity}
//                                 onChange={(e) => handleItemChange(item._id, "quantity", e.target.value)}
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="number"
//                                 step="any"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.rate}
//                                 onChange={(e) => handleItemChange(item._id, "rate", e.target.value)}
//                               />
//                             </td>
//                             <td className="px-3 py-2 text-right font-bold text-gray-700">
//                               {formatCurrency(item.amount || 0)}
//                             </td>
//                             <td className="px-3 py-2 text-center">
//                               <input
//                                 type="checkbox"
//                                 checked={item.transferFromStock || false}
//                                 onChange={(e) => handleItemChange(item._id, "transferFromStock", e.target.checked)}
//                                 className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                               />
//                             </td>
//                             <td className="px-3 py-2 text-center">
//                               <button
//                                 type="button"
//                                 onClick={() => removeItemRow(item._id)}
//                                 className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
//                                 disabled={items.length === 1}
//                               >
//                                 <FaTrash size={12} />
//                               </button>
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               <div>
//                 <Lbl text="Remarks" />
//                 <textarea className={`${fi} h-16 resize-none`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Additional notes..." />
//               </div>

//               <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
//                 <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
//                 <button type="submit" className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
//                   <FaCheck size={12} /> {editWorkOrder ? "Update Work Order" : "Create Work Order"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import api from "@/lib/api";
// import Select from "react-select";
// import {
//   FaPlus,
//   FaTrash,
//   FaCheck,
//   FaSync,
//   FaFileContract,
//   FaCalendarAlt,
//   FaBoxes,
//   FaArrowRight,
// } from "react-icons/fa";
// import { HiDotsVertical } from "react-icons/hi";
// import { toast } from "react-toastify";

// let idCounter = 0;
// const generateId = () => ++idCounter;

// const defaultItem = () => ({
//   _id: generateId(),
//   boqItemId: null,
//   description: "",
//   unit: "nos",
//   quantity: 1,
//   rate: 0,
//   amount: 0,
//   section: "",
//   subSection: "",
//   subSectionIndex: 1,
//   transferFromStock: false,
// });

// export default function WorkOrdersPage() {
//   const router = useRouter();
//   const [workOrders, setWorkOrders] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [boqs, setBoqs] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editWorkOrder, setEditWorkOrder] = useState(null);

//   const [selectedOrders, setSelectedOrders] = useState([]);

//   const [selectedProject, setSelectedProject] = useState(null);
//   const [selectedBoq, setSelectedBoq] = useState(null);
//   const [workOrderType, setWorkOrderType] = useState("contractor");
//   const [selectedContractor, setSelectedContractor] = useState(null); // single
//   const [woNumber, setWoNumber] = useState("");
//   const [status, setStatus] = useState("draft");
//   const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split("T")[0]);
//   const [expectedStart, setExpectedStart] = useState("");
//   const [expectedEnd, setExpectedEnd] = useState("");
//   const [items, setItems] = useState([defaultItem()]);
//   const [remarks, setRemarks] = useState("");
//   const [generating, setGenerating] = useState(false);

//   const [boqSections, setBoqSections] = useState([]);
//   const [boqSubSections, setBoqSubSections] = useState([]);
//   const [boqSectionMap, setBoqSectionMap] = useState({});

//   // ─── Fetch data ──────────────────────────────────────────────────────
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) return;
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const [woRes, pRes, boqRes, sRes] = await Promise.all([
//           api.get("/construction/work-orders", headers),
//           api.get("/construction/projects", headers),
//           api.get("/construction/boq", headers),
//           api.get("/suppliers", headers),
//         ]);
//         setWorkOrders(woRes.data?.data || woRes.data || []);
//         setProjects(pRes.data?.data || pRes.data || []);
//         setBoqs(boqRes.data?.data || boqRes.data || []);
//         setSuppliers(sRes.data?.data || sRes.data || []);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load data.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // ─── Fetch BOQ details ──────────────────────────────────────────────
//   useEffect(() => {
//     if (!selectedBoq) {
//       setBoqSections([]);
//       setBoqSubSections([]);
//       setBoqSectionMap({});
//       return;
//     }
//     const fetchBoqDetails = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
//         const boqData = res.data.data || res.data;
//         const items = boqData.items || [];
//         const sections = [...new Set(items.map(i => i.section).filter(Boolean))];
//         const map = {};
//         sections.forEach(sec => {
//           map[sec] = [...new Set(items.filter(i => i.section === sec).map(i => i.subSection).filter(Boolean))];
//         });
//         setBoqSections(sections.map(s => ({ value: s, label: s })));
//         setBoqSectionMap(map);
//         const allSubSections = [...new Set(items.map(i => i.subSection).filter(Boolean))];
//         setBoqSubSections(allSubSections.map(s => ({ value: s, label: s })));
//       } catch (err) {
//         console.error("Failed to fetch BOQ details:", err);
//       }
//     };
//     fetchBoqDetails();
//   }, [selectedBoq]);

//   // ─── Navigate to stock transfer ──────────────────────────────────
//   const handleTransferSelected = () => {
//     if (selectedOrders.length === 0) {
//       toast.warning("Please select at least one work order.");
//       return;
//     }
//     router.push(`/construction/stock-transfer?ids=${selectedOrders.join(",")}`);
//   };

//   const handleSelectAll = (e) => {
//     if (e.target.checked) {
//       setSelectedOrders(workOrders.map(wo => wo._id));
//     } else {
//       setSelectedOrders([]);
//     }
//   };

//   const handleSelectOrder = (id) => {
//     setSelectedOrders(prev =>
//       prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
//     );
//   };

//   // ─── Generate from BOQ ──────────────────────────────────────────────
//   const handleGenerateFromBoq = async () => {
//     if (!selectedBoq) {
//       toast.error("Please select a BOQ.");
//       return;
//     }
//     setGenerating(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
//       const boqData = res.data.data || res.data;
//       const boqItems = boqData.items || [];
//       const generatedItems = boqItems.map(item => ({
//         _id: generateId(),
//         boqItemId: item._id,
//         description: item.itemName || "",
//         unit: item.unit || "nos",
//         quantity: item.quantity || 0,
//         rate: item.rate || 0,
//         amount: item.amount || 0,
//         section: item.section || "Other Work",
//         subSection: item.subSection || "Main",
//         subSectionIndex: item.subSectionIndex || 1,
//         transferFromStock: false,
//       }));
//       setItems(generatedItems);
//       toast.success(`Added ${generatedItems.length} items from BOQ.`);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to fetch BOQ items.");
//     } finally {
//       setGenerating(false);
//     }
//   };

//   const addItemRow = () => setItems(prev => [...prev, defaultItem()]);
//   const removeItemRow = (id) => {
//     if (items.length === 1) return;
//     setItems(prev => prev.filter(item => item._id !== id));
//   };
//   const handleItemChange = (id, field, value) => {
//     setItems(prev =>
//       prev.map(item => {
//         if (item._id !== id) return item;
//         const updated = { ...item, [field]: value };
//         if (field === "quantity" || field === "rate") {
//           const qty = parseFloat(updated.quantity) || 0;
//           const rate = parseFloat(updated.rate) || 0;
//           updated.amount = qty * rate;
//         }
//         if (field === "section") {
//           updated.subSection = "";
//         }
//         return updated;
//       })
//     );
//   };

//   // ─── Submit ──────────────────────────────────────────────────────────
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!selectedProject) {
//       toast.error("Please select a project.");
//       return;
//     }
//     if (!selectedBoq) {
//       toast.error("Please select a BOQ.");
//       return;
//     }
//     if (workOrderType === "contractor" && !selectedContractor) {
//       toast.error("Please select a contractor.");
//       return;
//     }
//     if (workOrderType === "customer" && !selectedProject.customer) {
//       toast.error("Selected project has no customer linked.");
//       return;
//     }
//     let validItems = items.filter(item => item.description && item.description.trim() !== "");
//     if (workOrderType === "customer") {
//       try {
//         const token = localStorage.getItem("token");
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const res = await api.get(`/construction/boq?id=${selectedBoq.value}`, headers);
//         const boqData = res.data.data || res.data;
//         validItems = (boqData.items || []).map(item => ({
//           _id: generateId(),
//           boqItemId: item._id,
//           itemName: item.itemName || item.description || "",
//           description: item.description || item.itemName || "",
//           unit: item.unit || "nos",
//           quantity: item.quantity || 0,
//           rate: item.rate || 0,
//           amount: item.amount || 0,
//           section: item.section || "Other Work",
//           subSection: item.subSection || "Main",
//           subSectionIndex: item.subSectionIndex || 1,
//           transferFromStock: false,
//         }));
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load full BOQ.");
//         return;
//       }
//     }
//     if (validItems.length === 0) {
//       toast.error("Please add at least one item with description.");
//       return;
//     }
//     const payload = {
//       orderType: workOrderType,
//       project: selectedProject.value,
//       boq: selectedBoq?.value || null,
//       contractor: workOrderType === "contractor" ? selectedContractor.value : null,
//       workOrderNumber: woNumber || `WO-${Date.now().toString().slice(-6)}`,
//       status,
//       issuedDate,
//       expectedStart: expectedStart || undefined,
//       expectedEnd: expectedEnd || undefined,
//       items: validItems.map(({ boqItemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex, transferFromStock }) => ({
//         boqItemId,
//         itemName,
//         description,
//         unit,
//         quantity: parseFloat(quantity) || 0,
//         rate: parseFloat(rate) || 0,
//         amount: parseFloat(amount) || 0,
//         section: section || "Other Work",
//         subSection: subSection || "Main",
//         subSectionIndex: subSectionIndex || 1,
//         transferFromStock: !!transferFromStock,
//       })),
//       remarks,
//     };
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       if (editWorkOrder) {
//         const res = await api.put(`/construction/work-orders/${editWorkOrder._id}`, payload, headers);
//         setWorkOrders(prev => prev.map(wo => wo._id === editWorkOrder._id ? res.data.data || res.data : wo));
//         toast.success("Work order updated!");
//       } else {
//         const res = await api.post("/construction/work-orders", payload, headers);
//         setWorkOrders(prev => [res.data.data || res.data, ...prev]);
//         toast.success("Work order created!");
//       }
//       closeModal();
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to save.");
//     }
//   };

//   const openModal = (wo = null, type = "contractor") => {
//     setEditWorkOrder(wo);
//     if (wo) {
//       setWorkOrderType(wo.orderType || (wo.customer ? "customer" : "contractor"));
//       setSelectedProject({ value: wo.project._id, label: wo.project.name, customer: wo.customer || wo.project.customer || null });
//       setSelectedBoq(wo.boq ? { value: wo.boq._id, label: wo.boq.boqNumber } : null);
//       setSelectedContractor(
//         wo.contractor
//           ? { value: wo.contractor._id, label: wo.contractor.supplierName || wo.contractor.name || wo.contractor.contactPersonName || wo.contractor._id }
//           : null
//       );
//       setWoNumber(wo.workOrderNumber);
//       setStatus(wo.status);
//       setIssuedDate(wo.issuedDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
//       setExpectedStart(wo.expectedStart?.split("T")[0] || "");
//       setExpectedEnd(wo.expectedEnd?.split("T")[0] || "");
//       setItems(wo.items.map(item => ({
//         ...item,
//         _id: generateId(),
//         transferFromStock: item.transferFromStock || false,
//       })));
//       setRemarks(wo.remarks || "");
//     } else {
//       setWorkOrderType(type);
//       setSelectedProject(null);
//       setSelectedBoq(null);
//       setSelectedContractor(null);
//       setWoNumber(`${type === "customer" ? "CWO" : "WO"}-${Date.now().toString().slice(-6)}`);
//       setStatus("draft");
//       setIssuedDate(new Date().toISOString().split("T")[0]);
//       setExpectedStart("");
//       setExpectedEnd("");
//       setItems([defaultItem()]);
//       setRemarks("");
//     }
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setEditWorkOrder(null);
//   };

//   // ─── UI helpers ──────────────────────────────────────────────────────
//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
//       {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );
//   const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

//   const StatusBadge = ({ status }) => {
//     const colors = {
//       draft: "bg-gray-100 text-gray-600",
//       issued: "bg-blue-100 text-blue-700",
//       "in-progress": "bg-amber-100 text-amber-700",
//       completed: "bg-emerald-100 text-emerald-700",
//       cancelled: "bg-red-100 text-red-700",
//     };
//     return <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>{status}</span>;
//   };

//   const formatCurrency = (num) =>
//     new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

//   const supplierOptions = suppliers.map(s => ({
//     value: s._id,
//     label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id,
//   }));

//   const getCustomerName = (customer) =>
//     customer?.customerName || customer?.name || customer?.contactPersonName || "No customer linked";

//   const getWorkOrderParty = (wo) =>
//     wo.orderType === "customer"
//       ? getCustomerName(wo.customer)
//       : wo.contractor?.supplierName || wo.contractor?.name || "—";

//   const getSubSectionOptions = (section) => {
//     if (!section) return [];
//     const subs = boqSectionMap[section] || [];
//     return subs.map(s => ({ value: s, label: s }));
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//               <FaFileContract className="text-indigo-600" /> Work Orders
//             </h1>
//             <p className="text-sm text-gray-400 mt-0.5">
//               Manage work orders with a single contractor
//             </p>
//           </div>
//           <div className="flex gap-2">
//             {selectedOrders.length > 0 && (
//               <button
//                 onClick={handleTransferSelected}
//                 className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
//               >
//                 <FaArrowRight size={12} /> Transfer {selectedOrders.length}
//               </button>
//             )}
//             <button
//               onClick={() => openModal()}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
//             >
//               <FaPlus size={12} /> New Work Order
//             </button>
//             <button
//               onClick={() => openModal(null, "customer")}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-lg shadow-slate-100 transition-all"
//             >
//               <FaFileContract size={12} /> Customer Full BOQ
//             </button>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   <th className="px-3 py-4 text-center">
//                     <input
//                       type="checkbox"
//                       onChange={handleSelectAll}
//                       checked={selectedOrders.length === workOrders.length && workOrders.length > 0}
//                       className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                   </th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">WO #</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Party</th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Items</th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-50">
//                 {loading ? (
//                   <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
//                 ) : workOrders.length === 0 ? (
//                   <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 italic">No work orders found.</td></tr>
//                 ) : (
//                   workOrders.map((wo) => (
//                     <tr key={wo._id} className="hover:bg-indigo-50/20 transition-colors">
//                       <td className="px-3 py-4 text-center">
//                         <input
//                           type="checkbox"
//                           checked={selectedOrders.includes(wo._id)}
//                           onChange={() => handleSelectOrder(wo._id)}
//                           className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                         />
//                       </td>
//                       <td className="px-6 py-4 font-bold text-indigo-600">
//                         <button onClick={() => router.push(`/construction/work-orders/${wo._id}`)} className="hover:underline">
//                           {wo.workOrderNumber}
//                         </button>
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${wo.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"}`}>
//                           {wo.orderType === "customer" ? "Customer" : "Contractor"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 font-medium text-gray-700">{wo.project?.name || "N/A"}</td>
//                       <td className="px-6 py-4 text-gray-600">{getWorkOrderParty(wo)}</td>
//                       <td className="px-6 py-4 text-center"><StatusBadge status={wo.status} /></td>
//                       <td className="px-6 py-4 text-center text-gray-500">{wo.items?.length || 0}</td>
//                       <td className="px-6 py-4 text-right font-bold text-gray-800">
//                         {formatCurrency(wo.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0)}
//                       </td>
//                       <td className="px-6 py-4 text-right">
//                         <button onClick={() => openModal(wo)} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
//                           <HiDotsVertical size={18} />
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* ─── Modal ────────────────────────────────────────────────────── */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
//             <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
//               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
//                 <FaFileContract size={20} />
//               </div>
//               <h2 className="text-xl font-black text-gray-900 tracking-tight">
//                 {editWorkOrder ? "Edit Work Order" : "New Work Order"}
//               </h2>
//               <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
//                 <span className="font-bold text-gray-400">Items:</span>
//                 <span className="font-black text-indigo-600">
//                   {items.filter(i => i.description && i.description.trim() !== "").length}
//                 </span>
//               </div>
//             </div>

//             <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <div>
//                   <Lbl text="Order Type" req />
//                   <select
//                     className={fi}
//                     value={workOrderType}
//                     onChange={(e) => {
//                       const nextType = e.target.value;
//                       setWorkOrderType(nextType);
//                       setSelectedContractor(null);
//                       if (!editWorkOrder) {
//                         setWoNumber(`${nextType === "customer" ? "CWO" : "WO"}-${Date.now().toString().slice(-6)}`);
//                       }
//                     }}
//                     disabled={!!editWorkOrder}
//                   >
//                     <option value="contractor">Contractor</option>
//                     <option value="customer">Customer Full BOQ</option>
//                   </select>
//                 </div>
//                 <div>
//                   <Lbl text="Project" req />
//                   <Select
//                     options={projects.map(p => ({ value: p._id, label: p.name, customer: p.customer || null }))}
//                     value={selectedProject}
//                     onChange={(project) => {
//                       setSelectedProject(project);
//                       if (project && selectedBoq) {
//                         const selectedBoqDoc = boqs.find(b => b._id === selectedBoq.value);
//                         if (selectedBoqDoc?.project?._id && selectedBoqDoc.project._id !== project.value) {
//                           setSelectedBoq(null);
//                         }
//                       }
//                     }}
//                     placeholder="Select project..."
//                     className="text-sm"
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="BOQ" req />
//                   <Select
//                     options={boqs
//                       .filter(b => !selectedProject || (b.project?._id || b.project) === selectedProject.value)
//                       .map(b => ({ value: b._id, label: b.boqNumber }))}
//                     value={selectedBoq}
//                     onChange={setSelectedBoq}
//                     placeholder="Select BOQ..."
//                     className="text-sm"
//                     isClearable
//                   />
//                 </div>
//                 <div>
//                   {workOrderType === "customer" ? (
//                     <>
//                       <Lbl text="Customer" req />
//                       <div className="min-h-[38px] flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700">
//                         {getCustomerName(selectedProject?.customer)}
//                       </div>
//                     </>
//                   ) : (
//                     <>
//                       <Lbl text="Contractor" req />
//                       <Select
//                         options={supplierOptions}
//                         value={selectedContractor}
//                         onChange={setSelectedContractor}
//                         placeholder="Select contractor..."
//                         className="text-sm"
//                         noOptionsMessage={() => supplierOptions.length === 0 ? "No suppliers found" : "No matches"}
//                       />
//                     </>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div>
//                   <Lbl text="WO Number" req />
//                   <input type="text" className={fi} value={woNumber} onChange={e => setWoNumber(e.target.value)} required />
//                 </div>
//                 <div>
//                   <Lbl text="Issued Date" />
//                   <input type="date" className={fi} value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
//                 </div>
//                 <div>
//                   <Lbl text="Status" />
//                   <select className={fi} value={status} onChange={e => setStatus(e.target.value)}>
//                     <option value="draft">Draft</option>
//                     <option value="issued">Issued</option>
//                     <option value="in-progress">In Progress</option>
//                     <option value="completed">Completed</option>
//                     <option value="cancelled">Cancelled</option>
//                   </select>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="Expected Start" />
//                   <input type="date" className={fi} value={expectedStart} onChange={e => setExpectedStart(e.target.value)} />
//                 </div>
//                 <div>
//                   <Lbl text="Expected End" />
//                   <input type="date" className={fi} value={expectedEnd} onChange={e => setExpectedEnd(e.target.value)} />
//                 </div>
//               </div>

//               {/* Line Items */}
//               <div className="border-t border-gray-200 pt-4 mt-2">
//                 <div className="flex items-center justify-between mb-3">
//                   <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
//                     {workOrderType === "customer" ? "Full BOQ Items" : "Line Items"}
//                   </p>
//                   <div className="flex gap-2">
//                     {workOrderType === "customer" ? (
//                       <span className="text-xs font-bold text-slate-500">
//                         Complete BOQ will be copied on save
//                       </span>
//                     ) : (
//                       <>
//                         <button
//                           type="button"
//                           onClick={handleGenerateFromBoq}
//                           disabled={generating || !selectedBoq}
//                           className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
//                         >
//                           <FaSync size={10} className={generating ? "animate-spin" : ""} /> Generate from BOQ
//                         </button>
//                         <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
//                           <FaPlus size={10} /> Add Row
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </div>

//                 <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
//                   <table className="w-full text-sm divide-y divide-gray-100">
//                     <thead className="bg-gray-50">
//                       <tr>
//                         <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Section</th>
//                         <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Sub‑Section</th>
//                         <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[200px]">Description</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate (₹)</th>
//                         <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount (₹)</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Transfer</th>
//                         <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100 bg-white">
//                       {items.map((item) => {
//                         const sectionOptions = boqSections;
//                         const subSectionOptions = getSubSectionOptions(item.section);
//                         return (
//                           <tr key={item._id} className="hover:bg-indigo-50/30 transition-colors">
//                             <td className="px-3 py-2">
//                               <Select
//                                 className="text-xs"
//                                 options={sectionOptions}
//                                 value={sectionOptions.find(opt => opt.value === item.section) || null}
//                                 onChange={(selected) => handleItemChange(item._id, "section", selected?.value || "")}
//                                 placeholder="Select section"
//                                 isClearable
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <Select
//                                 className="text-xs"
//                                 options={subSectionOptions}
//                                 value={subSectionOptions.find(opt => opt.value === item.subSection) || null}
//                                 onChange={(selected) => handleItemChange(item._id, "subSection", selected?.value || "")}
//                                 placeholder="Select sub‑section"
//                                 isClearable
//                                 isDisabled={!item.section}
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="text"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
//                                 value={item.description}
//                                 onChange={(e) => handleItemChange(item._id, "description", e.target.value)}
//                                 placeholder="Description..."
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="text"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.unit}
//                                 onChange={(e) => handleItemChange(item._id, "unit", e.target.value)}
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="number"
//                                 step="any"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.quantity}
//                                 onChange={(e) => handleItemChange(item._id, "quantity", e.target.value)}
//                               />
//                             </td>
//                             <td className="px-3 py-2">
//                               <input
//                                 type="number"
//                                 step="any"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.rate}
//                                 onChange={(e) => handleItemChange(item._id, "rate", e.target.value)}
//                               />
//                             </td>
//                             <td className="px-3 py-2 text-right font-bold text-gray-700">
//                               {formatCurrency(item.amount || 0)}
//                             </td>
//                             <td className="px-3 py-2 text-center">
//                               <input
//                                 type="checkbox"
//                                 checked={item.transferFromStock || false}
//                                 onChange={(e) => handleItemChange(item._id, "transferFromStock", e.target.checked)}
//                                 className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                               />
//                             </td>
//                             <td className="px-3 py-2 text-center">
//                               <button
//                                 type="button"
//                                 onClick={() => removeItemRow(item._id)}
//                                 className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
//                                 disabled={items.length === 1}
//                               >
//                                 <FaTrash size={12} />
//                               </button>
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               <div>
//                 <Lbl text="Remarks" />
//                 <textarea className={`${fi} h-16 resize-none`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Additional notes..." />
//               </div>

//               <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
//                 <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
//                 <button type="submit" className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
//                   <FaCheck size={12} /> {editWorkOrder ? "Update Work Order" : "Create Work Order"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
