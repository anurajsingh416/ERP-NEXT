"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaFileContract,
  FaUserTie,
  FaUserFriends,
  FaCalendarAlt,
  FaBoxes,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState(null);
  const [consumption, setConsumption] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedMaterialSections, setExpandedMaterialSections] = useState({});

  useEffect(() => {
    const fetchWorkOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const woRes = await api.get(`/construction/work-orders/${id}`, headers);
        const woData = woRes.data.data || woRes.data;
        setWorkOrder(woData);

        const consRes = await api.get(`/construction/material-consumption?workOrderId=${id}`, headers);
        setConsumption(consRes.data.data || consRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load work order details.");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkOrder();
  }, [id, router]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  // ─── Group items by section → sub‑section ──────────────────────────────
  const getSectionSubSectionMap = (items) => {
    if (!items) return {};
    const map = {};
    items.forEach(item => {
      const section = item.section || "Other Work";
      const subSection = item.subSection && item.subSection.trim() !== "" ? item.subSection : "Uncategorized";
      if (!map[section]) map[section] = {};
      if (!map[section][subSection]) map[section][subSection] = [];
      map[section][subSection].push(item);
    });
    return map;
  };

  const itemSectionMap = getSectionSubSectionMap(workOrder?.items);
  const materialSectionMap = getSectionSubSectionMap(workOrder?.materials);

  const toggleSection = (section, type = "items") => {
    if (type === "items") {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    } else {
      setExpandedMaterialSections(prev => ({ ...prev, [section]: !prev[section] }));
    }
  };

  // ─── Helper to get party name ──────────────────────────────────────────
  const getPartyName = () => {
    if (!workOrder) return "—";
    if (workOrder.orderType === "customer") {
      return workOrder.customer?.customerName || workOrder.customer?.name || "—";
    }
    return workOrder.contractor?.supplierName || workOrder.contractor?.name || "—";
  };

  const getPartyType = () => {
    if (!workOrder) return "—";
    return workOrder.orderType === "customer" ? "Customer" : "Contractor";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading work order...</div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Work order not found.</div>
      </div>
    );
  }

  const totalAmount = (workOrder.items || []).reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalMaterialAmount = (workOrder.materials || []).reduce((sum, m) => sum + (m.amount || 0), 0);
  const grandTotal = totalAmount + totalMaterialAmount;

  const TransferBadge = ({ value }) => (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {value ? "Stock Transfer" : "Direct"}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <FaFileContract className="text-indigo-600" /> {workOrder.workOrderNumber}
          </h1>
          <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
            <span className="font-bold text-gray-400">Grand Total:</span>
            <span className="font-black text-indigo-600">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
            <p className="text-lg font-bold text-gray-800 capitalize">{workOrder.status}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</p>
            <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
              workOrder.orderType === "customer" 
                ? "bg-slate-100 text-slate-700" 
                : "bg-indigo-100 text-indigo-700"
            }`}>
              {getPartyType()}
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project</p>
            <p
              className="text-lg font-bold text-indigo-600 hover:underline cursor-pointer"
              onClick={() => router.push(`/admin/construction/projects/${workOrder.project?._id}`)}
            >
              {workOrder.project?.name || "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{getPartyType()}</p>
            <p className="text-lg font-bold text-gray-800">
              {getPartyName()}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Issued Date</p>
            <p className="text-sm text-gray-700">
              {workOrder.issuedDate ? new Date(workOrder.issuedDate).toLocaleDateString("en-GB") : "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expected Start</p>
            <p className="text-sm text-gray-700">
              {workOrder.expectedStart ? new Date(workOrder.expectedStart).toLocaleDateString("en-GB") : "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expected End</p>
            <p className="text-sm text-gray-700">
              {workOrder.expectedEnd ? new Date(workOrder.expectedEnd).toLocaleDateString("en-GB") : "—"}
            </p>
          </div>
        </div>

        {/* ─── BOQ Items Section ───────────────────────────────────────── */}
        {Object.keys(itemSectionMap).length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-extrabold text-indigo-800 flex items-center gap-2">
              <FaFileContract className="text-indigo-600" /> BOQ Items
            </h2>
            {Object.keys(itemSectionMap).map((sectionName) => {
              const subSections = itemSectionMap[sectionName];
              const allItems = Object.values(subSections).flat();
              const isExpanded = expandedSections[sectionName] ?? true;

              return (
                <div key={`items-${sectionName}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div
                    className="px-6 py-4 bg-indigo-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-indigo-50/80 transition-colors"
                    onClick={() => toggleSection(sectionName, "items")}
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-gray-400 hover:text-indigo-600">
                        {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                      </button>
                      <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
                      <span className="text-xs text-gray-400">({allItems.length} items)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600">
                        {formatCurrency(allItems.reduce((sum, i) => sum + (i.amount || 0), 0))}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 space-y-4">
                      {Object.keys(subSections).map((subSectionName) => {
                        const items = subSections[subSectionName];
                        return (
                          <div key={subSectionName} className="ml-4 border-l-2 border-indigo-200 pl-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                                {subSectionName}
                              </span>
                              <span className="text-[10px] text-gray-400">({items.length} items)</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[150px]">
                                      Item
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Unit
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Qty
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Rate
                                    </th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Amount
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Transfer
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-50/20">
                                      <td className="px-3 py-2 text-xs text-gray-700">
                                        {item.itemName || item.description || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-600">
                                        {item.unit || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-700">
                                        {item.quantity}
                                      </td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-700">
                                        {item.rate}
                                      </td>
                                      <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">
                                        {formatCurrency(item.amount)}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <TransferBadge value={item.transferFromStock} />
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-indigo-50/30">
                                    <td colSpan="5" className="px-3 py-2 text-right text-xs font-bold text-indigo-600">
                                      Sub‑Section Total
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-bold text-indigo-700">
                                      {formatCurrency(items.reduce((sum, i) => sum + (i.amount || 0), 0))}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-end items-center mt-2 pt-2 border-t-2 border-indigo-200">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
                          Section Total ({allItems.length} items)
                        </span>
                        <span className="text-sm font-extrabold text-indigo-700">
                          {formatCurrency(allItems.reduce((sum, i) => sum + (i.amount || 0), 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Materials Section ───────────────────────────────────────── */}
        {Object.keys(materialSectionMap).length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-lg font-extrabold text-blue-800 flex items-center gap-2">
              <FaBoxes className="text-blue-600" /> Additional Materials
            </h2>
            {Object.keys(materialSectionMap).map((sectionName) => {
              const subSections = materialSectionMap[sectionName];
              const allMaterials = Object.values(subSections).flat();
              const isExpanded = expandedMaterialSections[sectionName] ?? true;

              return (
                <div key={`materials-${sectionName}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div
                    className="px-6 py-4 bg-blue-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/80 transition-colors"
                    onClick={() => toggleSection(sectionName, "materials")}
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-gray-400 hover:text-blue-600">
                        {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                      </button>
                      <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
                      <span className="text-xs text-gray-400">({allMaterials.length} materials)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">
                        {formatCurrency(allMaterials.reduce((sum, m) => sum + (m.amount || 0), 0))}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 space-y-4">
                      {Object.keys(subSections).map((subSectionName) => {
                        const materials = subSections[subSectionName];
                        return (
                          <div key={subSectionName} className="ml-4 border-l-2 border-blue-200 pl-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                {subSectionName}
                              </span>
                              <span className="text-[10px] text-gray-400">({materials.length} materials)</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[150px]">
                                      Material
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Unit
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Qty
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Rate
                                    </th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Amount
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                      Transfer
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {materials.map((mat, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/20">
                                      <td className="px-3 py-2 text-xs text-gray-700">
                                        {mat.itemName || mat.description || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-600">
                                        {mat.unit || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-700">
                                        {mat.quantity}
                                      </td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-700">
                                        {mat.rate}
                                      </td>
                                      <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">
                                        {formatCurrency(mat.amount)}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <TransferBadge value={mat.transferFromStock} />
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-blue-50/30">
                                    <td colSpan="5" className="px-3 py-2 text-right text-xs font-bold text-blue-600">
                                      Sub‑Section Total
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-bold text-blue-700">
                                      {formatCurrency(materials.reduce((sum, m) => sum + (m.amount || 0), 0))}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-end items-center mt-2 pt-2 border-t-2 border-blue-200">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
                          Section Total ({allMaterials.length} materials)
                        </span>
                        <span className="text-sm font-extrabold text-blue-700">
                          {formatCurrency(allMaterials.reduce((sum, m) => sum + (m.amount || 0), 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Grand Total ──────────────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t-2 border-indigo-300 flex justify-end items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <span className="text-sm font-bold text-gray-600 uppercase tracking-wider mr-4">
            Grand Total
          </span>
          <span className="text-xl font-extrabold text-indigo-700">
            {formatCurrency(grandTotal)}
          </span>
        </div>

        {/* ─── Linked Consumption ────────────────────────────────────────── */}
        {consumption.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FaBoxes className="text-indigo-600" /> Linked Consumption
              </h2>
            </div>
            <div className="overflow-x-auto p-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Materials</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consumption.map((c) => (
                    <tr key={c._id} className="hover:bg-indigo-50/20">
                      <td className="px-6 py-3 text-xs text-gray-700">
                        {new Date(c.consumptionDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-700">
                        {c.items.map(i => i.materialName).join(", ")}
                      </td>
                      <td className="px-6 py-3 text-center text-xs">
                        {c.items.reduce((sum, i) => sum + (i.quantity || 0), 0)}
                      </td>
                      <td className="px-6 py-3 text-right text-xs font-bold text-gray-700">
                        {formatCurrency(c.items.reduce((sum, i) => sum + (i.amount || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import api from "@/lib/api";
// import {
//   FaArrowLeft,
//   FaFileContract,
//   FaUserTie,
//   FaCalendarAlt,
//   FaBoxes,
//   FaChevronDown,
//   FaChevronUp,
//   FaCheckCircle,
//   FaTimesCircle,
// } from "react-icons/fa";
// import { toast } from "react-toastify";

// export default function WorkOrderDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [workOrder, setWorkOrder] = useState(null);
//   const [consumption, setConsumption] = useState([]);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [expandedMaterialSections, setExpandedMaterialSections] = useState({});

//   useEffect(() => {
//     const fetchWorkOrder = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/login");
//           return;
//         }
//         const headers = { headers: { Authorization: `Bearer ${token}` } };

//         const woRes = await api.get(`/construction/work-orders/${id}`, headers);
//         const woData = woRes.data.data || woRes.data;
//         setWorkOrder(woData);

//         const consRes = await api.get(`/construction/material-consumption?workOrderId=${id}`, headers);
//         setConsumption(consRes.data.data || consRes.data || []);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load work order details.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchWorkOrder();
//   }, [id, router]);

//   const formatCurrency = (num) =>
//     new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

//   // ─── Group items by section → sub‑section ──────────────────────────────
//   const getSectionSubSectionMap = (items) => {
//     if (!items) return {};
//     const map = {};
//     items.forEach(item => {
//       const section = item.section || "Other Work";
//       const subSection = item.subSection && item.subSection.trim() !== "" ? item.subSection : "Uncategorized";
//       if (!map[section]) map[section] = {};
//       if (!map[section][subSection]) map[section][subSection] = [];
//       map[section][subSection].push(item);
//     });
//     return map;
//   };

//   const itemSectionMap = getSectionSubSectionMap(workOrder?.items);
//   const materialSectionMap = getSectionSubSectionMap(workOrder?.materials);

//   const toggleSection = (section, type = "items") => {
//     if (type === "items") {
//       setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
//     } else {
//       setExpandedMaterialSections(prev => ({ ...prev, [section]: !prev[section] }));
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center text-gray-400">Loading work order...</div>
//       </div>
//     );
//   }

//   if (!workOrder) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center text-gray-400">Work order not found.</div>
//       </div>
//     );
//   }

//   const totalAmount = (workOrder.items || []).reduce((sum, i) => sum + (i.amount || 0), 0);
//   const totalMaterialAmount = (workOrder.materials || []).reduce((sum, m) => sum + (m.amount || 0), 0);
//   const grandTotal = totalAmount + totalMaterialAmount;

//   const TransferBadge = ({ value }) => (
//     <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
//       {value ? "Stock Transfer" : "Direct"}
//     </span>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex items-center gap-4 mb-6">
//           <button
//             onClick={() => router.back()}
//             className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
//           >
//             <FaArrowLeft size={20} className="text-gray-600" />
//           </button>
//           <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//             <FaFileContract className="text-indigo-600" /> {workOrder.workOrderNumber}
//           </h1>
//           <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
//             <span className="font-bold text-gray-400">Grand Total:</span>
//             <span className="font-black text-indigo-600">
//               {formatCurrency(grandTotal)}
//             </span>
//           </div>
//         </div>

//         {/* Info Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
//             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
//             <p className="text-lg font-bold text-gray-800 capitalize">{workOrder.status}</p>
//           </div>
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
//             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project</p>
//             <p
//               className="text-lg font-bold text-indigo-600 hover:underline cursor-pointer"
//               onClick={() => router.push(`/construction/projects/${workOrder.project?._id}`)}
//             >
//               {workOrder.project?.name || "—"}
//             </p>
//           </div>
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
//             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contractor</p>
//             <p className="text-lg font-bold text-gray-800">
//               {workOrder.contractor?.supplierName || workOrder.contractor?.name || "—"}
//             </p>
//           </div>
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
//             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
//             <p className="text-lg font-bold text-gray-800">
//               {(workOrder.items?.length || 0) + (workOrder.materials?.length || 0)}
//             </p>
//           </div>
//         </div>

//         {/* Dates */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
//             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Issued Date</p>
//             <p className="text-sm text-gray-700">
//               {workOrder.issuedDate ? new Date(workOrder.issuedDate).toLocaleDateString("en-GB") : "—"}
//             </p>
//           </div>
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
//             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expected Start</p>
//             <p className="text-sm text-gray-700">
//               {workOrder.expectedStart ? new Date(workOrder.expectedStart).toLocaleDateString("en-GB") : "—"}
//             </p>
//           </div>
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
//             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expected End</p>
//             <p className="text-sm text-gray-700">
//               {workOrder.expectedEnd ? new Date(workOrder.expectedEnd).toLocaleDateString("en-GB") : "—"}
//             </p>
//           </div>
//         </div>

//         {/* ─── BOQ Items Section ───────────────────────────────────────── */}
//         {Object.keys(itemSectionMap).length > 0 && (
//           <div className="space-y-6">
//             <h2 className="text-lg font-extrabold text-indigo-800 flex items-center gap-2">
//               <FaFileContract className="text-indigo-600" /> BOQ Items
//             </h2>
//             {Object.keys(itemSectionMap).map((sectionName) => {
//               const subSections = itemSectionMap[sectionName];
//               const allItems = Object.values(subSections).flat();
//               const isExpanded = expandedSections[sectionName] ?? true;

//               return (
//                 <div key={`items-${sectionName}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//                   <div
//                     className="px-6 py-4 bg-indigo-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-indigo-50/80 transition-colors"
//                     onClick={() => toggleSection(sectionName, "items")}
//                   >
//                     <div className="flex items-center gap-3">
//                       <button type="button" className="text-gray-400 hover:text-indigo-600">
//                         {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
//                       </button>
//                       <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
//                       <span className="text-xs text-gray-400">({allItems.length} items)</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <span className="text-xs font-bold text-indigo-600">
//                         {formatCurrency(allItems.reduce((sum, i) => sum + (i.amount || 0), 0))}
//                       </span>
//                     </div>
//                   </div>

//                   {isExpanded && (
//                     <div className="p-6 space-y-4">
//                       {Object.keys(subSections).map((subSectionName) => {
//                         const items = subSections[subSectionName];
//                         return (
//                           <div key={subSectionName} className="ml-4 border-l-2 border-indigo-200 pl-4">
//                             <div className="flex items-center gap-2 mb-2">
//                               <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
//                                 {subSectionName}
//                               </span>
//                               <span className="text-[10px] text-gray-400">({items.length} items)</span>
//                             </div>
//                             <div className="overflow-x-auto">
//                               <table className="w-full text-sm border-collapse">
//                                 <thead className="bg-gray-50">
//                                   <tr>
//                                     <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[150px]">
//                                       Item
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Unit
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Qty
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Rate
//                                     </th>
//                                     <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Amount
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Transfer
//                                     </th>
//                                   </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                   {items.map((item, idx) => (
//                                     <tr key={idx} className="hover:bg-indigo-50/20">
//                                       <td className="px-3 py-2 text-xs text-gray-700">
//                                         {item.itemName || item.description || "—"}
//                                       </td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-600">
//                                         {item.unit || "—"}
//                                       </td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-700">
//                                         {item.quantity}
//                                       </td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-700">
//                                         {item.rate}
//                                       </td>
//                                       <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">
//                                         {formatCurrency(item.amount)}
//                                       </td>
//                                       <td className="px-3 py-2 text-center">
//                                         <TransferBadge value={item.transferFromStock} />
//                                       </td>
//                                     </tr>
//                                   ))}
//                                   <tr className="bg-indigo-50/30">
//                                     <td colSpan="5" className="px-3 py-2 text-right text-xs font-bold text-indigo-600">
//                                       Sub‑Section Total
//                                     </td>
//                                     <td className="px-3 py-2 text-right text-xs font-bold text-indigo-700">
//                                       {formatCurrency(items.reduce((sum, i) => sum + (i.amount || 0), 0))}
//                                     </td>
//                                   </tr>
//                                 </tbody>
//                               </table>
//                             </div>
//                           </div>
//                         );
//                       })}
//                       <div className="flex justify-end items-center mt-2 pt-2 border-t-2 border-indigo-200">
//                         <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
//                           Section Total ({allItems.length} items)
//                         </span>
//                         <span className="text-sm font-extrabold text-indigo-700">
//                           {formatCurrency(allItems.reduce((sum, i) => sum + (i.amount || 0), 0))}
//                         </span>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* ─── Materials Section ───────────────────────────────────────── */}
//         {Object.keys(materialSectionMap).length > 0 && (
//           <div className="mt-8 space-y-6">
//             <h2 className="text-lg font-extrabold text-blue-800 flex items-center gap-2">
//               <FaBoxes className="text-blue-600" /> Additional Materials
//             </h2>
//             {Object.keys(materialSectionMap).map((sectionName) => {
//               const subSections = materialSectionMap[sectionName];
//               const allMaterials = Object.values(subSections).flat();
//               const isExpanded = expandedMaterialSections[sectionName] ?? true;

//               return (
//                 <div key={`materials-${sectionName}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//                   <div
//                     className="px-6 py-4 bg-blue-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/80 transition-colors"
//                     onClick={() => toggleSection(sectionName, "materials")}
//                   >
//                     <div className="flex items-center gap-3">
//                       <button type="button" className="text-gray-400 hover:text-blue-600">
//                         {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
//                       </button>
//                       <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
//                       <span className="text-xs text-gray-400">({allMaterials.length} materials)</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <span className="text-xs font-bold text-blue-600">
//                         {formatCurrency(allMaterials.reduce((sum, m) => sum + (m.amount || 0), 0))}
//                       </span>
//                     </div>
//                   </div>

//                   {isExpanded && (
//                     <div className="p-6 space-y-4">
//                       {Object.keys(subSections).map((subSectionName) => {
//                         const materials = subSections[subSectionName];
//                         return (
//                           <div key={subSectionName} className="ml-4 border-l-2 border-blue-200 pl-4">
//                             <div className="flex items-center gap-2 mb-2">
//                               <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
//                                 {subSectionName}
//                               </span>
//                               <span className="text-[10px] text-gray-400">({materials.length} materials)</span>
//                             </div>
//                             <div className="overflow-x-auto">
//                               <table className="w-full text-sm border-collapse">
//                                 <thead className="bg-gray-50">
//                                   <tr>
//                                     <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[150px]">
//                                       Material
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Unit
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Qty
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Rate
//                                     </th>
//                                     <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Amount
//                                     </th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
//                                       Transfer
//                                     </th>
//                                   </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                   {materials.map((mat, idx) => (
//                                     <tr key={idx} className="hover:bg-blue-50/20">
//                                       <td className="px-3 py-2 text-xs text-gray-700">
//                                         {mat.itemName || mat.description || "—"}
//                                       </td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-600">
//                                         {mat.unit || "—"}
//                                       </td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-700">
//                                         {mat.quantity}
//                                       </td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-700">
//                                         {mat.rate}
//                                       </td>
//                                       <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">
//                                         {formatCurrency(mat.amount)}
//                                       </td>
//                                       <td className="px-3 py-2 text-center">
//                                         <TransferBadge value={mat.transferFromStock} />
//                                       </td>
//                                     </tr>
//                                   ))}
//                                   <tr className="bg-blue-50/30">
//                                     <td colSpan="5" className="px-3 py-2 text-right text-xs font-bold text-blue-600">
//                                       Sub‑Section Total
//                                     </td>
//                                     <td className="px-3 py-2 text-right text-xs font-bold text-blue-700">
//                                       {formatCurrency(materials.reduce((sum, m) => sum + (m.amount || 0), 0))}
//                                     </td>
//                                   </tr>
//                                 </tbody>
//                               </table>
//                             </div>
//                           </div>
//                         );
//                       })}
//                       <div className="flex justify-end items-center mt-2 pt-2 border-t-2 border-blue-200">
//                         <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
//                           Section Total ({allMaterials.length} materials)
//                         </span>
//                         <span className="text-sm font-extrabold text-blue-700">
//                           {formatCurrency(allMaterials.reduce((sum, m) => sum + (m.amount || 0), 0))}
//                         </span>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* ─── Grand Total ──────────────────────────────────────────────── */}
//         <div className="mt-6 pt-4 border-t-2 border-indigo-300 flex justify-end items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//           <span className="text-sm font-bold text-gray-600 uppercase tracking-wider mr-4">
//             Grand Total
//           </span>
//           <span className="text-xl font-extrabold text-indigo-700">
//             {formatCurrency(grandTotal)}
//           </span>
//         </div>

//         {/* ─── Linked Consumption ────────────────────────────────────────── */}
//         {consumption.length > 0 && (
//           <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
//               <h2 className="font-bold text-gray-800 flex items-center gap-2">
//                 <FaBoxes className="text-indigo-600" /> Linked Consumption
//               </h2>
//             </div>
//             <div className="overflow-x-auto p-6">
//               <table className="w-full text-sm border-collapse">
//                 <thead>
//                   <tr className="bg-gray-50 border-b border-gray-100">
//                     <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</th>
//                     <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Materials</th>
//                     <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
//                     <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-100">
//                   {consumption.map((c) => (
//                     <tr key={c._id} className="hover:bg-indigo-50/20">
//                       <td className="px-6 py-3 text-xs text-gray-700">
//                         {new Date(c.consumptionDate).toLocaleDateString("en-GB")}
//                       </td>
//                       <td className="px-6 py-3 text-xs text-gray-700">
//                         {c.items.map(i => i.materialName).join(", ")}
//                       </td>
//                       <td className="px-6 py-3 text-center text-xs">
//                         {c.items.reduce((sum, i) => sum + (i.quantity || 0), 0)}
//                       </td>
//                       <td className="px-6 py-3 text-right text-xs font-bold text-gray-700">
//                         {formatCurrency(c.items.reduce((sum, i) => sum + (i.amount || 0), 0))}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
