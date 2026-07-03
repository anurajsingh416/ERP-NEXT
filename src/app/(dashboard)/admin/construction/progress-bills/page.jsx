"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaArrowLeft,
  FaFileInvoice,
  FaSave,
  FaPlus,
  FaTrash,
  FaCheck,
  FaExclamationTriangle,
  FaEye,
  FaPrint,
  FaList,
  FaFileAlt,
  FaTimes,
  FaSearch,
  FaEdit,
} from "react-icons/fa";
import { toast } from "react-toastify";

let idCounter = 0;
const generateId = () => ++idCounter;

const defaultItem = () => ({
  _id: generateId(),
  boqItemId: null,
  itemId: null,
  description: "",
  unit: "nos",
  rate: 0,
  boqQuantity: 0,
  billedQuantity: 0,
  amount: 0,
  source: "manual",
});

export default function ProgressBillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialWorkOrderId = searchParams.get("workOrderId");
  const initialBillId = searchParams.get("billId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [boq, setBoq] = useState(null);
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [existingBills, setExistingBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [viewMode, setViewMode] = useState("create"); // "create" | "list"
  const [allBills, setAllBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("all");
  const printRef = useRef();

  // ─── Fetch Work Orders ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchWorkOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/construction/work-orders", headers);
        const data = res.data.data || res.data || [];
        setWorkOrders(data);

        // Pre-select if initialWorkOrderId provided
        if (initialWorkOrderId) {
          const found = data.find(wo => wo._id === initialWorkOrderId);
          if (found) {
            setSelectedWorkOrder({ value: found._id, label: found.workOrderNumber });
            fetchWorkOrderDetails(found._id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch work orders:", err);
        toast.error("Failed to load work orders.");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkOrders();

    // Fetch all bills for list view
    fetchAllBills();
  }, []);

  // ─── Fetch All Bills ──────────────────────────────────────────────────
  const fetchAllBills = async () => {
    setBillsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/construction/progress-billing", headers);
      setAllBills(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch bills:", err);
    } finally {
      setBillsLoading(false);
    }
  };

  // ─── Fetch Work Order Details ──────────────────────────────────────────
  const fetchWorkOrderDetails = async (woId) => {
    if (!woId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch work order
      const woRes = await api.get(`/construction/work-orders/${woId}`, headers);
      const woData = woRes.data.data || woRes.data;
      setWorkOrder(woData);

      // Fetch BOQ details from work order's BOQ
      if (woData.boq) {
        const boqRes = await api.get(`/construction/boq?id=${woData.boq._id || woData.boq}`, headers);
        const boqData = boqRes.data.data || boqRes.data;
        setBoq(boqData);

        // Fetch existing bills for this BOQ
        const billsRes = await api.get(`/construction/progress-billing?boqId=${boqData._id}`, headers);
        const bills = billsRes.data.data || [];
        setExistingBills(bills);
        setSelectedBillId(null);
        setBill(null);

        // Build draft items from BOQ items + materials
        buildDraftItems(boqData);
      } else {
        toast.warning("This work order has no BOQ linked.");
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load work order details.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Build Draft Items ─────────────────────────────────────────────────
  const buildDraftItems = (boqData) => {
    const mappedItems = [];

    // BOQ items
    if (boqData.items && boqData.items.length) {
      boqData.items.forEach(item => {
        mappedItems.push({
          _id: generateId(),
          boqItemId: item._id,
          itemId: null,
          description: item.itemName || item.description || "",
          unit: item.unit || "nos",
          rate: item.rate || 0,
          boqQuantity: item.quantity || 0,
          billedQuantity: 0,
          amount: 0,
          source: "boq",
        });
      });
    }

    // Materials
    if (boqData.materials && boqData.materials.length) {
      boqData.materials.forEach(mat => {
        mappedItems.push({
          _id: generateId(),
          boqItemId: null,
          itemId: mat.itemId || null,
          description: mat.itemName || mat.description || "",
          unit: mat.unit || "nos",
          rate: mat.rate || 0,
          boqQuantity: mat.quantity || 0,
          billedQuantity: 0,
          amount: 0,
          source: "material",
        });
      });
    }

    setItems(mappedItems);
    setValidationErrors({});
  };

  // ─── Handle Work Order Selection ──────────────────────────────────────
  const handleWorkOrderChange = (option) => {
    setSelectedWorkOrder(option);
    if (option) {
      fetchWorkOrderDetails(option.value);
    } else {
      setWorkOrder(null);
      setBoq(null);
      setItems([]);
      setExistingBills([]);
      setSelectedBillId(null);
      setBill(null);
    }
  };

  // ─── Add Row ───────────────────────────────────────────────────────────
  const addRow = () => {
    setItems(prev => [...prev, defaultItem()]);
  };

  // ─── Remove Row ────────────────────────────────────────────────────────
  const removeRow = (id) => {
    if (items.length === 1) {
      toast.warning("Cannot remove the last item.");
      return;
    }
    setItems(prev => prev.filter(item => item._id !== id));
    const errors = { ...validationErrors };
    delete errors[id];
    setValidationErrors(errors);
  };

  // ─── Handle Item Change ───────────────────────────────────────────────
  const handleItemChange = (id, field, value) => {
    const newItems = items.map(item => {
      if (item._id !== id) return item;
      const updated = { ...item, [field]: value };

      if (field === "billedQuantity" || field === "rate") {
        const qty = parseFloat(updated.billedQuantity) || 0;
        const rate = parseFloat(updated.rate) || 0;
        updated.amount = qty * rate;

        // Validate: cannot exceed BOQ quantity
        const boqQty = updated.boqQuantity || 0;
        if (field === "billedQuantity" && boqQty > 0 && qty > boqQty) {
          setValidationErrors(prev => ({ ...prev, [id]: `Cannot exceed ${boqQty}` }));
          toast.warning(`Billed quantity cannot exceed BOQ quantity (${boqQty})`);
          return updated;
        } else {
          const errors = { ...validationErrors };
          delete errors[id];
          setValidationErrors(errors);
        }
      }
      return updated;
    });
    setItems(newItems);
  };

  // ─── Validate All Items ──────────────────────────────────────────────
  const validateItems = () => {
    const errors = {};
    let hasError = false;
    items.forEach(item => {
      const boqQty = item.boqQuantity || 0;
      const billedQty = item.billedQuantity || 0;
      if (boqQty > 0 && billedQty > boqQty) {
        errors[item._id] = `Cannot exceed ${boqQty}`;
        hasError = true;
      }
      if (!item.description || item.description.trim() === "") {
        errors[item._id] = "Description required";
        hasError = true;
      }
    });
    setValidationErrors(errors);
    return !hasError;
  };

  // ─── Save Bill ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedWorkOrder || !workOrder || !boq) {
      toast.error("Please select a work order.");
      return;
    }

    if (!validateItems()) {
      toast.error("Please fix validation errors before saving.");
      return;
    }

    const validItems = items.filter(i => i.billedQuantity > 0);
    if (validItems.length === 0) {
      toast.warning("Please enter at least one quantity > 0.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        boq: boq._id,
        project: boq.project._id,
        items: validItems.map(i => ({
          boqItemId: i.boqItemId || null,
          itemId: i.itemId || null,
          description: i.description,
          unit: i.unit,
          rate: i.rate,
          billedQuantity: i.billedQuantity,
          source: i.source || "boq",
        })),
        billDate: new Date().toISOString().split("T")[0],
        remarks: `Progress billing for BOQ ${boq.boqNumber}`,
        status: "draft",
      };

      const res = await api.post("/construction/progress-billing", payload, headers);
      toast.success("Bill created successfully!");
      // Refresh bills
      await fetchAllBills();
      // Reload to show the new bill
      router.push(`/admin/construction/progress-billing?workOrderId=${workOrder._id}&billId=${res.data.data._id}`);
      // Update existing bills
      const billsRes = await api.get(`/construction/progress-billing?boqId=${boq._id}`, headers);
      setExistingBills(billsRes.data.data || []);
      setSelectedBillId(res.data.data._id);
      setBill(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save bill.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Load Existing Bill ──────────────────────────────────────────────
  const handleBillSelect = (e) => {
    const id = e.target.value;
    if (id) {
      const found = existingBills.find(b => b._id === id);
      if (found) {
        setSelectedBillId(id);
        setBill(found);
        setItems(found.items.map(i => ({ ...i, _id: generateId(), amount: i.amount || 0 })));
        setValidationErrors({});
      }
    } else {
      // Reset to draft
      setSelectedBillId(null);
      setBill(null);
      if (boq) {
        buildDraftItems(boq);
      }
    }
  };

  // ─── Print Bill ──────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ─── View Bill in new tab ───────────────────────────────────────────
  const handleViewBill = (billId) => {
    router.push(`/admin/construction/progress-billing?workOrderId=${workOrder?._id}&billId=${billId}`);
    setViewMode("create");
  };

  // ─── Filter Bills ─────────────────────────────────────────────────────
  const filteredBills = allBills.filter(bill => {
    const matchesSearch = bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.boq?.boqNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = billStatusFilter === "all" || bill.status === billStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  const workOrderOptions = workOrders.map(wo => ({
    value: wo._id,
    label: wo.workOrderNumber + " - " + (wo.project?.name || ""),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                <FaFileInvoice className="text-indigo-600" /> Progress Billing
              </h1>
              <p className="text-sm text-gray-400">Create bills from work orders</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === "create" ? "list" : "create")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
            >
              {viewMode === "create" ? <FaList size={14} /> : <FaFileInvoice size={14} />}
              {viewMode === "create" ? "View All Bills" : "Create New Bill"}
            </button>
            {viewMode === "create" && selectedWorkOrder && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave size={14} />}
                {saving ? "Saving..." : "Create Bill"}
              </button>
            )}
          </div>
        </div>

        {/* ─── View Mode: List ─────────────────────────────────────────── */}
        {viewMode === "list" ? (
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <FaFileInvoice className="text-indigo-600" /> All Bills
                    <span className="text-xs font-normal text-gray-400 ml-2">({filteredBills.length})</span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search bills..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48 md:w-64 transition-all"
                    />
                  </div>
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={fetchAllBills}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Bill #</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">BOQ</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Items</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Total</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {billsLoading ? (
                      <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                    ) : filteredBills.length === 0 ? (
                      <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">No bills found.</td></tr>
                    ) : (
                      filteredBills.map(b => (
                        <tr key={b._id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="px-6 py-3 font-bold text-indigo-600">{b.billNumber}</td>
                          <td className="px-6 py-3 text-gray-600">{b.boq?.boqNumber || "—"}</td>
                          <td className="px-6 py-3 text-gray-700">{b.project?.name || "—"}</td>
                          <td className="px-6 py-3 text-center text-gray-500">{b.items?.length || 0}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-800">
                            {formatCurrency(b.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0)}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              b.status === "draft" ? "bg-gray-100 text-gray-600" :
                              b.status === "issued" ? "bg-blue-100 text-blue-700" :
                              b.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center text-xs text-gray-500">
                            {b.billDate ? new Date(b.billDate).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleViewBill(b._id)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                                title="View"
                              >
                                <FaEye size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  // Print logic for bill
                                  toast.info("Print functionality coming soon");
                                }}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                title="Print"
                              >
                                <FaPrint size={14} />
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
        ) : (
          /* ─── Create Mode ─────────────────────────────────────────────── */
          <>
            {/* Work Order Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Select Work Order <span className="text-red-500">*</span>
                  </label>
                  <Select
                    options={workOrderOptions}
                    value={selectedWorkOrder}
                    onChange={handleWorkOrderChange}
                    placeholder="Search work order..."
                    className="text-sm"
                    isClearable
                    isSearchable
                  />
                </div>
                {selectedWorkOrder && workOrder && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Work Order Details
                      </label>
                      <div className="text-sm text-gray-700">
                        <span className="font-bold">{workOrder.workOrderNumber}</span>
                        <span className="mx-2">·</span>
                        <span className="text-gray-500">{workOrder.project?.name || "—"}</span>
                        <span className="mx-2">·</span>
                        <span className="text-gray-500 capitalize">{workOrder.orderType || "contractor"}</span>
                        <span className="mx-2">·</span>
                        <span className="text-gray-500">
                          {workOrder.orderType === "customer"
                            ? workOrder.customer?.customerName || workOrder.customer?.name || "—"
                            : workOrder.contractor?.supplierName || workOrder.contractor?.name || "—"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedWorkOrder && boq ? (
              <>
                {/* BOQ Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">BOQ Number</p>
                      <p className="text-lg font-bold text-gray-800">{boq.boqNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project</p>
                      <p className="text-lg font-bold text-gray-800">{boq.project?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {workOrder?.orderType === "customer" ? "Customer" : "Contractor"}
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        {workOrder?.orderType === "customer"
                          ? boq.customer?.customerName || boq.customer?.name || "—"
                          : boq.contractor?.supplierName || boq.contractor?.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
                      <p className="text-lg font-bold text-gray-800">{items.length}</p>
                    </div>
                  </div>
                </div>

                {/* Existing Bills Dropdown */}
                {existingBills.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Previous Bills:</label>
                      <select
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none flex-1 max-w-xs"
                        value={selectedBillId || ""}
                        onChange={handleBillSelect}
                      >
                        <option value="">New Draft</option>
                        {existingBills.map(b => (
                          <option key={b._id} value={b._id}>
                            {b.billNumber} ({new Date(b.billDate).toLocaleDateString()}) - {b.status}
                          </option>
                        ))}
                      </select>
                      {selectedBillId && bill && (
                        <span className="text-xs font-bold text-indigo-600">Status: {bill.status}</span>
                      )}
                      {selectedBillId && (
                        <button
                          onClick={handlePrint}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all"
                        >
                          <FaPrint size={12} /> Print
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Items Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                      <FaFileInvoice className="text-indigo-600" /> Bill Items
                      <span className="text-xs font-normal text-gray-400 ml-2">({items.length})</span>
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700">
                        Total: <span className="text-indigo-700">{formatCurrency(total)}</span>
                      </span>
                      <button
                        onClick={addRow}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
                      >
                        <FaPlus size={10} /> Add Row
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-sm border-collapse" ref={printRef}>
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Item</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate (₹)</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">BOQ Qty</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Billed Qty</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount (₹)</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Source</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item, idx) => {
                          const hasError = validationErrors[item._id];
                          return (
                            <tr key={item._id} className="hover:bg-indigo-50/20">
                              <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3 text-xs text-gray-700">
                                <input
                                  type="text"
                                  className={`w-full min-w-[150px] px-2 py-1 border rounded text-xs bg-gray-50 focus:outline-none ${
                                    hasError ? "border-red-400 focus:ring-red-500" : "border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                  }`}
                                  value={item.description}
                                  onChange={(e) => handleItemChange(item._id, "description", e.target.value)}
                                  placeholder="Description..."
                                />
                                {hasError && (
                                  <span className="block text-red-500 text-[9px] mt-0.5">
                                    <FaExclamationTriangle className="inline mr-0.5" size={10} />
                                    {validationErrors[item._id]}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="text"
                                  className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                  value={item.unit}
                                  onChange={(e) => handleItemChange(item._id, "unit", e.target.value)}
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                  value={item.rate}
                                  onChange={(e) => handleItemChange(item._id, "rate", e.target.value)}
                                />
                              </td>
                              <td className="px-4 py-3 text-center text-xs text-gray-500">{item.boqQuantity || 0}</td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className={`w-20 px-2 py-1 border rounded text-xs bg-gray-50 focus:outline-none text-center ${
                                    hasError ? "border-red-400 focus:ring-red-500" : "border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                  }`}
                                  value={item.billedQuantity}
                                  onChange={(e) => handleItemChange(item._id, "billedQuantity", e.target.value)}
                                />
                              </td>
                              <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="px-4 py-3 text-center text-xs">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                  item.source === "material" ? "bg-blue-100 text-blue-700" :
                                  item.source === "manual" ? "bg-orange-100 text-orange-700" :
                                  "bg-indigo-100 text-indigo-700"
                                }`}>
                                  {item.source === "material" ? "Material" :
                                   item.source === "manual" ? "Manual" : "BOQ"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeRow(item._id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Remove row"
                                  disabled={items.length === 1}
                                >
                                  <FaTrash size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan="9" className="px-4 py-6 text-center text-gray-400 italic">No items. Click "Add Row" to add items.</td>
                          </tr>
                        )}
                        {items.length > 0 && (
                          <tr className="bg-gray-50 font-bold">
                            <td colSpan="6" className="px-4 py-3 text-right text-xs text-gray-700 uppercase tracking-wider">
                              Grand Total
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-indigo-700">
                              {formatCurrency(total)}
                            </td>
                            <td colSpan="2"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <FaFileInvoice className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700">Select a Work Order</h3>
                <p className="text-sm text-gray-400">Choose a work order from the dropdown above to start billing.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Print Styles ────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 40px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}