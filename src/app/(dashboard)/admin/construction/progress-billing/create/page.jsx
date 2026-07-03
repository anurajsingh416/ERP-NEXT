"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  FaBuilding,
  FaUser,
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

export default function ProgressBillCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkOrderId = searchParams.get("workOrderId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

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

        if (initialWorkOrderId) {
          const found = data.find(wo => wo._id === initialWorkOrderId);
          if (found) {
            setSelectedWorkOrder({ value: found._id, label: found.workOrderNumber });
            await fetchWorkOrderDetails(found._id);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load work orders.");
        setLoading(false);
      }
    };
    fetchWorkOrders();
  }, []);

  const fetchWorkOrderDetails = async (woId) => {
    if (!woId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const woRes = await api.get(`/construction/work-orders/${woId}`, headers);
      const woData = woRes.data.data || woRes.data;
      setWorkOrder(woData);
      buildDraftItemsFromWorkOrder(woData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load work order details.");
    } finally {
      setLoading(false);
    }
  };

  const buildDraftItemsFromWorkOrder = (woData) => {
    const mappedItems = [];
    if (woData.items) {
      woData.items.forEach(item => {
        mappedItems.push({
          _id: generateId(),
          boqItemId: item.boqItemId || null,
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
    if (woData.materials) {
      woData.materials.forEach(mat => {
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

  const handleWorkOrderChange = async (option) => {
    setSelectedWorkOrder(option);
    if (option) {
      await fetchWorkOrderDetails(option.value);
    } else {
      setWorkOrder(null);
      setItems([]);
    }
  };

  const addRow = () => setItems(prev => [...prev, defaultItem()]);
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

  const handleItemChange = (id, field, value) => {
    const newItems = items.map(item => {
      if (item._id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "billedQuantity" || field === "rate") {
        const qty = parseFloat(updated.billedQuantity) || 0;
        const rate = parseFloat(updated.rate) || 0;
        updated.amount = qty * rate;
        const boqQty = updated.boqQuantity || 0;
        if (field === "billedQuantity" && boqQty > 0 && qty > boqQty) {
          setValidationErrors(prev => ({ ...prev, [id]: `Cannot exceed ${boqQty}` }));
          toast.warning(`Cannot exceed BOQ quantity (${boqQty})`);
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

  const handleSave = async () => {
    if (!selectedWorkOrder || !workOrder) {
      toast.error("Please select a work order.");
      return;
    }
    if (!validateItems()) {
      toast.error("Please fix validation errors before saving.");
      return;
    }
    const validItems = items.filter(i => i.billedQuantity > 0);
    if (validItems.length === 0) {
      toast.warning("Enter at least one quantity > 0.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        workOrderId: workOrder._id,
        boq: workOrder.boq?._id || workOrder.boq || null,
        project: workOrder.project?._id || workOrder.project || null,
        orderType: workOrder.orderType || "contractor",
        contractor: workOrder.contractor?._id || workOrder.contractor || null,
        customer: workOrder.customer?._id || workOrder.customer || null,
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
        remarks: `Progress billing for WO ${workOrder.workOrderNumber}`,
        status: "draft",
      };

      const res = await api.post("/construction/progress-billing", payload, headers);
      toast.success("Bill created!");
      router.push(`/admin/construction/progress-billing/${res.data.data._id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save bill.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  const workOrderOptions = workOrders.map(wo => ({
    value: wo._id,
    label: `${wo.workOrderNumber} - ${wo.project?.name || ""} (${wo.orderType || "contractor"})`,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-all border border-gray-200"
          >
            <FaArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> Create Progress Bill
            </h1>
            <p className="text-sm text-gray-500">Create a new bill from a work order</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
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
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#e2e8f0',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#6366f1' },
                    minHeight: '42px',
                  }),
                }}
              />
            </div>
            {selectedWorkOrder && workOrder && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Work Order Details
                </label>
                <div className="flex flex-wrap items-center gap-3 text-sm bg-gray-50 p-3 rounded-xl">
                  <span className="font-bold text-indigo-600">{workOrder.workOrderNumber}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-600">{workOrder.project?.name || "—"}</span>
                  <span className="text-gray-300">|</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    workOrder.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
                  }`}>
                    {workOrder.orderType || "contractor"}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-600 flex items-center gap-1">
                    {workOrder.orderType === "customer" ? <FaUser size={12} /> : <FaBuilding size={12} />}
                    {workOrder.orderType === "customer"
                      ? workOrder.customer?.customerName || workOrder.customer?.name || "—"
                      : workOrder.contractor?.supplierName || workOrder.contractor?.name || "—"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedWorkOrder && workOrder ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FaFileInvoice className="text-indigo-600" />
                  <h2 className="font-bold text-gray-800">Bill Items</h2>
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">
                    Total: <span className="text-indigo-700">{formatCurrency(total)}</span>
                  </span>
                  <button
                    onClick={addRow}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <FaPlus size={10} /> Add Row
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto p-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">#</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Item</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Unit</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Rate (₹)</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">WO Qty</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Billed Qty</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount (₹)</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Source</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => {
                      const hasError = validationErrors[item._id];
                      return (
                        <tr key={item._id} className="hover:bg-indigo-50/20 transition-all">
                          <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className={`w-full min-w-[150px] px-2 py-1 border rounded text-xs bg-white focus:outline-none ${
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
                              className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
                              value={item.unit}
                              onChange={(e) => handleItemChange(item._id, "unit", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
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
                              className={`w-20 px-2 py-1 border rounded text-xs bg-white focus:outline-none text-center ${
                                hasError ? "border-red-400 focus:ring-red-500" : "border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                              }`}
                              value={item.billedQuantity}
                              onChange={(e) => handleItemChange(item._id, "billedQuantity", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
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
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
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
                        <td colSpan="9" className="px-4 py-6 text-center text-gray-400 italic">No items. Click "Add Row".</td>
                      </tr>
                    )}
                    {items.length > 0 && (
                      <tr className="bg-indigo-50/50 font-bold">
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
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave size={14} />}
                {saving ? "Saving..." : "Create Bill"}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaFileInvoice className="text-4xl text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">Select a Work Order</h3>
            <p className="text-sm text-gray-400">Choose a work order from the dropdown above to start billing.</p>
          </div>
        )}
      </div>
    </div>
  );
}