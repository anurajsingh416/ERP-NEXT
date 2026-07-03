"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import React from "react";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaArrowLeft,
  FaBoxes,
  FaCheck,
  FaFileContract,
  FaSync,
  FaWarehouse,
  FaArrowRight,
  FaTimes,
  FaSearch,
  FaEye,
  FaChevronUp,
  FaUserTie,
  FaUserFriends,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StockTransferPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialIds = searchParams.get("ids")?.split(",") || [];

  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState(initialIds);
  const [availableWorkOrders, setAvailableWorkOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Per‑item warehouse selection
  const [itemWarehouses, setItemWarehouses] = useState({});
  const [defaultWarehouse, setDefaultWarehouse] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [modalSelectedItems, setModalSelectedItems] = useState([]);

  // Bottom sheet
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const sheetRef = useRef(null);

  // ─── Fetch warehouses ──────────────────────────────────────────────
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/warehouse", headers);
        const data = res.data.data || res.data || [];
        setWarehouses(data);
        if (data.length > 0) {
          setDefaultWarehouse({ value: data[0]._id, label: data[0].name || data[0].warehouseName });
        }
      } catch (err) {
        console.error("Failed to fetch warehouses:", err);
        toast.warning("Could not load warehouses.");
      }
    };
    fetchWarehouses();
  }, []);

  // ─── Fetch all work orders ──────────────────────────────────────────
  useEffect(() => {
    const fetchAvailableWorkOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.replace("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/construction/work-orders", headers);
        setAvailableWorkOrders(res.data.data || res.data || []);
      } catch (err) {
        console.error("Failed to fetch work orders list:", err);
        toast.error("Failed to load work orders list.");
      }
    };
    fetchAvailableWorkOrders();
  }, [router]);

  // ─── Fetch selected work orders ──────────────────────────────────────
  useEffect(() => {
    if (selectedWorkOrderIds.length === 0) {
      setWorkOrders([]);
      setAllItems([]);
      setSelectedItems([]);
      setItemWarehouses({});
      setLoading(false);
      setIsSheetExpanded(false);
      return;
    }

    const fetchWorkOrders = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.replace("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const orders = await Promise.all(
          selectedWorkOrderIds.map(async (id) => {
            const res = await api.get(`/construction/work-orders/${id}`, headers);
            return res.data.data || res.data;
          })
        );
        setWorkOrders(orders);

        // ── Merge items from both 'items' and 'materials' ──
        const items = orders.flatMap((wo) => {
          const result = [];

          // BOQ items: only if transferFromStock === true
          (wo.items || [])
            .filter((item) => item.transferFromStock === true)
            .forEach((item) => {
              result.push({
                ...item,
                source: "items",
                workOrderNumber: wo.workOrderNumber,
                workOrderId: wo._id,
                _uniqueId: `${item._id}_items`,
                _id: item._id,
                itemName: item.itemName || item.description || "Unnamed",
              });
            });

          // Materials: include if transferFromStock === true OR type === "material"
          (wo.materials || [])
            .filter((mat) => mat.transferFromStock === true || mat.type === "material")
            .forEach((mat) => {
              result.push({
                ...mat,
                source: "materials",
                workOrderNumber: wo.workOrderNumber,
                workOrderId: wo._id,
                _uniqueId: `${mat._id}_materials`,
                _id: mat._id,
                itemName: mat.itemName || mat.description || "Unnamed Material",
                description: mat.description || mat.itemName || "",
              });
            });

          return result;
        });

        setAllItems(items);
        // Auto‑select all items
        setSelectedItems(items.map((item) => item._uniqueId));

        // Auto‑assign default warehouse if available
        if (defaultWarehouse && items.length > 0) {
          const warehouseMap = {};
          items.forEach((item) => {
            warehouseMap[item._uniqueId] = defaultWarehouse.value;
          });
          setItemWarehouses(warehouseMap);
        }
        setIsSheetExpanded(true);
      } catch (err) {
        console.error("Failed to fetch work orders:", err);
        toast.error("Failed to load work orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrders();
  }, [selectedWorkOrderIds, router, defaultWarehouse]);

  // ─── Filter work orders by search ──────────────────────────────────
  const filteredWorkOrders = availableWorkOrders.filter((wo) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      wo.workOrderNumber?.toLowerCase().includes(term) ||
      wo.project?.name?.toLowerCase().includes(term)
    );
  });

  // ─── Apply warehouse to all items ──────────────────────────────────
  const applyWarehouseToAll = () => {
    if (!defaultWarehouse) {
      toast.warning("Please select a default warehouse first.");
      return;
    }
    if (allItems.length === 0) {
      toast.warning("No items to apply to.");
      return;
    }
    const warehouseMap = {};
    allItems.forEach((item) => {
      warehouseMap[item._uniqueId] = defaultWarehouse.value;
    });
    setItemWarehouses(warehouseMap);
    toast.success(`Applied warehouse to ${allItems.length} items.`);
  };

  // ─── Handle warehouse change per item ──────────────────────────────
  const handleWarehouseChange = (uniqueId, warehouseId) => {
    setItemWarehouses((prev) => ({
      ...prev,
      [uniqueId]: warehouseId,
    }));
  };

  // ─── Open modal for work order ──────────────────────────────────────
  const openModal = (wo) => {
    setSelectedWorkOrder(wo);
    const preSelected = [
      ...(wo.items || []).filter((i) => i.transferFromStock === true).map((i) => `${i._id}_items`),
      ...(wo.materials || [])
        .filter((m) => m.transferFromStock === true || m.type === "material")
        .map((m) => `${m._id}_materials`),
    ];
    setModalSelectedItems(preSelected);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedWorkOrder(null);
    setModalSelectedItems([]);
  };

  const toggleModalItem = (uniqueId) => {
    setModalSelectedItems((prev) =>
      prev.includes(uniqueId)
        ? prev.filter((id) => id !== uniqueId)
        : [...prev, uniqueId]
    );
  };

  const addSelectedFromModal = () => {
    if (!selectedWorkOrder) return;
    const allAvailable = [
      ...(selectedWorkOrder.items || []).map((i) => ({ ...i, source: "items" })),
      ...(selectedWorkOrder.materials || []).map((m) => ({ ...m, source: "materials" })),
    ];
    const itemsToAdd = allAvailable.filter(
      (item) => modalSelectedItems.includes(`${item._id}_${item.source}`)
    );
    if (itemsToAdd.length === 0) {
      toast.warning("No items selected.");
      return;
    }
    if (!selectedWorkOrderIds.includes(selectedWorkOrder._id)) {
      setSelectedWorkOrderIds([...selectedWorkOrderIds, selectedWorkOrder._id]);
    }
    toast.success(`${itemsToAdd.length} items added to transfer.`);
    closeModal();
  };

  // ─── Toggle selection ──────────────────────────────────────────────
  const toggleWorkOrderSelection = (id) => {
    setSelectedWorkOrderIds((prev) =>
      prev.includes(id)
        ? prev.filter((woId) => woId !== id)
        : [...prev, id]
    );
  };

  const toggleAllWorkOrders = (e) => {
    if (e.target.checked) {
      setSelectedWorkOrderIds(filteredWorkOrders.map((wo) => wo._id));
    } else {
      setSelectedWorkOrderIds([]);
    }
  };

  const toggleItemSelection = (uniqueId) => {
    setSelectedItems((prev) =>
      prev.includes(uniqueId)
        ? prev.filter((id) => id !== uniqueId)
        : [...prev, uniqueId]
    );
  };

  const toggleAllItems = (e) => {
    if (e.target.checked) {
      setSelectedItems(allItems.map((item) => item._uniqueId));
    } else {
      setSelectedItems([]);
    }
  };

  // ─── Transfer ──────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (selectedItems.length === 0) {
      toast.warning("Please select at least one item to transfer.");
      return;
    }
    const missingWarehouse = selectedItems.some(
      (uniqueId) => !itemWarehouses[uniqueId]
    );
    if (missingWarehouse) {
      toast.error("Please select a warehouse for all selected items.");
      return;
    }
    if (!confirm(`Transfer ${selectedItems.length} item(s) from stock?`)) return;

    setTransferring(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const selectedItemDetails = selectedItems.map((uniqueId) => {
        const item = allItems.find((i) => i._uniqueId === uniqueId);
        return {
          itemId: item._id,
          source: item.source,
          workOrderId: item.workOrderId,
          warehouseId: itemWarehouses[uniqueId],
          type: item.type || "material",
        };
      });

      const payload = {
        items: selectedItemDetails,
      };

      const res = await api.post("/construction/stock-transfer", payload, headers);
      toast.success(res.data.message || "Stock transferred successfully!");
      // Refresh the selected work orders to update the list
      setSelectedWorkOrderIds([...selectedWorkOrderIds]);
      closeModal();
      setSelectedItems([]);
      setItemWarehouses({});
      // Optionally, navigate to the newly created transfer's detail page
      if (res.data.data && res.data.data._id) {
        router.push(`/admin/construction/stock-transfers/${res.data.data._id}`);
      }
    } catch (err) {
      console.error("Transfer error:", err);
      toast.error(err.response?.data?.message || "Failed to transfer stock.");
    } finally {
      setTransferring(false);
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────
  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const StatusBadge = ({ status }) => {
    const colors = {
      draft: "bg-gray-100 text-gray-600",
      issued: "bg-blue-100 text-blue-700",
      "in-progress": "bg-amber-100 text-amber-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  const PartyBadge = ({ type }) => {
    const colors = type === "customer" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700";
    const icon = type === "customer" ? <FaUserFriends size={10} /> : <FaUserTie size={10} />;
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${colors}`}>
        {icon} {type === "customer" ? "Customer" : "Contractor"}
      </span>
    );
  };

  // ─── Group items by section → sub‑section ──────────────────────────
  const groupedItems = allItems.reduce((acc, item) => {
    const section = item.section || "Other Work";
    const subSection = item.subSection || "Main";
    if (!acc[section]) acc[section] = {};
    if (!acc[section][subSection]) acc[section][subSection] = [];
    acc[section][subSection].push(item);
    return acc;
  }, {});

  const warehouseOptions = warehouses.map(w => ({
    value: w._id,
    label: w.name || w.warehouseName || "Unnamed",
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10 pb-48">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.replace("/admin/construction/work-orders")}
              className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <FaArrowLeft size={18} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                <FaBoxes className="text-indigo-600" /> Stock Transfer
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                {selectedWorkOrderIds.length > 0
                  ? `${workOrders.length} work orders · ${allItems.length} items to transfer`
                  : "Select work orders to begin"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedWorkOrderIds([]);
                setAllItems([]);
                setSelectedItems([]);
                setItemWarehouses({});
                setIsSheetExpanded(false);
              }}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
            >
              <FaTimes size={12} /> Clear All
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferring || selectedItems.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transferring ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <FaCheck size={14} /> Transfer {selectedItems.length} Items
                </>
              )}
            </button>
          </div>
        </div>

        {/* Work Orders Selection Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FaFileContract className="text-indigo-600" /> Select Work Orders
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search WO or Project..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48 md:w-64 transition-all"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-indigo-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedWorkOrderIds.length === filteredWorkOrders.length && filteredWorkOrders.length > 0}
                    onChange={toggleAllWorkOrders}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="font-medium">Select All</span>
                </label>
                <button
                  onClick={() => {
                    if (selectedWorkOrderIds.length > 0) {
                      setSelectedWorkOrderIds([...selectedWorkOrderIds]);
                    }
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                >
                  <FaSync size={10} /> Refresh
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center w-10">#</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">WO #</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Party</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Items</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-gray-400 italic">
                      {searchTerm ? "No matching work orders found." : "No work orders found. Go to Work Orders page to create one."}
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((wo) => (
                    <tr
                      key={wo._id}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                      onClick={() => toggleWorkOrderSelection(wo._id)}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedWorkOrderIds.includes(wo._id)}
                          onChange={() => toggleWorkOrderSelection(wo._id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-3 font-bold text-indigo-600">{wo.workOrderNumber}</td>
                      <td className="px-6 py-3 font-medium text-gray-700">{wo.project?.name || "N/A"}</td>
                      <td className="px-6 py-3">
                        <PartyBadge type={wo.orderType === "customer" ? "customer" : "contractor"} />
                        <span className="ml-2 text-xs text-gray-600">
                          {wo.orderType === "customer"
                            ? wo.customer?.customerName || wo.customer?.name || "—"
                            : wo.contractor?.supplierName || wo.contractor?.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center"><StatusBadge status={wo.status} /></td>
                      <td className="px-6 py-3 text-center text-gray-500">
                        {(wo.items?.length || 0) + (wo.materials?.length || 0)}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-gray-800">
                        {formatCurrency(
                          (wo.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0) +
                          (wo.materials?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0)
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(wo);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                          <FaEye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Sheet – shows when items are selected */}
        {selectedWorkOrderIds.length > 0 && (
          <div
            className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 transition-transform duration-300 ease-out z-40 ${
              isSheetExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'
            }`}
            style={{ maxHeight: '85vh' }}
          >
            <div
              className="flex items-center justify-center p-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-3xl"
              onClick={() => setIsSheetExpanded(!isSheetExpanded)}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              <span className="ml-3 text-xs text-gray-400 font-medium">
                {isSheetExpanded ? 'Collapse' : 'Expand'}
              </span>
              <FaChevronUp
                className={`ml-2 text-gray-400 transition-transform duration-300 ${
                  isSheetExpanded ? 'rotate-180' : ''
                }`}
                size={14}
              />
            </div>

            <div className="px-4 sm:px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
              {/* Default Warehouse */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                      Default Warehouse
                    </label>
                    <Select
                      options={warehouseOptions}
                      value={defaultWarehouse}
                      onChange={setDefaultWarehouse}
                      placeholder="Select warehouse..."
                      className="text-sm"
                      isClearable
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: '#e5e7eb',
                          boxShadow: 'none',
                          '&:hover': { borderColor: '#6366f1' },
                          minHeight: '36px',
                        }),
                      }}
                    />
                  </div>
                  <button
                    onClick={applyWarehouseToAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all whitespace-nowrap"
                  >
                    <FaArrowRight size={10} /> Apply to All ({allItems.length})
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Work Orders</p>
                  <p className="text-xl font-bold text-gray-800">{workOrders.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">To Transfer</p>
                  <p className="text-xl font-bold text-gray-800">{allItems.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selected</p>
                  <p className="text-xl font-bold text-indigo-600">{selectedItems.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Amount</p>
                  <p className="text-xl font-bold text-gray-800">
                    {formatCurrency(
                      allItems
                        .filter((item) => selectedItems.includes(item._uniqueId))
                        .reduce((sum, item) => sum + (item.amount || 0), 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <FaBoxes className="text-indigo-600" /> Items to Transfer
                  </h3>
                  {allItems.length > 0 && (
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-indigo-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === allItems.length && allItems.length > 0}
                        onChange={toggleAllItems}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="font-medium">Select All</span>
                    </label>
                  )}
                </div>
                {allItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <FaBoxes className="text-4xl text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No items marked for transfer.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Go to Work Order and check the <strong>"Transfer"</strong> box for BOQ items,<br />
                      or add materials (they are automatically eligible).
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-2 py-2 text-center w-8">#</th>
                          <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">WO #</th>
                          <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">Source</th>
                          <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">Section</th>
                          <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">Sub‑Sec</th>
                          <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">Item</th>
                          <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">Description</th>
                          <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                          <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                          <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
                          <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                          <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">Warehouse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(groupedItems).map(([section, subSections]) => (
                          <React.Fragment key={section}>
                            <tr className="bg-indigo-50/30">
                              <td colSpan="12" className="px-3 py-1.5 text-xs font-bold text-indigo-700">
                                {section}
                              </td>
                            </tr>
                            {Object.entries(subSections).map(([subSection, items]) => (
                              <React.Fragment key={subSection}>
                                <tr className="bg-gray-50/50">
                                  <td colSpan="12" className="px-3 py-1 text-xs font-medium text-gray-500 pl-8">
                                    {subSection}
                                  </td>
                                </tr>
                                {items.map((item) => (
                                  <tr key={item._uniqueId} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="px-2 py-2 text-center">
                                      <input
                                        type="checkbox"
                                        checked={selectedItems.includes(item._uniqueId)}
                                        onChange={() => toggleItemSelection(item._uniqueId)}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-xs text-gray-500 font-medium">
                                      {item.workOrderNumber}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                        item.source === "items" 
                                          ? "bg-indigo-100 text-indigo-700" 
                                          : "bg-blue-100 text-blue-700"
                                      }`}>
                                        {item.source === "items" ? "BOQ" : "Material"}
                                      </span>
                                    </td>
                                    <td className="px-2 py-2 text-xs text-gray-500">{item.section || "—"}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500">{item.subSection || "—"}</td>
                                    <td className="px-2 py-2 text-xs font-medium text-gray-700">
                                      {item.itemName || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-gray-500">
                                      {item.description || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs text-gray-600">{item.unit}</td>
                                    <td className="px-2 py-2 text-center text-xs font-medium text-gray-700">{item.quantity}</td>
                                    <td className="px-2 py-2 text-center text-xs text-gray-600">{item.rate}</td>
                                    <td className="px-2 py-2 text-right text-xs font-bold text-gray-700">
                                      {formatCurrency(item.amount)}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <select
                                        value={itemWarehouses[item._uniqueId] || ""}
                                        onChange={(e) =>
                                          handleWarehouseChange(item._uniqueId, e.target.value)
                                        }
                                        className="bg-white border border-gray-300 text-gray-900 text-xs rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full max-w-[100px] p-1 transition-all"
                                      >
                                        <option value="">Select</option>
                                        {warehouses.map((warehouse) => (
                                          <option key={warehouse._id} value={warehouse._id}>
                                            {warehouse.name || warehouse.warehouseName}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal: Work Order Details ──────────────────────────────── */}
      {isModalOpen && selectedWorkOrder && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                  <FaFileContract size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">
                    {selectedWorkOrder.workOrderNumber}
                  </h2>
                  <p className="text-xs text-gray-400">{selectedWorkOrder.project?.name}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                <FaTimes size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {selectedWorkOrder.items?.length || 0} BOQ items, {(selectedWorkOrder.materials?.length || 0)} materials
                </span>
                <div className="flex items-center gap-2">
                  <PartyBadge type={selectedWorkOrder.orderType === "customer" ? "customer" : "contractor"} />
                  <StatusBadge status={selectedWorkOrder.status} />
                </div>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 w-10">#</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Section</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Sub‑Section</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
                      <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                      <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Transfer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ...(selectedWorkOrder.items || []).map((i) => ({ ...i, source: "items" })),
                      ...(selectedWorkOrder.materials || []).map((m) => ({ ...m, source: "materials" })),
                    ].map((item, idx) => {
                      const uniqueId = `${item._id}_${item.source}`;
                      const isEligible = 
                        (item.source === "items" && item.transferFromStock === true) ||
                        (item.source === "materials" && (item.transferFromStock === true || item.type === "material"));
                      return (
                        <tr key={uniqueId} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="px-4 py-2 text-center text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2 text-xs">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                              item.source === "items" 
                                ? "bg-indigo-100 text-indigo-700" 
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {item.source === "items" ? "BOQ" : "Material"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500">{item.section || "—"}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{item.subSection || "—"}</td>
                          <td className="px-4 py-2 text-xs text-gray-700">
                            {item.itemName || item.description || "—"}
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-600">{item.unit}</td>
                          <td className="px-3 py-2 text-center text-xs">{item.quantity}</td>
                          <td className="px-3 py-2 text-center text-xs">{item.rate}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold text-gray-700">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={modalSelectedItems.includes(uniqueId)}
                              onChange={() => toggleModalItem(uniqueId)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              disabled={!isEligible}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="px-5 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all">
                Cancel
              </button>
              <button
                onClick={addSelectedFromModal}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                <FaCheck size={12} /> Add Selected ({modalSelectedItems.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}