"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaFileInvoice,
  FaEye,
  FaEdit,
  FaPrint,
  FaTrash,
  FaSearch,
  FaPlus,
  FaMoneyBillWave,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ProgressBillingListPage() {
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchBills = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/construction/progress-billing", headers);
      setBills(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/progress-billing/${id}`, headers);
      toast.success("Bill deleted.");
      fetchBills();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete bill.");
    }
  };

  const handlePrint = (bill) => {
    // Open print view in new tab
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Bill ${bill.billNumber}</title></head>
          <body>
            <h1>${bill.billNumber}</h1>
            <p>Project: ${bill.project?.name}</p>
            <p>WO: ${bill.workOrder?.workOrderNumber}</p>
            <table border="1" cellpadding="5">
              <thead><tr><th>Item</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                ${bill.items?.map(i => `
                  <tr>
                    <td>${i.description}</td>
                    <td>${i.unit}</td>
                    <td>${i.billedQuantity}</td>
                    <td>${i.rate}</td>
                    <td>${formatCurrency(i.amount)}</td>
                  </tr>
                `).join("")}
              </tbody>
              <tfoot>
                <tr><td colspan="4" align="right">Total</td><td>${formatCurrency(bill.total)}</td></tr>
              </tfoot>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredBills = bills.filter(bill => {
    const search = bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   bill.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   bill.workOrder?.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = statusFilter === "all" || bill.status === statusFilter;
    return search && status;
  });

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> Progress Bills
            </h1>
            <p className="text-sm text-gray-500">Manage all progress bills</p>
          </div>
          <button
            onClick={() => router.push("/admin/construction/progress-billing/create")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md"
          >
            <FaPlus size={14} /> Create Bill
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" />
              <h2 className="font-bold text-gray-800">All Bills</h2>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredBills.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-48 md:w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={fetchBills}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Bill #</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">WO #</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Project</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Party</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Items</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Total</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Paid</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Balance</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : filteredBills.length === 0 ? (
                  <tr><td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">No bills found.</td></tr>
                ) : (
                  filteredBills.map(b => {
                    const partyName = b.orderType === "customer"
                      ? b.customer?.customerName || b.customer?.name || "—"
                      : b.contractor?.supplierName || b.contractor?.name || "—";
                    return (
                      <tr key={b._id} className="hover:bg-indigo-50/30 transition-all">
                        <td className="px-6 py-3 font-bold text-indigo-600">{b.billNumber}</td>
                        <td className="px-6 py-3 text-gray-700 font-medium">{b.workOrder?.workOrderNumber || "—"}</td>
                        <td className="px-6 py-3 text-gray-600">{b.project?.name || "—"}</td>
                        <td className="px-6 py-3">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            b.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {b.orderType === "customer" ? "Customer" : "Contractor"}
                          </span>
                          <span className="text-xs text-gray-400 block">{partyName}</span>
                        </td>
                        <td className="px-6 py-3 text-center text-gray-500">{b.items?.length || 0}</td>
                        <td className="px-6 py-3 text-right font-bold text-gray-800">{formatCurrency(b.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0)}</td>
                        <td className="px-6 py-3 text-right text-emerald-600 font-bold">{formatCurrency(b.paidAmount || 0)}</td>
                        <td className="px-6 py-3 text-right font-bold text-gray-800">{formatCurrency(b.remainingAmount || 0)}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            b.status === "draft" ? "bg-gray-100 text-gray-600" :
                            b.status === "issued" ? "bg-blue-100 text-blue-700" :
                            b.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => router.push(`/admin/construction/progress-billing/${b._id}`)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                              title="View"
                            >
                              <FaEye size={14} />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/construction/progress-billing/${b._id}?edit=true`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                              title="Edit"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={() => handlePrint(b)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                              title="Print"
                            >
                              <FaPrint size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(b._id)}
                              className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                              title="Delete"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



// "use client";

// import { useEffect, useState, useRef } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import api from "@/lib/api";
// import Select from "react-select";
// import {
//   FaArrowLeft,
//   FaFileInvoice,
//   FaSave,
//   FaPlus,
//   FaTrash,
//   FaCheck,
//   FaExclamationTriangle,
//   FaEye,
//   FaPrint,
//   FaList,
//   FaTimes,
//   FaSearch,
//   FaEdit,
//   FaMoneyBillWave,
//   FaBuilding,
//   FaUser,
//   FaBoxes,
// } from "react-icons/fa";
// import { toast } from "react-toastify";

// let idCounter = 0;
// const generateId = () => ++idCounter;

// const defaultItem = () => ({
//   _id: generateId(),
//   boqItemId: null,
//   itemId: null,
//   description: "",
//   unit: "nos",
//   rate: 0,
//   boqQuantity: 0,
//   billedQuantity: 0,
//   amount: 0,
//   source: "manual",
// });

// export default function ProgressBillingPage() {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   // ─── Read params ──────────────────────────────────────────────────────
//   const initialWorkOrderId = searchParams.get("workOrderId");
//   const initialBillId = searchParams.get("billId");

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [workOrders, setWorkOrders] = useState([]);
//   const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
//   const [workOrder, setWorkOrder] = useState(null);
//   const [bill, setBill] = useState(null);
//   const [items, setItems] = useState([]);
//   const [existingBills, setExistingBills] = useState([]);
//   const [selectedBillId, setSelectedBillId] = useState(null);
//   const [validationErrors, setValidationErrors] = useState({});
//   const [viewMode, setViewMode] = useState("list");
//   const [allBills, setAllBills] = useState([]);
//   const [billsLoading, setBillsLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [billStatusFilter, setBillStatusFilter] = useState("all");
//   const [editingBill, setEditingBill] = useState(false);

//   // Payment Modal
//   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
//   const [paymentAmount, setPaymentAmount] = useState("");
//   const [paymentMethod, setPaymentMethod] = useState("cash");
//   const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
//   const [paymentRef, setPaymentRef] = useState("");
//   const [paymentNote, setPaymentNote] = useState("");
//   const [recordingPayment, setRecordingPayment] = useState(false);
//   const [selectedPaymentBill, setSelectedPaymentBill] = useState(null);

//   const printRef = useRef();

//   // ─── Fetch Work Orders ──────────────────────────────────────────────────
//   useEffect(() => {
//     const fetchWorkOrders = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/login");
//           return;
//         }
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const res = await api.get("/construction/work-orders", headers);
//         setWorkOrders(res.data.data || res.data || []);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load work orders.");
//       }
//     };
//     fetchWorkOrders();
//     fetchAllBills();
//   }, []);

//   // ─── Fetch All Bills ──────────────────────────────────────────────────
//   const fetchAllBills = async () => {
//     setBillsLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return;
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const res = await api.get("/construction/progress-billing", headers);
//       setAllBills(res.data.data || []);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setBillsLoading(false);
//     }
//   };

//   // ─── Load Bill ──────────────────────────────────────────────────────────
//   const loadBill = async (billId) => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const res = await api.get(`/construction/progress-billing/${billId}`, headers);
//       const billData = res.data.data || res.data;
//       setBill(billData);
//       setItems(billData.items.map(i => ({ ...i, _id: generateId(), amount: i.amount || 0 })));
//       setSelectedBillId(billData._id);
//       setEditingBill(true);
//       if (billData.workOrder) {
//         const wo = workOrders.find(w => w._id === billData.workOrder._id);
//         if (wo) {
//           setSelectedWorkOrder({ value: wo._id, label: wo.workOrderNumber });
//           setWorkOrder(wo);
//         }
//       }
//       setViewMode("create");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load bill.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ─── Fetch Work Order Details ──────────────────────────────────────────
//   const fetchWorkOrderDetails = async (woId) => {
//     if (!woId) return;
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const woRes = await api.get(`/construction/work-orders/${woId}`, headers);
//       const woData = woRes.data.data || woRes.data;
//       setWorkOrder(woData);
//       if (!editingBill) {
//         buildDraftItemsFromWorkOrder(woData);
//       }

//       const billsRes = await api.get(`/construction/progress-billing?workOrderId=${woId}`, headers);
//       setExistingBills(billsRes.data.data || []);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load work order details.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ─── Build Draft Items ────────────────────────────────────────────────
//   const buildDraftItemsFromWorkOrder = (woData) => {
//     const mappedItems = [];
//     if (woData.items) {
//       woData.items.forEach(item => {
//         mappedItems.push({
//           _id: generateId(),
//           boqItemId: item.boqItemId || null,
//           itemId: null,
//           description: item.itemName || item.description || "",
//           unit: item.unit || "nos",
//           rate: item.rate || 0,
//           boqQuantity: item.quantity || 0,
//           billedQuantity: 0,
//           amount: 0,
//           source: "boq",
//         });
//       });
//     }
//     if (woData.materials) {
//       woData.materials.forEach(mat => {
//         mappedItems.push({
//           _id: generateId(),
//           boqItemId: null,
//           itemId: mat.itemId || null,
//           description: mat.itemName || mat.description || "",
//           unit: mat.unit || "nos",
//           rate: mat.rate || 0,
//           boqQuantity: mat.quantity || 0,
//           billedQuantity: 0,
//           amount: 0,
//           source: "material",
//         });
//       });
//     }
//     setItems(mappedItems);
//     setValidationErrors({});
//   };

//   // ─── Handle Work Order Selection ──────────────────────────────────────
//   const handleWorkOrderChange = async (option) => {
//     setSelectedWorkOrder(option);
//     setEditingBill(false);
//     setBill(null);
//     setSelectedBillId(null);
//     if (option) {
//       await fetchWorkOrderDetails(option.value);
//     } else {
//       setWorkOrder(null);
//       setItems([]);
//       setExistingBills([]);
//     }
//   };

//   // ─── Add / Remove Row ────────────────────────────────────────────────
//   const addRow = () => setItems(prev => [...prev, defaultItem()]);
//   const removeRow = (id) => {
//     if (items.length === 1) {
//       toast.warning("Cannot remove the last item.");
//       return;
//     }
//     setItems(prev => prev.filter(item => item._id !== id));
//     const errors = { ...validationErrors };
//     delete errors[id];
//     setValidationErrors(errors);
//   };

//   // ─── Item Change Handler ──────────────────────────────────────────────
//   const handleItemChange = (id, field, value) => {
//     const newItems = items.map(item => {
//       if (item._id !== id) return item;
//       const updated = { ...item, [field]: value };
//       if (field === "billedQuantity" || field === "rate") {
//         const qty = parseFloat(updated.billedQuantity) || 0;
//         const rate = parseFloat(updated.rate) || 0;
//         updated.amount = qty * rate;
//         const boqQty = updated.boqQuantity || 0;
//         if (field === "billedQuantity" && boqQty > 0 && qty > boqQty) {
//           setValidationErrors(prev => ({ ...prev, [id]: `Cannot exceed ${boqQty}` }));
//           toast.warning(`Cannot exceed BOQ quantity (${boqQty})`);
//           return updated;
//         } else {
//           const errors = { ...validationErrors };
//           delete errors[id];
//           setValidationErrors(errors);
//         }
//       }
//       return updated;
//     });
//     setItems(newItems);
//   };

//   // ─── Validate ─────────────────────────────────────────────────────────
//   const validateItems = () => {
//     const errors = {};
//     let hasError = false;
//     items.forEach(item => {
//       const boqQty = item.boqQuantity || 0;
//       const billedQty = item.billedQuantity || 0;
//       if (boqQty > 0 && billedQty > boqQty) {
//         errors[item._id] = `Cannot exceed ${boqQty}`;
//         hasError = true;
//       }
//       if (!item.description || item.description.trim() === "") {
//         errors[item._id] = "Description required";
//         hasError = true;
//       }
//     });
//     setValidationErrors(errors);
//     return !hasError;
//   };

//   // ─── Save Bill ─────────────────────────────────────────────────────────
//   const handleSave = async () => {
//     if (!selectedWorkOrder || !workOrder) {
//       toast.error("Please select a work order.");
//       return;
//     }
//     if (!validateItems()) {
//       toast.error("Please fix validation errors before saving.");
//       return;
//     }
//     const validItems = items.filter(i => i.billedQuantity > 0);
//     if (validItems.length === 0) {
//       toast.warning("Enter at least one quantity > 0.");
//       return;
//     }

//     setSaving(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };

//       const payload = {
//         workOrderId: workOrder._id,
//         boq: workOrder.boq?._id || workOrder.boq || null,
//         project: workOrder.project?._id || workOrder.project || null,
//         orderType: workOrder.orderType || "contractor",
//         contractor: workOrder.contractor?._id || workOrder.contractor || null,
//         customer: workOrder.customer?._id || workOrder.customer || null,
//         items: validItems.map(i => ({
//           boqItemId: i.boqItemId || null,
//           itemId: i.itemId || null,
//           description: i.description,
//           unit: i.unit,
//           rate: i.rate,
//           billedQuantity: i.billedQuantity,
//           source: i.source || "boq",
//         })),
//         billDate: new Date().toISOString().split("T")[0],
//         remarks: `Progress billing for WO ${workOrder.workOrderNumber}`,
//         status: "draft",
//       };

//       let res;
//       if (editingBill && bill) {
//         payload.id = bill._id;
//         res = await api.put("/construction/progress-billing", payload, headers);
//         toast.success("Bill updated!");
//       } else {
//         res = await api.post("/construction/progress-billing", payload, headers);
//         toast.success("Bill created!");
//       }

//       const newBill = res.data.data;
//       await fetchAllBills();
//       // Update URL to reflect the new/edited bill
//       router.push(`/admin/construction/progress-billing?billId=${newBill._id}`);
//       // Reload the bill to get updated data
//       await loadBill(newBill._id);
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to save bill.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ─── Edit Bill ──────────────────────────────────────────────────────────
//   const handleEditBill = (billId) => {
//     router.push(`/admin/construction/progress-billing?billId=${billId}`);
//   };

//   // ─── Delete Bill ──────────────────────────────────────────────────────────
//   const handleDeleteBill = async (billId) => {
//     if (!confirm("Are you sure you want to delete this bill? This action cannot be undone.")) return;
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       await api.delete(`/construction/progress-billing/${billId}`, headers);
//       toast.success("Bill deleted.");
//       await fetchAllBills();
//       if (billId === selectedBillId) {
//         setSelectedBillId(null);
//         setBill(null);
//         setItems([]);
//         setEditingBill(false);
//         setViewMode("list");
//         // Clear URL params
//         router.push("/admin/construction/progress-billing");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to delete bill.");
//     }
//   };

//   // ─── Load Existing Bill (from dropdown) ──────────────────────────────
//   const handleBillSelect = async (e) => {
//     const id = e.target.value;
//     if (id) {
//       await loadBill(id);
//     } else {
//       setSelectedBillId(null);
//       setBill(null);
//       setEditingBill(false);
//       if (workOrder) buildDraftItemsFromWorkOrder(workOrder);
//     }
//   };

//   // ─── Payment Functions ─────────────────────────────────────────────────
//   const openPaymentModal = (billData) => {
//     setSelectedPaymentBill(billData);
//     setPaymentAmount("");
//     setPaymentMethod("cash");
//     setPaymentDate(new Date().toISOString().split("T")[0]);
//     setPaymentRef("");
//     setPaymentNote("");
//     setIsPaymentModalOpen(true);
//   };

//   const recordPayment = async () => {
//     const amount = parseFloat(paymentAmount);
//     if (!amount || amount <= 0) {
//       toast.error("Please enter a valid amount.");
//       return;
//     }
//     if (!selectedPaymentBill) return;
//     const remaining = selectedPaymentBill.remainingAmount || 0;
//     if (amount > remaining) {
//       toast.error(`Amount cannot exceed remaining balance (${formatCurrency(remaining)})`);
//       return;
//     }

//     setRecordingPayment(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const payload = {
//         amount,
//         date: paymentDate,
//         method: paymentMethod,
//         reference: paymentRef,
//         note: paymentNote,
//       };
//       const res = await api.post(`/construction/progress-billing/${selectedPaymentBill._id}/payments`, payload, headers);
//       const updatedBill = res.data.data;

//       if (bill && bill._id === updatedBill._id) {
//         setBill(updatedBill);
//       }
//       setExistingBills(prev => prev.map(b => b._id === updatedBill._id ? updatedBill : b));
//       await fetchAllBills();
//       toast.success("Payment recorded!");
//       setIsPaymentModalOpen(false);
//       setSelectedPaymentBill(null);
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to record payment.");
//     } finally {
//       setRecordingPayment(false);
//     }
//   };

//   // ─── Print ─────────────────────────────────────────────────────────────
//   const handlePrint = () => window.print();

//   // ─── View Bill ────────────────────────────────────────────────────────
//   const handleViewBill = (billId) => {
//     router.push(`/admin/construction/progress-billing?billId=${billId}`);
//   };

//   // ─── Filter Bills ─────────────────────────────────────────────────────
//   const filteredBills = allBills.filter(bill => {
//     const search = bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                    bill.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                    bill.workOrder?.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
//     const status = billStatusFilter === "all" || bill.status === billStatusFilter;
//     return search && status;
//   });

//   const formatCurrency = (num) =>
//     new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

//   const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);

//   const workOrderOptions = workOrders.map(wo => ({
//     value: wo._id,
//     label: `${wo.workOrderNumber} - ${wo.project?.name || ""} (${wo.orderType || "contractor"})`,
//   }));

//   // ─── Payment progress ──────────────────────────────────────────────────
//   const getPaymentProgress = (billData) => {
//     if (!billData) return 0;
//     const totalBill = billData.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0;
//     if (totalBill === 0) return 0;
//     const paid = billData.paidAmount || 0;
//     return Math.min((paid / totalBill) * 100, 100);
//   };

//   // ─── Handle URL params on mount and when they change ────────────────
//   useEffect(() => {
//     const handleParams = async () => {
//       const woId = searchParams.get("workOrderId");
//       const billId = searchParams.get("billId");

//       if (billId) {
//         await loadBill(billId);
//         setViewMode("create");
//         setEditingBill(true);
//       } else if (woId) {
//         const found = workOrders.find(wo => wo._id === woId);
//         if (found) {
//           setSelectedWorkOrder({ value: found._id, label: found.workOrderNumber });
//           await fetchWorkOrderDetails(found._id);
//           setViewMode("create");
//           setEditingBill(false);
//         }
//       } else {
//         setViewMode("list");
//         setEditingBill(false);
//         setBill(null);
//         setItems([]);
//         setSelectedWorkOrder(null);
//         setWorkOrder(null);
//       }
//     };
//     handleParams();
//   }, [searchParams, workOrders]);

//   // ─── Early exit while loading ────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-gray-500">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // ─── Render ────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-6 no-print">
//           <div className="flex items-center gap-4">
//             <button
//               onClick={() => router.back()}
//               className="p-2.5 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-all border border-gray-200"
//             >
//               <FaArrowLeft size={18} className="text-gray-600" />
//             </button>
//             <div>
//               <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//                 <FaFileInvoice className="text-indigo-600" /> Progress Billing
//               </h1>
//               <p className="text-sm text-gray-500">Manage bills from work orders</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => {
//                 if (viewMode === "create") {
//                   setViewMode("list");
//                   setEditingBill(false);
//                   setBill(null);
//                   setItems([]);
//                   setSelectedWorkOrder(null);
//                   setWorkOrder(null);
//                   router.push("/admin/construction/progress-billing");
//                 } else {
//                   setViewMode("create");
//                   setSelectedWorkOrder(null);
//                   setWorkOrder(null);
//                   setItems([]);
//                   setBill(null);
//                   setSelectedBillId(null);
//                   setEditingBill(false);
//                 }
//               }}
//               className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
//                 viewMode === "create"
//                   ? "border border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
//                   : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
//               }`}
//             >
//               {viewMode === "create" ? <FaList size={14} /> : <FaFileInvoice size={14} />}
//               {viewMode === "create" ? "View All Bills" : "New Bill"}
//             </button>
//             {viewMode === "list" && (
//               <button
//                 onClick={() => {
//                   setViewMode("create");
//                   setSelectedWorkOrder(null);
//                   setWorkOrder(null);
//                   setItems([]);
//                   setBill(null);
//                   setSelectedBillId(null);
//                   setEditingBill(false);
//                   router.push("/admin/construction/progress-billing");
//                 }}
//                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md"
//               >
//                 <FaPlus size={14} /> Create Bill
//               </button>
//             )}
//           </div>
//         </div>

//         {viewMode === "list" ? (
//           // ─── List View ───────────────────────────────────────────────
//           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-4">
//               <div className="flex items-center gap-3">
//                 <FaFileInvoice className="text-indigo-600" />
//                 <h2 className="font-bold text-gray-800">All Bills</h2>
//                 <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
//                   {filteredBills.length}
//                 </span>
//               </div>
//               <div className="flex flex-wrap items-center gap-3">
//                 <div className="relative">
//                   <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
//                   <input
//                     type="text"
//                     placeholder="Search bills..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48 md:w-64 transition-all"
//                   />
//                 </div>
//                 <select
//                   value={billStatusFilter}
//                   onChange={(e) => setBillStatusFilter(e.target.value)}
//                   className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//                 >
//                   <option value="all">All Status</option>
//                   <option value="draft">Draft</option>
//                   <option value="issued">Issued</option>
//                   <option value="paid">Paid</option>
//                   <option value="cancelled">Cancelled</option>
//                 </select>
//                 <button
//                   onClick={fetchAllBills}
//                   className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
//                 >
//                   Refresh
//                 </button>
//               </div>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm border-collapse">
//                 <thead>
//                   <tr className="bg-gray-50 border-b border-gray-200">
//                     <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Bill #</th>
//                     <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">WO #</th>
//                     <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Project</th>
//                     <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Party</th>
//                     <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Items</th>
//                     <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Total</th>
//                     <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Paid</th>
//                     <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Balance</th>
//                     <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
//                     <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-100">
//                   {billsLoading ? (
//                     <tr><td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
//                   ) : filteredBills.length === 0 ? (
//                     <tr><td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">No bills found.</td></tr>
//                   ) : (
//                     filteredBills.map(b => {
//                       const partyName = b.orderType === "customer"
//                         ? b.customer?.customerName || b.customer?.name || "—"
//                         : b.contractor?.supplierName || b.contractor?.name || "—";
//                       return (
//                         <tr key={b._id} className="hover:bg-indigo-50/30 transition-all">
//                           <td className="px-6 py-3 font-bold text-indigo-600">{b.billNumber}</td>
//                           <td className="px-6 py-3 text-gray-700 font-medium">{b.workOrder?.workOrderNumber || "—"}</td>
//                           <td className="px-6 py-3 text-gray-600">{b.project?.name || "—"}</td>
//                           <td className="px-6 py-3">
//                             <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
//                               b.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
//                             }`}>
//                               {b.orderType === "customer" ? "Customer" : "Contractor"}
//                             </span>
//                             <span className="text-xs text-gray-400 block">{partyName}</span>
//                           </td>
//                           <td className="px-6 py-3 text-center text-gray-500">{b.items?.length || 0}</td>
//                           <td className="px-6 py-3 text-right font-bold text-gray-800">{formatCurrency(b.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0)}</td>
//                           <td className="px-6 py-3 text-right text-emerald-600 font-bold">{formatCurrency(b.paidAmount || 0)}</td>
//                           <td className="px-6 py-3 text-right font-bold text-gray-800">{formatCurrency(b.remainingAmount || 0)}</td>
//                           <td className="px-6 py-3 text-center">
//                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
//                               b.status === "draft" ? "bg-gray-100 text-gray-600" :
//                               b.status === "issued" ? "bg-blue-100 text-blue-700" :
//                               b.status === "paid" ? "bg-emerald-100 text-emerald-700" :
//                               "bg-red-100 text-red-700"
//                             }`}>
//                               {b.status}
//                             </span>
//                           </td>
//                           <td className="px-6 py-3 text-center">
//                             <div className="flex justify-center gap-1 flex-wrap">
//                               <button
//                                 onClick={() => handleViewBill(b._id)}
//                                 className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
//                                 title="View"
//                               >
//                                 <FaEye size={14} />
//                               </button>
//                               <button
//                                 onClick={() => handleEditBill(b._id)}
//                                 className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
//                                 title="Edit"
//                               >
//                                 <FaEdit size={14} />
//                               </button>
//                               <button
//                                 onClick={() => openPaymentModal(b)}
//                                 className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
//                                 title="Record Payment"
//                               >
//                                 <FaMoneyBillWave size={14} />
//                               </button>
//                               <button
//                                 onClick={handlePrint}
//                                 className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
//                                 title="Print"
//                               >
//                                 <FaPrint size={14} />
//                               </button>
//                               <button
//                                 onClick={() => handleDeleteBill(b._id)}
//                                 className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-all"
//                                 title="Delete"
//                               >
//                                 <FaTrash size={14} />
//                               </button>
//                             </div>
//                           </td>
//                         </tr>
//                       );
//                     })
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         ) : (
//           // ─── Create / Edit Mode ─────────────────────────────────────
//           <div id="print-area">
//             {/* Work Order Selector */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 no-print">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
//                     Select Work Order <span className="text-red-500">*</span>
//                   </label>
//                   <Select
//                     options={workOrderOptions}
//                     value={selectedWorkOrder}
//                     onChange={handleWorkOrderChange}
//                     placeholder="Search work order..."
//                     className="text-sm"
//                     isClearable
//                     isSearchable
//                     isDisabled={!!initialBillId || editingBill}
//                     styles={{
//                       control: (base) => ({
//                         ...base,
//                         borderColor: '#e2e8f0',
//                         boxShadow: 'none',
//                         '&:hover': { borderColor: '#6366f1' },
//                         minHeight: '42px',
//                       }),
//                     }}
//                   />
//                 </div>
//                 {selectedWorkOrder && workOrder && (
//                   <div>
//                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
//                       Work Order Details
//                     </label>
//                     <div className="flex flex-wrap items-center gap-3 text-sm bg-gray-50 p-3 rounded-xl">
//                       <span className="font-bold text-indigo-600">{workOrder.workOrderNumber}</span>
//                       <span className="text-gray-300">|</span>
//                       <span className="text-gray-600">{workOrder.project?.name || "—"}</span>
//                       <span className="text-gray-300">|</span>
//                       <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
//                         workOrder.orderType === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"
//                       }`}>
//                         {workOrder.orderType || "contractor"}
//                       </span>
//                       <span className="text-gray-300">|</span>
//                       <span className="text-gray-600 flex items-center gap-1">
//                         {workOrder.orderType === "customer" ? <FaUser size={12} /> : <FaBuilding size={12} />}
//                         {workOrder.orderType === "customer"
//                           ? workOrder.customer?.customerName || workOrder.customer?.name || "—"
//                           : workOrder.contractor?.supplierName || workOrder.contractor?.name || "—"}
//                       </span>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {selectedWorkOrder && workOrder ? (
//               <>
//                 {/* Bill Info (if bill loaded) */}
//                 {bill && (
//                   <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
//                     <div className="flex flex-wrap items-start justify-between gap-4">
//                       <div className="flex flex-wrap items-center gap-6">
//                         <div>
//                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bill Number</p>
//                           <p className="text-xl font-bold text-indigo-600">{bill.billNumber}</p>
//                         </div>
//                         <div>
//                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</p>
//                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
//                             bill.status === "draft" ? "bg-gray-100 text-gray-600" :
//                             bill.status === "issued" ? "bg-blue-100 text-blue-700" :
//                             bill.status === "paid" ? "bg-emerald-100 text-emerald-700" :
//                             "bg-red-100 text-red-700"
//                           }`}>
//                             {bill.status}
//                           </span>
//                         </div>
//                         <div>
//                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</p>
//                           <p className="text-sm font-medium text-gray-700">{new Date(bill.billDate).toLocaleDateString("en-GB")}</p>
//                         </div>
//                       </div>
//                       <div className="flex flex-wrap items-center gap-4">
//                         <div className="text-right">
//                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
//                           <p className="text-xl font-bold text-gray-800">{formatCurrency(bill.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0)}</p>
//                         </div>
//                         <div className="text-right">
//                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paid</p>
//                           <p className="text-xl font-bold text-emerald-600">{formatCurrency(bill.paidAmount || 0)}</p>
//                         </div>
//                         <div className="text-right">
//                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</p>
//                           <p className="text-xl font-bold text-indigo-600">{formatCurrency(bill.remainingAmount || 0)}</p>
//                         </div>
//                         {bill.status !== "paid" && (
//                           <button
//                             onClick={() => openPaymentModal(bill)}
//                             className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
//                           >
//                             <FaMoneyBillWave size={14} /> Record Payment
//                           </button>
//                         )}
//                       </div>
//                     </div>

//                     {/* Payment Progress */}
//                     <div className="mt-4 pt-4 border-t border-gray-100">
//                       <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
//                         <span>Payment Progress</span>
//                         <span className="font-bold text-indigo-600">{getPaymentProgress(bill).toFixed(0)}%</span>
//                       </div>
//                       <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
//                         <div
//                           className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-500"
//                           style={{ width: `${getPaymentProgress(bill)}%` }}
//                         ></div>
//                       </div>
//                     </div>

//                     {/* Payment History */}
//                     {bill.payments && bill.payments.length > 0 && (
//                       <div className="mt-4 pt-4 border-t border-gray-100">
//                         <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment History</p>
//                         <div className="overflow-x-auto">
//                           <table className="w-full text-xs">
//                             <thead className="bg-gray-50">
//                               <tr>
//                                 <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Date</th>
//                                 <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Method</th>
//                                 <th className="px-3 py-1.5 text-right text-[9px] font-bold uppercase text-gray-500">Amount</th>
//                                 <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Ref</th>
//                                 <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase text-gray-500">Note</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {bill.payments.map((p, idx) => (
//                                 <tr key={idx} className="hover:bg-gray-50">
//                                   <td className="px-3 py-1.5">{new Date(p.date).toLocaleDateString("en-GB")}</td>
//                                   <td className="px-3 py-1.5 capitalize">{p.method}</td>
//                                   <td className="px-3 py-1.5 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
//                                   <td className="px-3 py-1.5">{p.reference || "—"}</td>
//                                   <td className="px-3 py-1.5">{p.note || "—"}</td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {/* Previous Bills Dropdown */}
//                 {existingBills.length > 0 && (
//                   <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 no-print">
//                     <div className="flex flex-wrap items-center gap-4">
//                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Previous Bills:</label>
//                       <select
//                         className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none flex-1 max-w-xs"
//                         value={selectedBillId || ""}
//                         onChange={handleBillSelect}
//                       >
//                         <option value="">New Draft</option>
//                         {existingBills.map(b => (
//                           <option key={b._id} value={b._id}>
//                             {b.billNumber} ({new Date(b.billDate).toLocaleDateString()}) - {b.status}
//                           </option>
//                         ))}
//                       </select>
//                       <button
//                         onClick={handlePrint}
//                         className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all"
//                       >
//                         <FaPrint size={12} /> Print
//                       </button>
//                     </div>
//                   </div>
//                 )}

//                 {/* Items Table */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
//                   <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-4">
//                     <div className="flex items-center gap-3">
//                       <FaFileInvoice className="text-indigo-600" />
//                       <h2 className="font-bold text-gray-800">Bill Items</h2>
//                       <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <span className="text-sm font-bold text-gray-700">
//                         Total: <span className="text-indigo-700">{formatCurrency(total)}</span>
//                       </span>
//                       {!editingBill && (
//                         <button
//                           onClick={addRow}
//                           className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
//                         >
//                           <FaPlus size={10} /> Add Row
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                   <div className="overflow-x-auto p-6" ref={printRef}>
//                     <table className="w-full text-sm border-collapse">
//                       <thead>
//                         <tr className="bg-gray-50">
//                           <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">#</th>
//                           <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Item</th>
//                           <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Unit</th>
//                           <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Rate (₹)</th>
//                           <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">WO Qty</th>
//                           <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Billed Qty</th>
//                           <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount (₹)</th>
//                           <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Source</th>
//                           <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-gray-100">
//                         {items.map((item, idx) => {
//                           const hasError = validationErrors[item._id];
//                           return (
//                             <tr key={item._id} className="hover:bg-indigo-50/20 transition-all">
//                               <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
//                               <td className="px-4 py-3">
//                                 <input
//                                   type="text"
//                                   className={`w-full min-w-[150px] px-2 py-1 border rounded text-xs bg-white focus:outline-none ${
//                                     hasError ? "border-red-400 focus:ring-red-500" : "border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
//                                   }`}
//                                   value={item.description}
//                                   onChange={(e) => handleItemChange(item._id, "description", e.target.value)}
//                                   placeholder="Description..."
//                                 />
//                                 {hasError && (
//                                   <span className="block text-red-500 text-[9px] mt-0.5">
//                                     <FaExclamationTriangle className="inline mr-0.5" size={10} />
//                                     {validationErrors[item._id]}
//                                   </span>
//                                 )}
//                               </td>
//                               <td className="px-4 py-3 text-center">
//                                 <input
//                                   type="text"
//                                   className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
//                                   value={item.unit}
//                                   onChange={(e) => handleItemChange(item._id, "unit", e.target.value)}
//                                 />
//                               </td>
//                               <td className="px-4 py-3 text-center">
//                                 <input
//                                   type="number"
//                                   step="any"
//                                   min="0"
//                                   className="w-20 px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
//                                   value={item.rate}
//                                   onChange={(e) => handleItemChange(item._id, "rate", e.target.value)}
//                                 />
//                               </td>
//                               <td className="px-4 py-3 text-center text-xs text-gray-500">{item.boqQuantity || 0}</td>
//                               <td className="px-4 py-3 text-center">
//                                 <input
//                                   type="number"
//                                   step="any"
//                                   min="0"
//                                   className={`w-20 px-2 py-1 border rounded text-xs bg-white focus:outline-none text-center ${
//                                     hasError ? "border-red-400 focus:ring-red-500" : "border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
//                                   }`}
//                                   value={item.billedQuantity}
//                                   onChange={(e) => handleItemChange(item._id, "billedQuantity", e.target.value)}
//                                 />
//                               </td>
//                               <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
//                                 {formatCurrency(item.amount)}
//                               </td>
//                               <td className="px-4 py-3 text-center">
//                                 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
//                                   item.source === "material" ? "bg-blue-100 text-blue-700" :
//                                   item.source === "manual" ? "bg-orange-100 text-orange-700" :
//                                   "bg-indigo-100 text-indigo-700"
//                                 }`}>
//                                   {item.source === "material" ? "Material" :
//                                    item.source === "manual" ? "Manual" : "BOQ"}
//                                 </span>
//                               </td>
//                               <td className="px-4 py-3 text-center">
//                                 {!editingBill ? (
//                                   <button
//                                     onClick={() => removeRow(item._id)}
//                                     className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
//                                     disabled={items.length === 1}
//                                   >
//                                     <FaTrash size={12} />
//                                   </button>
//                                 ) : (
//                                   <span className="text-gray-400 text-[10px]">—</span>
//                                 )}
//                               </td>
//                             </tr>
//                           );
//                         })}
//                         {items.length === 0 && (
//                           <tr>
//                             <td colSpan="9" className="px-4 py-6 text-center text-gray-400 italic">
//                               No items. {!editingBill ? 'Click "Add Row".' : ''}
//                             </td>
//                           </tr>
//                         )}
//                         {items.length > 0 && (
//                           <tr className="bg-indigo-50/50 font-bold">
//                             <td colSpan="6" className="px-4 py-3 text-right text-xs text-gray-700 uppercase tracking-wider">
//                               Grand Total
//                             </td>
//                             <td className="px-4 py-3 text-right text-sm text-indigo-700">
//                               {formatCurrency(total)}
//                             </td>
//                             <td colSpan="2"></td>
//                           </tr>
//                         )}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//                 <div className="flex justify-end gap-3 mt-4 no-print">
//                   <button
//                     onClick={() => {
//                       setViewMode("list");
//                       setEditingBill(false);
//                       setBill(null);
//                       setItems([]);
//                       setSelectedWorkOrder(null);
//                       setWorkOrder(null);
//                       router.push("/admin/construction/progress-billing");
//                     }}
//                     className="px-6 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     onClick={handleSave}
//                     disabled={saving}
//                     className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
//                   >
//                     {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave size={14} />}
//                     {saving ? "Saving..." : bill ? "Update Bill" : "Create Bill"}
//                   </button>
//                 </div>
//               </>
//             ) : (
//               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
//                 <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
//                   <FaFileInvoice className="text-4xl text-indigo-300" />
//                 </div>
//                 <h3 className="text-lg font-bold text-gray-700">Select a Work Order</h3>
//                 <p className="text-sm text-gray-400">Choose a work order from the dropdown above to start billing.</p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ─── Payment Modal ──────────────────────────────────────────────── */}
//       {isPaymentModalOpen && selectedPaymentBill && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
//             <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
//               <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
//                 <FaMoneyBillWave className="text-blue-600" /> Record Payment
//               </h2>
//               <button
//                 onClick={() => setIsPaymentModalOpen(false)}
//                 className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
//               >
//                 <FaTimes size={18} className="text-gray-500" />
//               </button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount (₹)</label>
//                 <input
//                   type="number"
//                   step="any"
//                   min="0"
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
//                   value={paymentAmount}
//                   onChange={(e) => setPaymentAmount(e.target.value)}
//                   placeholder="0.00"
//                 />
//                 <p className="text-xs text-gray-400 mt-1">Remaining balance: {formatCurrency(selectedPaymentBill.remainingAmount)}</p>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</label>
//                   <input
//                     type="date"
//                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
//                     value={paymentDate}
//                     onChange={(e) => setPaymentDate(e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Method</label>
//                   <select
//                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
//                     value={paymentMethod}
//                     onChange={(e) => setPaymentMethod(e.target.value)}
//                   >
//                     <option value="cash">Cash</option>
//                     <option value="bank">Bank Transfer</option>
//                     <option value="cheque">Cheque</option>
//                     <option value="upi">UPI</option>
//                     <option value="other">Other</option>
//                   </select>
//                 </div>
//               </div>
//               <div>
//                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reference (optional)</label>
//                 <input
//                   type="text"
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
//                   value={paymentRef}
//                   onChange={(e) => setPaymentRef(e.target.value)}
//                   placeholder="Cheque/ref number"
//                 />
//               </div>
//               <div>
//                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Note (optional)</label>
//                 <input
//                   type="text"
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
//                   value={paymentNote}
//                   onChange={(e) => setPaymentNote(e.target.value)}
//                   placeholder="Any note"
//                 />
//               </div>
//               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
//                 <button
//                   onClick={() => setIsPaymentModalOpen(false)}
//                   className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={recordPayment}
//                   disabled={recordingPayment}
//                   className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md"
//                 >
//                   {recordingPayment ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaCheck size={14} />}
//                   {recordingPayment ? "Recording..." : "Record Payment"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ─── Print Styles ────────────────────────────────────────────────── */}
//       <style jsx global>{`
//         @media print {
//           body * { visibility: hidden; }
//           #print-area, #print-area * { visibility: visible; }
//           #print-area { 
//             position: absolute; 
//             left: 0; 
//             top: 0; 
//             width: 100%; 
//             background: white; 
//             padding: 20px; 
//           }
//           .no-print { display: none !important; }
//           #print-area table { width: 100%; border-collapse: collapse; }
//           #print-area th, #print-area td { border: 1px solid #ddd; padding: 8px; }
//         }
//         @keyframes fadeIn {
//           from { opacity: 0; transform: scale(0.95); }
//           to { opacity: 1; transform: scale(1); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.2s ease-out;
//         }
//       `}</style>
//     </div>
//   );
// }