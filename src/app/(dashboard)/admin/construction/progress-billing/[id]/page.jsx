"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
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
  FaEdit,
  FaMoneyBillWave,
  FaBuilding,
  FaUser,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-toastify";  // ✅ correct import

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

export default function ProgressBillDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [editingBill, setEditingBill] = useState(isEditMode);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    const loadBill = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/construction/progress-billing/${id}`, headers);
        const billData = res.data.data || res.data;
        setBill(billData);
        setItems(billData.items.map(i => ({ ...i, _id: generateId(), amount: i.amount || 0 })));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load bill.");
      } finally {
        setLoading(false);
      }
    };
    loadBill();
  }, [id]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  // ─── Item Handlers ────────────────────────────────────────────────────
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

  // ─── Save Bill ─────────────────────────────────────────────────────────
  const handleSave = async () => {
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
        id: bill._id,
        status: bill.status,
        remarks: bill.remarks,
        billDate: bill.billDate,
        items: validItems.map(i => ({
          boqItemId: i.boqItemId || null,
          itemId: i.itemId || null,
          description: i.description,
          unit: i.unit,
          rate: i.rate,
          billedQuantity: i.billedQuantity,
          source: i.source || "boq",
        })),
      };

      const res = await api.put("/construction/progress-billing", payload, headers);
      const updatedBill = res.data.data;
      setBill(updatedBill);
      setItems(updatedBill.items.map(i => ({ ...i, _id: generateId(), amount: i.amount || 0 })));
      toast.success("Bill updated!");
      setEditingBill(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update bill.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Bill ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/progress-billing/${id}`, headers);
      toast.success("Bill deleted.");
      router.push("/admin/construction/progress-billing");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete bill.");
    }
  };

  // ─── Payment ──────────────────────────────────────────────────────────
  const openPaymentModal = () => {
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentRef("");
    setPaymentNote("");
    setIsPaymentModalOpen(true);
  };

  const recordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!bill) return;
    const remaining = bill.remainingAmount || 0;
    if (amount > remaining) {
      toast.error(`Amount cannot exceed remaining balance (${formatCurrency(remaining)})`);
      return;
    }

    setRecordingPayment(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        amount,
        date: paymentDate,
        method: paymentMethod,
        reference: paymentRef,
        note: paymentNote,
      };
      const res = await api.post(`/construction/progress-billing/${bill._id}/payments`, payload, headers);
      const updatedBill = res.data.data;
      setBill(updatedBill);
      toast.success("Payment recorded!");
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setRecordingPayment(false);
    }
  };

  // ─── Print ─────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ─── Payment Progress ──────────────────────────────────────────────────
  const getPaymentProgress = () => {
    if (!bill) return 0;
    const totalBill = bill.total || 0;
    if (totalBill === 0) return 0;
    const paid = bill.paidAmount || 0;
    return Math.min((paid / totalBill) * 100, 100);
  };

  const getPartyName = () => {
    if (!bill) return "—";
    if (bill.orderType === "customer") {
      return bill.customer?.customerName || bill.customer?.name || "—";
    }
    return bill.contractor?.supplierName || bill.contractor?.name || "—";
  };

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

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">Bill not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 no-print">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2.5 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-all border border-gray-200"
            >
              <FaArrowLeft size={18} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                <FaFileInvoice className="text-indigo-600" /> {bill.billNumber}
              </h1>
              <p className="text-sm text-gray-500">
                {bill.project?.name} · {bill.workOrder?.workOrderNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            {!editingBill && (
              <button
                onClick={() => setEditingBill(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md"
              >
                <FaEdit size={14} /> Edit
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50"
            >
              <FaPrint size={14} /> Print
            </button>
            {bill.status !== "paid" && (
              <button
                onClick={openPaymentModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md"
              >
                <FaMoneyBillWave size={14} /> Record Payment
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-md"
            >
              <FaTrash size={14} /> Delete
            </button>
          </div>
        </div>

        {/* Bill Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  bill.status === "draft" ? "bg-gray-100 text-gray-600" :
                  bill.status === "issued" ? "bg-blue-100 text-blue-700" :
                  bill.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {bill.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</p>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                  bill.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
                }`}>
                  {bill.orderType === "customer" ? "Customer" : "Contractor"}
                </span>
                <span className="text-sm font-medium text-gray-700 ml-2">{getPartyName()}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</p>
                <p className="text-sm font-medium text-gray-700">{new Date(bill.billDate).toLocaleDateString("en-GB")}</p>
              </div>
              {bill.remarks && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</p>
                  <p className="text-sm font-medium text-gray-700">{bill.remarks}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(bill.total || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paid</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(bill.paidAmount || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</p>
                <p className="text-xl font-bold text-indigo-600">{formatCurrency(bill.remainingAmount || 0)}</p>
              </div>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Payment Progress</span>
              <span className="font-bold text-indigo-600">{getPaymentProgress().toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getPaymentProgress()}%` }}
              ></div>
            </div>
          </div>

          {/* Payment History */}
          {bill.payments && bill.payments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment History</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Date</th>
                      <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Method</th>
                      <th className="px-3 py-1.5 text-right text-[9px] font-bold uppercase text-gray-500">Amount</th>
                      <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Ref</th>
                      <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.payments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5">{new Date(p.date).toLocaleDateString("en-GB")}</td>
                        <td className="px-3 py-1.5 capitalize">{p.method}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                        <td className="px-3 py-1.5">{p.reference || "—"}</td>
                        <td className="px-3 py-1.5">{p.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div id="print-area" className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" />
              <h2 className="font-bold text-gray-800">Bill Items</h2>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="flex items-center gap-3 no-print">
              <span className="text-sm font-bold text-gray-700">
                Total: <span className="text-indigo-700">{formatCurrency(total)}</span>
              </span>
              {editingBill && (
                <button
                  onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <FaPlus size={10} /> Add Row
                </button>
              )}
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
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount (₹)</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Source</th>
                  {editingBill && <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const hasError = validationErrors[item._id];
                  return (
                    <tr key={item._id} className="hover:bg-indigo-50/20 transition-all">
                      <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {editingBill ? (
                          <>
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
                          </>
                        ) : (
                          <span className="text-xs text-gray-700">{item.description}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingBill ? (
                          <input
                            type="text"
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
                            value={item.unit}
                            onChange={(e) => handleItemChange(item._id, "unit", e.target.value)}
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{item.unit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingBill ? (
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item._id, "rate", e.target.value)}
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{item.rate}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingBill ? (
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
                        ) : (
                          <span className="text-xs text-gray-700">{item.billedQuantity}</span>
                        )}
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
                      {editingBill && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeRow(item._id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                            disabled={items.length === 1}
                          >
                            <FaTrash size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={editingBill ? 8 : 7} className="px-4 py-6 text-center text-gray-400 italic">
                      No items. {editingBill ? 'Click "Add Row".' : ''}
                    </td>
                  </tr>
                )}
                {items.length > 0 && (
                  <tr className="bg-indigo-50/50 font-bold">
                    <td colSpan={editingBill ? 4 : 4} className="px-4 py-3 text-right text-xs text-gray-700 uppercase tracking-wider">
                      Grand Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-indigo-700">
                      {formatCurrency(total)}
                    </td>
                    <td colSpan={editingBill ? 2 : 2}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingBill && (
          <div className="flex justify-end gap-3 mt-4 no-print">
            <button
              onClick={() => {
                setEditingBill(false);
                // Reset items to original bill items
                if (bill) {
                  setItems(bill.items.map(i => ({ ...i, _id: generateId(), amount: i.amount || 0 })));
                }
              }}
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
              {saving ? "Saving..." : "Update Bill"}
            </button>
          </div>
        )}
      </div>

      {/* ─── Payment Modal ──────────────────────────────────────────────── */}
      {isPaymentModalOpen && bill && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <FaMoneyBillWave className="text-blue-600" /> Record Payment
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FaTimes size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">Remaining balance: {formatCurrency(bill.remainingAmount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Method</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reference (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Cheque/ref number"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Note (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Any note"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={recordPayment}
                  disabled={recordingPayment}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md"
                >
                  {recordingPayment ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaCheck size={14} />}
                  {recordingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Print Styles ────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            background: white; 
            padding: 20px; 
          }
          .no-print { display: none !important; }
          #print-area table { width: 100%; border-collapse: collapse; }
          #print-area th, #print-area td { border: 1px solid #ddd; padding: 8px; }
          #print-area .bg-indigo-50\\/50 { background: #f8fafc !important; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}