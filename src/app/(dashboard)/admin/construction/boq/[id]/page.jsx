"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaFileInvoice,
  FaPlus,
  FaTrash,
  FaCheck,
  FaFileContract,
  FaBoxes,
  FaChevronDown,
  FaChevronUp,
  FaUserTie,
  FaUserFriends,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

let idCounter = 0;
const generateId = () => ++idCounter;

export default function BOQDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  // ─── Main state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [boq, setBoq] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedMaterialSections, setExpandedMaterialSections] = useState({});

  // ─── Work Order Modal ────────────────────────────────────────────────
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [selectedSubSections, setSelectedSubSections] = useState([]);
  const [woItems, setWoItems] = useState([]);
  const [orderType, setOrderType] = useState("contractor"); // "contractor" or "customer"
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [woStatus, setWoStatus] = useState("draft");
  const [woDate, setWoDate] = useState(new Date().toISOString().split("T")[0]);
  const [woRemarks, setWoRemarks] = useState("");
  const [generatingWo, setGeneratingWo] = useState(false);

  // ─── Add Materials Modal ────────────────────────────────────────────
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [addItemsSection, setAddItemsSection] = useState("");
  const [addItemsSubSection, setAddItemsSubSection] = useState("");
  const [addItemsRows, setAddItemsRows] = useState([]);
  const [addItemsSelected, setAddItemsSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ─── Fetch BOQ + related data ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const boqRes = await api.get(`/construction/boq?id=${id}`, headers);
        const boqData = boqRes.data.data || boqRes.data;
        setBoq(boqData);

        try {
          const woRes = await api.get(`/construction/work-orders?boqId=${id}`, headers);
          setWorkOrders(woRes.data.data || woRes.data || []);
        } catch (err) {
          console.warn("⚠️ Work orders fetch failed:", err);
          setWorkOrders([]);
        }

        try {
          const supRes = await api.get("/suppliers", headers);
          const suppliersData = supRes.data?.data || supRes.data || [];
          setSuppliers(suppliersData);
        } catch (err) {
          console.error("❌ Failed to fetch suppliers:", err);
          toast.warning("Could not load suppliers.");
          setSuppliers([]);
        }

        try {
          const custRes = await api.get("/customers", headers);
          const customersData = custRes.data?.data || custRes.data || [];
          setCustomers(customersData);
        } catch (err) {
          console.error("❌ Failed to fetch customers:", err);
          toast.warning("Could not load customers.");
          setCustomers([]);
        }

        try {
          const pRes = await api.get("/construction/projects", headers);
          setProjects(pRes.data.data || pRes.data || []);
        } catch (err) {
          console.warn("⚠️ Projects fetch failed:", err);
          setProjects([]);
        }
      } catch (err) {
        console.error("❌ Error fetching BOQ details:", err);
        toast.error("Failed to load BOQ details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  // ─── Fetch general items ──────────────────────────────────────────────
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        setLoadingItems(true);
        const itemsRes = await api.get("/items", headers);
        let itemsData = itemsRes.data?.data || itemsRes.data || [];
        if (!Array.isArray(itemsData)) itemsData = [];
        setItems(itemsData);
      } catch (err) {
        console.error("Failed to fetch items:", err);
        toast.warning("Could not load item list.");
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────
  const getSectionSubSectionMap = () => {
    if (!boq) return {};
    const map = {};
    (boq.items || []).forEach(item => {
      const section = item.section || "Other Work";
      const subSection = item.subSection === "__SECTION_LEVEL__" ? "Section Materials" : (item.subSection || "Main");
      if (!map[section]) map[section] = {};
      if (!map[section][subSection]) map[section][subSection] = [];
      map[section][subSection].push(item);
    });
    return map;
  };

  const getMaterialsSectionMap = () => {
    if (!boq || !boq.materials) return {};
    const map = {};
    boq.materials.forEach(mat => {
      const section = mat.section || "Other Work";
      const subSection = mat.subSection || "Main";
      if (!map[section]) map[section] = {};
      if (!map[section][subSection]) map[section][subSection] = [];
      map[section][subSection].push(mat);
    });
    return map;
  };

  const sectionSubSectionMap = getSectionSubSectionMap();
  const materialSectionMap = getMaterialsSectionMap();

  const getItemsForSubSection = (section, subSection) => {
    return sectionSubSectionMap[section]?.[subSection] || [];
  };

  const getMaterialsForSubSection = (section, subSection) => {
    if (!boq || !boq.materials) return [];
    return boq.materials.filter(mat => {
      const matSection = mat.section || "Other Work";
      const matSub = mat.subSection || "Main";
      return matSection === section && matSub === subSection;
    });
  };

  const getAllSubSectionOptions = () => {
    const options = [];
    const seen = new Set();

    Object.keys(sectionSubSectionMap).forEach(section => {
      Object.keys(sectionSubSectionMap[section]).forEach(subSection => {
        if (subSection === "Section Materials") return;
        const key = `${section}||${subSection}`;
        if (!seen.has(key)) {
          seen.add(key);
          options.push({ value: key, label: `${section} → ${subSection}`, section, subSection });
        }
      });
    });

    if (boq && boq.materials) {
      boq.materials.forEach(mat => {
        const section = mat.section || "Other Work";
        const subSection = mat.subSection || "Main";
        const key = `${section}||${subSection}`;
        if (!seen.has(key)) {
          seen.add(key);
          options.push({ value: key, label: `${section} → ${subSection} (materials)`, section, subSection });
        }
      });
    }
    return options;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleMaterialSection = (section) => {
    setExpandedMaterialSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getWorkOrdersForSection = (sectionName) => {
    return workOrders.filter(wo =>
      wo.items.some(item => item.section === sectionName)
    );
  };

  // ─── Work Order ──────────────────────────────────────────────────────
  const openWoModal = (preselected) => {
    let selected = [];
    if (preselected === "All") {
      selected = getAllSubSectionOptions().map(opt => opt.value);
    } else if (typeof preselected === "string") {
      const opts = getAllSubSectionOptions().filter(opt => opt.section === preselected);
      selected = opts.map(opt => opt.value);
    } else if (Array.isArray(preselected)) {
      selected = preselected;
    }

    const allItems = [];
    selected.forEach(key => {
      const [section, subSection] = key.split("||");
      const boqItems = getItemsForSubSection(section, subSection);
      boqItems.forEach(item => {
        allItems.push({
          _id: generateId(),
          boqItemId: item._id,
          itemName: item.itemName || "",
          description: item.description || "",
          unit: item.unit || "nos",
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          section: item.section || section,
          subSection: item.subSection || subSection,
          subSectionIndex: item.subSectionIndex || 1,
          isMaterial: false,
        });
      });

      const materials = getMaterialsForSubSection(section, subSection);
      materials.forEach(mat => {
        allItems.push({
          _id: generateId(),
          boqItemId: null,
          itemId: mat.itemId || null,
          itemName: mat.itemName || "",
          description: mat.description || "",
          unit: mat.unit || "nos",
          quantity: mat.quantity || 0,
          rate: mat.rate || 0,
          amount: mat.amount || 0,
          section: mat.section || section,
          subSection: mat.subSection || subSection,
          subSectionIndex: mat.subSectionIndex || 1,
          isMaterial: true,
        });
      });
    });

    setWoItems(allItems);
    setSelectedSubSections(selected);
    setSelectedContractor(null);
    setSelectedCustomer(null);
    setOrderType("contractor"); // default
    setWoStatus("draft");
    setWoDate(new Date().toISOString().split("T")[0]);
    setWoRemarks("");
    setIsWoModalOpen(true);
  };

  const handleSubSectionSelection = (selectedOptions) => {
    const selected = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
    setSelectedSubSections(selected);
    const allItems = [];
    selected.forEach(key => {
      const [section, subSection] = key.split("||");
      const boqItems = getItemsForSubSection(section, subSection);
      boqItems.forEach(item => {
        allItems.push({
          _id: generateId(),
          boqItemId: item._id,
          itemName: item.itemName || "",
          description: item.description || "",
          unit: item.unit || "nos",
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          section: item.section || section,
          subSection: item.subSection || subSection,
          subSectionIndex: item.subSectionIndex || 1,
          isMaterial: false,
        });
      });
      const materials = getMaterialsForSubSection(section, subSection);
      materials.forEach(mat => {
        allItems.push({
          _id: generateId(),
          boqItemId: null,
          itemId: mat.itemId || null,
          itemName: mat.itemName || "",
          description: mat.description || "",
          unit: mat.unit || "nos",
          quantity: mat.quantity || 0,
          rate: mat.rate || 0,
          amount: mat.amount || 0,
          section: mat.section || section,
          subSection: mat.subSection || subSection,
          subSectionIndex: mat.subSectionIndex || 1,
          isMaterial: true,
        });
      });
    });
    setWoItems(allItems);
  };

  const handleGenerateWo = async (e) => {
    e.preventDefault();

    const validItems = woItems.filter(item => item.itemName && item.itemName.trim() !== "");
    if (validItems.length === 0) {
      toast.error("No valid items to create work order.");
      return;
    }

    // Validate based on order type
    if (orderType === "contractor" && !selectedContractor) {
      toast.error("Please select a contractor.");
      return;
    }
    if (orderType === "customer" && !selectedCustomer) {
      toast.error("Please select a customer.");
      return;
    }

    // Split into BOQ items and materials
    const boqItems = validItems.filter(item => !item.isMaterial);
    const materialItems = validItems.filter(item => item.isMaterial);

    setGeneratingWo(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        project: boq.project._id,
        boq: boq._id,
        orderType: orderType,
        contractor: orderType === "contractor" ? selectedContractor?.value : null,
        customer: orderType === "customer" ? selectedCustomer?.value : null,
        workOrderNumber: `WO-${Date.now().toString().slice(-6)}`,
        status: woStatus,
        issuedDate: woDate,
        items: boqItems.map(({ boqItemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex }) => ({
          boqItemId,
          itemName,
          description: description || itemName,
          unit,
          quantity: parseFloat(quantity) || 0,
          rate: parseFloat(rate) || 0,
          amount: parseFloat(amount) || 0,
          section: section || "Other Work",
          subSection: subSection || "Main",
          subSectionIndex: subSectionIndex || 1,
          transferFromStock: false,
        })),
        materials: materialItems.map(({ itemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex }) => ({
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
          isRateOnly: false,
          type: "material",
          transferFromStock: false,
        })),
        remarks: woRemarks,
      };

      const res = await api.post("/construction/work-orders", payload, headers);
      const newWO = res.data.data || res.data;
      setWorkOrders(prev => [...prev, newWO]);
      toast.success("Work order created successfully!");
      setIsWoModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create work order.");
    } finally {
      setGeneratingWo(false);
    }
  };

  // ─── Add Materials ──────────────────────────────────────────────────
  const openAddItemsModal = (sectionName) => {
    const sections = Object.keys(sectionSubSectionMap);
    setAddItemsSection(sectionName || (sections.length > 0 ? sections[0] : ""));
    setAddItemsSubSection("__SECTION_LEVEL__");
    setAddItemsRows([]);
    setAddItemsSelected([]);
    setSearchTerm("");
    setIsAddItemsModalOpen(true);
  };

  const handleAddItemsSelect = (selectedOptions) => {
    setAddItemsSelected(selectedOptions || []);
    const newRows = (selectedOptions || []).map((opt) => ({
      _id: generateId(),
      itemId: opt.value,
      itemName: opt.label,
      description: opt.description || "",
      unit: opt.unit || "nos",
      quantity: 1,
      rate: 0,
    }));
    setAddItemsRows(newRows);
  };

  const handleAddItemsRowChange = (id, field, value) => {
    setAddItemsRows(prev =>
      prev.map(row => {
        if (row._id !== id) return row;
        return { ...row, [field]: value };
      })
    );
  };

  const handleAddItemsSubmit = async (e) => {
    e.preventDefault();
    const validRows = addItemsRows.filter(row => row.itemName && row.itemName.trim() !== "");
    if (validRows.length === 0) {
      toast.error("Please add at least one material with a name.");
      return;
    }

    const newMaterials = validRows.map(row => ({
      itemId: row.itemId || null,
      itemName: row.itemName.trim(),
      quantity: parseFloat(row.quantity) || 0,
      unit: row.unit.trim() || "nos",
      rate: parseFloat(row.rate) || 0,
      amount: (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0),
      section: addItemsSection,
      subSection: addItemsSubSection === "__SECTION_LEVEL__" ? "Section Materials" : addItemsSubSection,
      subSectionIndex: 0,
      isRateOnly: false,
      type: "material",
    }));

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const currentMaterials = boq.materials || [];
      const updatedMaterials = [...currentMaterials, ...newMaterials];
      const payload = {
        project: boq.project._id,
        contractor: boq.contractor?._id || null,
        boqNumber: boq.boqNumber,
        date: boq.date,
        status: boq.status,
        remarks: boq.remarks || "",
        items: boq.items || [],
        materials: updatedMaterials,
        taxVAT: boq.taxVAT || 0,
        taxService: boq.taxService || 0,
      };
      const res = await api.put(`/construction/boq/${boq._id}`, payload, headers);
      if (res.data.success) {
        toast.success(`${newMaterials.length} materials added successfully!`);
        const refreshed = await api.get(`/construction/boq?id=${boq._id}`, headers);
        setBoq(refreshed.data.data || refreshed.data);
        setIsAddItemsModalOpen(false);
        setAddItemsRows([]);
        setAddItemsSelected([]);
        setSearchTerm("");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to add materials.");
    }
  };

  const goToProgressBilling = () => {
    router.push(`/admin/construction/progress-billing?boqId=${id}`);
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

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  // ─── Build dropdown options ──────────────────────────────────────────
  const subSectionOptions = getAllSubSectionOptions();
  const itemOptions = items.map(item => ({
    value: item._id,
    label: item.itemName || item.name || "Unnamed",
    unit: item.uom || item.unit || "nos",
    description: item.description || "",
  }));

  const filteredItemOptions = searchTerm
    ? itemOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : itemOptions;

  const sectionOptions = Object.keys(sectionSubSectionMap).map(sec => ({
    value: sec,
    label: sec,
  }));

  const subSectionChoices = addItemsSection
    ? Object.keys(sectionSubSectionMap[addItemsSection] || {})
        .filter(sub => sub !== "Section Materials")
        .map(sub => ({ value: sub, label: sub }))
    : [];

  const supplierOptions = suppliers.map(s => ({
    value: s._id,
    label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id,
  }));

  const customerOptions = customers.map(c => ({
    value: c._id,
    label: c.customerName || c.name || c.contactPersonName || c._id,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading BOQ details...</div>
      </div>
    );
  }

  if (!boq) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">BOQ not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> BOQ: {boq.boqNumber}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Project: {boq.project?.name} · Contractor: {boq.contractor?.supplierName || boq.contractor?.name || "—"} · Total: {formatCurrency(boq.totalAmount)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToProgressBilling}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
            >
              <FaFileInvoice size={12} /> Generate Invoice
            </button>
            <button
              onClick={() => openWoModal("All")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              <FaFileContract size={12} /> Create Work Order (All)
            </button>
          </div>
        </div>

        {/* ─── BOQ Items Sections ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {Object.keys(sectionSubSectionMap).map((sectionName) => {
            const subSections = sectionSubSectionMap[sectionName];
            const allItems = Object.values(subSections).flat();
            const woList = getWorkOrdersForSection(sectionName);
            const isExpanded = expandedSections[sectionName] ?? true;

            return (
              <div key={sectionName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div
                  className="px-6 py-4 bg-indigo-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-indigo-50/80 transition-colors"
                  onClick={() => toggleSection(sectionName)}
                >
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-gray-400 hover:text-indigo-600">
                      {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                    </button>
                    <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
                    <span className="text-xs text-gray-400">({allItems.length} items)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openWoModal(sectionName); }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors"
                    >
                      <FaFileContract size={10} /> WO
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddItemsModal(sectionName);
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
                    >
                      <FaPlus size={10} /> Add Materials
                    </button>
                    <span className="text-xs text-gray-400">WO: {woList.length}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 space-y-4">
                    {Object.keys(subSections).map((subSectionName) => {
                      const items = subSections[subSectionName];
                      if (subSectionName === "Section Materials") return null;
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
                                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Item</th>
                                  <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                                  <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                                  <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
                                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {items.map((item) => (
                                  <tr key={item._id} className="hover:bg-indigo-50/20">
                                    <td className="px-3 py-2 text-xs text-gray-700">{item.itemName}</td>
                                    <td className="px-3 py-2 text-center text-xs text-gray-600">{item.unit}</td>
                                    <td className="px-3 py-2 text-center text-xs text-gray-700">{item.quantity}</td>
                                    <td className="px-3 py-2 text-center text-xs text-gray-700">{item.rate}</td>
                                    <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{formatCurrency(item.amount)}</td>
                                  </tr>
                                ))}
                                <tr className="bg-indigo-50/30">
                                  <td colSpan="4" className="px-3 py-2 text-right text-xs font-bold text-indigo-600">Sub‑Section Total</td>
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

                    {subSections["Section Materials"] && subSections["Section Materials"].length > 0 && (
                      <div className="ml-4 border-l-2 border-indigo-200 pl-4 mt-4 pt-2 border-t border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">📦 Section Materials</span>
                          <span className="text-[10px] text-gray-400">({subSections["Section Materials"].length} items)</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Item</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {subSections["Section Materials"].map((item) => (
                                <tr key={item._id} className="hover:bg-blue-50/20">
                                  <td className="px-3 py-2 text-xs text-gray-700">{item.itemName}</td>
                                  <td className="px-3 py-2 text-center text-xs text-gray-600">{item.unit}</td>
                                  <td className="px-3 py-2 text-center text-xs text-gray-700">{item.quantity}</td>
                                  <td className="px-3 py-2 text-center text-xs text-gray-700">{item.rate}</td>
                                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{formatCurrency(item.amount)}</td>
                                </tr>
                              ))}
                              <tr className="bg-blue-50/30">
                                <td colSpan="4" className="px-3 py-2 text-right text-xs font-bold text-blue-600">Section Materials Total</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-blue-700">
                                  {formatCurrency(subSections["Section Materials"].reduce((sum, i) => sum + (i.amount || 0), 0))}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end items-center mt-2 pt-2 border-t-2 border-indigo-200">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
                        Section Total ({allItems.length} items)
                      </span>
                      <span className="text-sm font-extrabold text-indigo-700">
                        {formatCurrency(allItems.reduce((sum, i) => sum + (i.amount || 0), 0))}
                      </span>
                    </div>

                    {woList.length > 0 && (
                      <div className="border-t border-gray-200 pt-3 mt-2">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Work Orders</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">WO #</th>
                                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">Type</th>
                                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">Contractor / Customer</th>
                                <th className="px-2 py-1 text-center text-[9px] font-bold uppercase text-gray-400">Status</th>
                                <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">Amount</th>
                                <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {woList.map(wo => (
                                <tr key={wo._id} className="hover:bg-indigo-50/20">
                                  <td className="px-2 py-1 font-medium text-indigo-600">{wo.workOrderNumber}</td>
                                  <td className="px-2 py-1 text-xs font-medium text-gray-500 capitalize">{wo.orderType || "contractor"}</td>
                                  <td className="px-2 py-1 text-gray-600">
                                    {wo.orderType === "customer" 
                                      ? wo.customer?.customerName || wo.customer?.name || "—"
                                      : wo.contractor?.supplierName || wo.contractor?.name || "—"}
                                  </td>
                                  <td className="px-2 py-1 text-center"><StatusBadge status={wo.status} /></td>
                                  <td className="px-2 py-1 text-right font-bold">{formatCurrency(wo.items.reduce((s, i) => s + (i.amount || 0), 0))}</td>
                                  <td className="px-2 py-1 text-right">
                                    <button
                                      onClick={() => router.push(`/admin/construction/work-orders/${wo._id}`)}
                                      className="text-gray-400 hover:text-indigo-600"
                                    >
                                      <HiDotsVertical size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Additional Materials Section ─────────────────────────────── */}
        {Object.keys(materialSectionMap).length > 0 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                <FaBoxes className="text-blue-600" /> Additional Materials
              </h2>
              <button
                onClick={() => openAddItemsModal("")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
              >
                <FaPlus size={12} /> Add Materials
              </button>
            </div>

            {Object.keys(materialSectionMap).map((sectionName) => {
              const subSections = materialSectionMap[sectionName];
              const allMaterials = Object.values(subSections).flat();
              const isExpanded = expandedMaterialSections[sectionName] ?? true;

              return (
                <div key={`mat-${sectionName}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div
                    className="px-6 py-4 bg-blue-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/80 transition-colors"
                    onClick={() => toggleMaterialSection(sectionName)}
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-gray-400 hover:text-blue-600">
                        {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                      </button>
                      <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
                      <span className="text-xs text-gray-400">({allMaterials.length} materials)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddItemsModal(sectionName);
                        }}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
                      >
                        <FaPlus size={10} /> Add
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 space-y-4">
                      {Object.keys(subSections).map((subSectionName) => {
                        const materials = subSections[subSectionName];
                        return (
                          <div key={`mat-${sectionName}-${subSectionName}`} className="ml-4 border-l-2 border-blue-200 pl-4">
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
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Material</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {materials.map((mat) => (
                                    <tr key={mat._id} className="hover:bg-blue-50/20">
                                      <td className="px-3 py-2 text-xs text-gray-700">{mat.itemName}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600">{mat.unit}</td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-700">{mat.quantity}</td>
                                      <td className="px-3 py-2 text-center text-xs text-gray-700">{mat.rate}</td>
                                      <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{formatCurrency(mat.amount)}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-blue-50/30">
                                    <td colSpan="4" className="px-3 py-2 text-right text-xs font-bold text-blue-600">Sub‑Section Total</td>
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

        {Object.keys(materialSectionMap).length === 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <FaBoxes className="text-gray-300 text-4xl mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No additional materials added yet.</p>
            <button
              onClick={() => openAddItemsModal("")}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              <FaPlus size={12} /> Add Materials
            </button>
          </div>
        )}
      </div>

      {/* ─── Work Order Modal ─────────────────────────────────────────── */}
      {isWoModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm"><FaFileContract size={20} /></div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Create Work Order</h2>
            </div>
            <form onSubmit={handleGenerateWo} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Sub‑Sections" req />
                  <Select
                    options={subSectionOptions}
                    value={subSectionOptions.filter(opt => selectedSubSections.includes(opt.value))}
                    onChange={handleSubSectionSelection}
                    placeholder="Select sub‑sections..."
                    isMulti
                    className="text-sm"
                  />
                </div>

                {/* ─── Order Type Toggle ─── */}
                <div>
                  <Lbl text="Order Type" req />
                  <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                        orderType === "contractor"
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setOrderType("contractor");
                        setSelectedCustomer(null);
                      }}
                    >
                      <FaUserTie className="inline mr-2" size={14} /> Contractor
                    </button>
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                        orderType === "customer"
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setOrderType("customer");
                        setSelectedContractor(null);
                      }}
                    >
                      <FaUserFriends className="inline mr-2" size={14} /> Customer
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Contractor / Customer Dropdown ─── */}
              <div>
                {orderType === "contractor" ? (
                  <div>
                    <Lbl text="Contractor" req />
                    <Select
                      options={supplierOptions}
                      value={selectedContractor}
                      onChange={setSelectedContractor}
                      placeholder="Select contractor..."
                      className="text-sm"
                      isClearable
                      noOptionsMessage={() => supplierOptions.length === 0 ? "No suppliers found" : "No matches"}
                    />
                  </div>
                ) : (
                  <div>
                    <Lbl text="Customer" req />
                    <Select
                      options={customerOptions}
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      placeholder="Select customer..."
                      className="text-sm"
                      isClearable
                      noOptionsMessage={() => customerOptions.length === 0 ? "No customers found" : "No matches"}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Status" />
                  <select className={fi} value={woStatus} onChange={e => setWoStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="in-progress">In Progress</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Issue Date" />
                  <input type="date" className={fi} value={woDate} onChange={e => setWoDate(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Lbl text="Remarks" />
                  <input type="text" className={fi} value={woRemarks} onChange={e => setWoRemarks(e.target.value)} placeholder="Notes..." />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Items ({woItems.length})
                </p>
                {woItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Select at least one sub‑section to see items.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[120px]">Section</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[100px]">Sub‑Section</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[150px]">Item Name</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[60px]">Type</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[150px]">Description</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Unit</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Qty</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Rate</th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-400">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {woItems.map(item => (
                          <tr key={item._id}>
                            <td className="px-3 py-2 text-xs text-gray-500">{item.section}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{item.subSection}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{item.itemName}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {item.isMaterial ? <span className="text-blue-600">Material</span> : <span className="text-indigo-600">BOQ</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-700">{item.description}</td>
                            <td className="px-3 py-2 text-center text-xs">{item.unit}</td>
                            <td className="px-3 py-2 text-center text-xs">{item.quantity}</td>
                            <td className="px-3 py-2 text-center text-xs">{item.rate}</td>
                            <td className="px-3 py-2 text-right text-xs font-bold text-gray-700">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsWoModalOpen(false)} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                <button
                  type="submit"
                  disabled={generatingWo || woItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {generatingWo ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaCheck size={12} />}
                  {generatingWo ? "Creating..." : "Create Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add Materials Modal ────────────────────────────────────────── */}
      {isAddItemsModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-blue-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                <FaPlus size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Add Materials</h2>
            </div>
            <form onSubmit={handleAddItemsSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <Lbl text="Section" req />
                <Select
                  options={sectionOptions}
                  value={sectionOptions.find(opt => opt.value === addItemsSection) || null}
                  onChange={(opt) => {
                    setAddItemsSection(opt?.value || "");
                    setAddItemsSubSection("__SECTION_LEVEL__");
                  }}
                  placeholder="Select section..."
                  className="text-sm"
                  isClearable
                />
              </div>
              <div>
                <Lbl text="Sub‑Section (optional)" />
                <Select
                  options={subSectionChoices}
                  value={subSectionChoices.find(opt => opt.value === addItemsSubSection) || null}
                  onChange={(opt) => setAddItemsSubSection(opt?.value || "__SECTION_LEVEL__")}
                  placeholder="Select sub‑section..."
                  className="text-sm"
                  isClearable
                  isDisabled={!addItemsSection}
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty to add at section level.</p>
              </div>
              <div>
                <Lbl text="Search Materials" />
                <input
                  type="text"
                  className={fi}
                  placeholder="Type to filter materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Lbl text="Select Materials" req />
                <Select
                  options={filteredItemOptions}
                  value={addItemsSelected}
                  onChange={handleAddItemsSelect}
                  placeholder="Select materials..."
                  isMulti
                  isSearchable
                  className="text-sm"
                  noOptionsMessage={() => filteredItemOptions.length === 0 ? "No items found" : "No matches"}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Materials to add</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddItemsRows(prev => [
                        ...prev,
                        { _id: generateId(), itemId: null, itemName: "", description: "", unit: "nos", quantity: 1, rate: 0 },
                      ]);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <FaPlus size={10} /> Add Row
                  </button>
                </div>
                {addItemsRows.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[180px]">Material</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[80px]">Unit</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Qty</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Rate</th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-400">Amount</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">#</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {addItemsRows.map((row) => {
                          const selectedOption = itemOptions.find(opt => opt.value === row.itemId) || null;
                          return (
                            <tr key={row._id}>
                              <td className="px-3 py-2">
                                <Select
                                  options={itemOptions}
                                  value={selectedOption}
                                  onChange={(selected) => {
                                    setAddItemsRows(prev =>
                                      prev.map(r => {
                                        if (r._id !== row._id) return r;
                                        return {
                                          ...r,
                                          itemId: selected?.value || null,
                                          itemName: selected?.label || "",
                                          unit: selected?.unit || "nos",
                                          description: selected?.description || "",
                                        };
                                      })
                                    );
                                  }}
                                  placeholder="Search or select item..."
                                  isSearchable
                                  isClearable
                                  className="text-xs"
                                  styles={{
                                    control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
                                    menu: (base) => ({ ...base, fontSize: '12px' }),
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none"
                                  value={row.unit}
                                  onChange={(e) => handleAddItemsRowChange(row._id, "unit", e.target.value)}
                                  placeholder="e.g. nos"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="any"
                                  className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
                                  value={row.quantity}
                                  onChange={(e) => handleAddItemsRowChange(row._id, "quantity", e.target.value)}
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="any"
                                  className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
                                  value={row.rate}
                                  onChange={(e) => handleAddItemsRowChange(row._id, "rate", e.target.value)}
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-gray-700">
                                {formatCurrency((parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0))}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddItemsRows(prev => prev.filter(r => r._id !== row._id));
                                    if (row.itemId) {
                                      setAddItemsSelected(prev =>
                                        prev.filter(opt => opt.value !== row.itemId)
                                      );
                                    }
                                  }}
                                  className="text-gray-300 hover:text-red-500 transition-colors"
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
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4 border border-gray-200 rounded-xl">
                    No materials added yet. Select from the dropdown or click "Add Row".
                  </p>
                )}
              </div>
              <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddItemsModalOpen(false); setSearchTerm(""); }}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addItemsRows.length === 0}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
                >
                  <FaCheck size={12} /> Add {addItemsRows.length} Materials
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
// import { useParams, useRouter } from "next/navigation";
// import api from "@/lib/api";
// import Select from "react-select";
// import {
//   FaFileInvoice,
//   FaPlus,
//   FaTrash,
//   FaCheck,
//   FaFileContract,
//   FaBoxes,
//   FaChevronDown,
//   FaChevronUp,
// } from "react-icons/fa";
// import { HiDotsVertical } from "react-icons/hi";
// import { toast } from "react-toastify";

// let idCounter = 0;
// const generateId = () => ++idCounter;

// export default function BOQDetailsPage() {
//   const { id } = useParams();
//   const router = useRouter();

//   // ─── Main state ──────────────────────────────────────────────────────
//   const [loading, setLoading] = useState(true);
//   const [boq, setBoq] = useState(null);
//   const [workOrders, setWorkOrders] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [items, setItems] = useState([]);
//   const [loadingItems, setLoadingItems] = useState(false);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [expandedMaterialSections, setExpandedMaterialSections] = useState({});

//   // ─── Work Order Modal ────────────────────────────────────────────────
//   const [isWoModalOpen, setIsWoModalOpen] = useState(false);
//   const [selectedSubSections, setSelectedSubSections] = useState([]);
//   const [woItems, setWoItems] = useState([]);
//   const [selectedContractor, setSelectedContractor] = useState(null);
//   const [woStatus, setWoStatus] = useState("draft");
//   const [woDate, setWoDate] = useState(new Date().toISOString().split("T")[0]);
//   const [woRemarks, setWoRemarks] = useState("");
//   const [generatingWo, setGeneratingWo] = useState(false);

//   // ─── Add Materials Modal ────────────────────────────────────────────
//   const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
//   const [addItemsSection, setAddItemsSection] = useState("");
//   const [addItemsSubSection, setAddItemsSubSection] = useState("");
//   const [addItemsRows, setAddItemsRows] = useState([]);
//   const [addItemsSelected, setAddItemsSelected] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");

//   // ─── Fetch BOQ + related data ──────────────────────────────────────
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/login");
//           return;
//         }
//         const headers = { headers: { Authorization: `Bearer ${token}` } };

//         const boqRes = await api.get(`/construction/boq?id=${id}`, headers);
//         const boqData = boqRes.data.data || boqRes.data;
//         setBoq(boqData);

//         try {
//           const woRes = await api.get(`/construction/work-orders?boqId=${id}`, headers);
//           setWorkOrders(woRes.data.data || woRes.data || []);
//         } catch (err) {
//           console.warn("⚠️ Work orders fetch failed:", err);
//           setWorkOrders([]);
//         }

//         try {
//           const supRes = await api.get("/suppliers", headers);
//           const suppliersData = supRes.data?.data || supRes.data || [];
//           setSuppliers(suppliersData);
//         } catch (err) {
//           console.error("❌ Failed to fetch suppliers:", err);
//           toast.warning("Could not load suppliers.");
//           setSuppliers([]);
//         }

//         try {
//           const pRes = await api.get("/construction/projects", headers);
//           setProjects(pRes.data.data || pRes.data || []);
//         } catch (err) {
//           console.warn("⚠️ Projects fetch failed:", err);
//           setProjects([]);
//         }
//       } catch (err) {
//         console.error("❌ Error fetching BOQ details:", err);
//         toast.error("Failed to load BOQ details.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [id, router]);

//   // ─── Fetch general items ──────────────────────────────────────────────
//   useEffect(() => {
//     const fetchItems = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) return;
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         setLoadingItems(true);
//         const itemsRes = await api.get("/items", headers);
//         let itemsData = itemsRes.data?.data || itemsRes.data || [];
//         if (!Array.isArray(itemsData)) itemsData = [];
//         setItems(itemsData);
//       } catch (err) {
//         console.error("Failed to fetch items:", err);
//         toast.warning("Could not load item list.");
//         setItems([]);
//       } finally {
//         setLoadingItems(false);
//       }
//     };
//     fetchItems();
//   }, []);

//   // ─── Helpers ──────────────────────────────────────────────────────────
//   const getSectionSubSectionMap = () => {
//     if (!boq) return {};
//     const map = {};
//     (boq.items || []).forEach(item => {
//       const section = item.section || "Other Work";
//       const subSection = item.subSection === "__SECTION_LEVEL__" ? "Section Materials" : (item.subSection || "Main");
//       if (!map[section]) map[section] = {};
//       if (!map[section][subSection]) map[section][subSection] = [];
//       map[section][subSection].push(item);
//     });
//     return map;
//   };

//   const getMaterialsSectionMap = () => {
//     if (!boq || !boq.materials) return {};
//     const map = {};
//     boq.materials.forEach(mat => {
//       const section = mat.section || "Other Work";
//       const subSection = mat.subSection || "Main";
//       if (!map[section]) map[section] = {};
//       if (!map[section][subSection]) map[section][subSection] = [];
//       map[section][subSection].push(mat);
//     });
//     return map;
//   };

//   const sectionSubSectionMap = getSectionSubSectionMap();
//   const materialSectionMap = getMaterialsSectionMap();

//   const getItemsForSubSection = (section, subSection) => {
//     return sectionSubSectionMap[section]?.[subSection] || [];
//   };

//   const getMaterialsForSubSection = (section, subSection) => {
//     if (!boq || !boq.materials) return [];
//     return boq.materials.filter(mat => {
//       const matSection = mat.section || "Other Work";
//       const matSub = mat.subSection || "Main";
//       return matSection === section && matSub === subSection;
//     });
//   };

//   const getAllSubSectionOptions = () => {
//     const options = [];
//     const seen = new Set();

//     Object.keys(sectionSubSectionMap).forEach(section => {
//       Object.keys(sectionSubSectionMap[section]).forEach(subSection => {
//         if (subSection === "Section Materials") return;
//         const key = `${section}||${subSection}`;
//         if (!seen.has(key)) {
//           seen.add(key);
//           options.push({ value: key, label: `${section} → ${subSection}`, section, subSection });
//         }
//       });
//     });

//     if (boq && boq.materials) {
//       boq.materials.forEach(mat => {
//         const section = mat.section || "Other Work";
//         const subSection = mat.subSection || "Main";
//         const key = `${section}||${subSection}`;
//         if (!seen.has(key)) {
//           seen.add(key);
//           options.push({ value: key, label: `${section} → ${subSection} (materials)`, section, subSection });
//         }
//       });
//     }
//     return options;
//   };

//   const toggleSection = (section) => {
//     setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
//   };

//   const toggleMaterialSection = (section) => {
//     setExpandedMaterialSections(prev => ({ ...prev, [section]: !prev[section] }));
//   };

//   const getWorkOrdersForSection = (sectionName) => {
//     return workOrders.filter(wo =>
//       wo.items.some(item => item.section === sectionName)
//     );
//   };

//   // ─── Work Order ──────────────────────────────────────────────────────
//   const openWoModal = (preselected) => {
//     let selected = [];
//     if (preselected === "All") {
//       selected = getAllSubSectionOptions().map(opt => opt.value);
//     } else if (typeof preselected === "string") {
//       const opts = getAllSubSectionOptions().filter(opt => opt.section === preselected);
//       selected = opts.map(opt => opt.value);
//     } else if (Array.isArray(preselected)) {
//       selected = preselected;
//     }

//     const allItems = [];
//     selected.forEach(key => {
//       const [section, subSection] = key.split("||");
//       const boqItems = getItemsForSubSection(section, subSection);
//       boqItems.forEach(item => {
//         allItems.push({
//           _id: generateId(),
//           boqItemId: item._id,
//           itemName: item.itemName || "",
//           description: item.description || "",
//           unit: item.unit || "nos",
//           quantity: item.quantity || 0,
//           rate: item.rate || 0,
//           amount: item.amount || 0,
//           section: item.section || section,
//           subSection: item.subSection || subSection,
//           subSectionIndex: item.subSectionIndex || 1,
//           isMaterial: false,
//         });
//       });

//       const materials = getMaterialsForSubSection(section, subSection);
//       materials.forEach(mat => {
//         allItems.push({
//           _id: generateId(),
//           boqItemId: null,
//           itemId: mat.itemId || null, // ✅ preserve itemId
//           itemName: mat.itemName || "",
//           description: mat.description || "",
//           unit: mat.unit || "nos",
//           quantity: mat.quantity || 0,
//           rate: mat.rate || 0,
//           amount: mat.amount || 0,
//           section: mat.section || section,
//           subSection: mat.subSection || subSection,
//           subSectionIndex: mat.subSectionIndex || 1,
//           isMaterial: true,
//         });
//       });
//     });

//     setWoItems(allItems);
//     setSelectedSubSections(selected);
//     setSelectedContractor(null);
//     setWoStatus("draft");
//     setWoDate(new Date().toISOString().split("T")[0]);
//     setWoRemarks("");
//     setIsWoModalOpen(true);
//   };

//   const handleSubSectionSelection = (selectedOptions) => {
//     const selected = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
//     setSelectedSubSections(selected);
//     const allItems = [];
//     selected.forEach(key => {
//       const [section, subSection] = key.split("||");
//       const boqItems = getItemsForSubSection(section, subSection);
//       boqItems.forEach(item => {
//         allItems.push({
//           _id: generateId(),
//           boqItemId: item._id,
//           itemName: item.itemName || "",
//           description: item.description || "",
//           unit: item.unit || "nos",
//           quantity: item.quantity || 0,
//           rate: item.rate || 0,
//           amount: item.amount || 0,
//           section: item.section || section,
//           subSection: item.subSection || subSection,
//           subSectionIndex: item.subSectionIndex || 1,
//           isMaterial: false,
//         });
//       });
//       const materials = getMaterialsForSubSection(section, subSection);
//       materials.forEach(mat => {
//         allItems.push({
//           _id: generateId(),
//           boqItemId: null,
//           itemId: mat.itemId || null, // ✅ preserve itemId
//           itemName: mat.itemName || "",
//           description: mat.description || "",
//           unit: mat.unit || "nos",
//           quantity: mat.quantity || 0,
//           rate: mat.rate || 0,
//           amount: mat.amount || 0,
//           section: mat.section || section,
//           subSection: mat.subSection || subSection,
//           subSectionIndex: mat.subSectionIndex || 1,
//           isMaterial: true,
//         });
//       });
//     });
//     setWoItems(allItems);
//   };

//   const handleGenerateWo = async (e) => {
//     e.preventDefault();

//     const validItems = woItems.filter(item => item.itemName && item.itemName.trim() !== "");
//     if (validItems.length === 0) {
//       toast.error("No valid items to create work order.");
//       return;
//     }

//     // Split into BOQ items and materials
//     const boqItems = validItems.filter(item => !item.isMaterial);
//     const materialItems = validItems.filter(item => item.isMaterial);

//     setGeneratingWo(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };

//       const payload = {
//         project: boq.project._id,
//         boq: boq._id,
//         contractor: selectedContractor?.value || null,
//         workOrderNumber: `WO-${Date.now().toString().slice(-6)}`,
//         status: woStatus,
//         issuedDate: woDate,
//         // ✅ BOQ items
//         items: boqItems.map(({ boqItemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex }) => ({
//           boqItemId,
//           itemName,
//           description: description || itemName,
//           unit,
//           quantity: parseFloat(quantity) || 0,
//           rate: parseFloat(rate) || 0,
//           amount: parseFloat(amount) || 0,
//           section: section || "Other Work",
//           subSection: subSection || "Main",
//           subSectionIndex: subSectionIndex || 1,
//           transferFromStock: false,
//         })),
//         // ✅ Additional materials
//         materials: materialItems.map(({ itemId, itemName, description, unit, quantity, rate, amount, section, subSection, subSectionIndex }) => ({
//           itemId: itemId || null,
//           itemName,
//           description: description || itemName,
//           unit,
//           quantity: parseFloat(quantity) || 0,
//           rate: parseFloat(rate) || 0,
//           amount: parseFloat(amount) || 0,
//           section: section || "Other Work",
//           subSection: subSection || "Main",
//           subSectionIndex: subSectionIndex || 1,
//           isRateOnly: false,
//           type: "material",
//           transferFromStock: false,
//         })),
//         remarks: woRemarks,
//       };

//       const res = await api.post("/construction/work-orders", payload, headers);
//       const newWO = res.data.data || res.data;
//       setWorkOrders(prev => [...prev, newWO]);
//       toast.success("Work order created successfully!");
//       setIsWoModalOpen(false);
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to create work order.");
//     } finally {
//       setGeneratingWo(false);
//     }
//   };

//   // ─── Add Materials ──────────────────────────────────────────────────
//   const openAddItemsModal = (sectionName) => {
//     const sections = Object.keys(sectionSubSectionMap);
//     setAddItemsSection(sectionName || (sections.length > 0 ? sections[0] : ""));
//     setAddItemsSubSection("__SECTION_LEVEL__");
//     setAddItemsRows([]);
//     setAddItemsSelected([]);
//     setSearchTerm("");
//     setIsAddItemsModalOpen(true);
//   };

//   const handleAddItemsSelect = (selectedOptions) => {
//     setAddItemsSelected(selectedOptions || []);
//     const newRows = (selectedOptions || []).map((opt) => ({
//       _id: generateId(),
//       itemId: opt.value,
//       itemName: opt.label,
//       description: opt.description || "",
//       unit: opt.unit || "nos",
//       quantity: 1,
//       rate: 0,
//     }));
//     setAddItemsRows(newRows);
//   };

//   const handleAddItemsRowChange = (id, field, value) => {
//     setAddItemsRows(prev =>
//       prev.map(row => {
//         if (row._id !== id) return row;
//         return { ...row, [field]: value };
//       })
//     );
//   };

//   const handleAddItemsSubmit = async (e) => {
//     e.preventDefault();
//     const validRows = addItemsRows.filter(row => row.itemName && row.itemName.trim() !== "");
//     if (validRows.length === 0) {
//       toast.error("Please add at least one material with a name.");
//       return;
//     }

//     const newMaterials = validRows.map(row => ({
//       itemId: row.itemId || null,
//       itemName: row.itemName.trim(),
//       quantity: parseFloat(row.quantity) || 0,
//       unit: row.unit.trim() || "nos",
//       rate: parseFloat(row.rate) || 0,
//       amount: (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0),
//       section: addItemsSection,
//       subSection: addItemsSubSection === "__SECTION_LEVEL__" ? "Section Materials" : addItemsSubSection,
//       subSectionIndex: 0,
//       isRateOnly: false,
//       type: "material",
//     }));

//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const currentMaterials = boq.materials || [];
//       const updatedMaterials = [...currentMaterials, ...newMaterials];
//       const payload = {
//         project: boq.project._id,
//         contractor: boq.contractor?._id || null,
//         boqNumber: boq.boqNumber,
//         date: boq.date,
//         status: boq.status,
//         remarks: boq.remarks || "",
//         items: boq.items || [],
//         materials: updatedMaterials,
//         taxVAT: boq.taxVAT || 0,
//         taxService: boq.taxService || 0,
//       };
//       const res = await api.put(`/construction/boq/${boq._id}`, payload, headers);
//       if (res.data.success) {
//         toast.success(`${newMaterials.length} materials added successfully!`);
//         const refreshed = await api.get(`/construction/boq?id=${boq._id}`, headers);
//         setBoq(refreshed.data.data || refreshed.data);
//         setIsAddItemsModalOpen(false);
//         setAddItemsRows([]);
//         setAddItemsSelected([]);
//         setSearchTerm("");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to add materials.");
//     }
//   };

//   const goToProgressBilling = () => {
//     router.push(`/construction/progress-billing?boqId=${id}`);
//   };

//   // ─── UI Helpers ──────────────────────────────────────────────────────
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
//     return (
//       <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>
//         {status}
//       </span>
//     );
//   };

//   const formatCurrency = (num) =>
//     new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center text-gray-400">Loading BOQ details...</div>
//       </div>
//     );
//   }

//   if (!boq) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center text-gray-400">BOQ not found.</div>
//       </div>
//     );
//   }

//   const subSectionOptions = getAllSubSectionOptions();
//   const itemOptions = items.map(item => ({
//     value: item._id,
//     label: item.itemName || item.name || "Unnamed",
//     unit: item.uom || item.unit || "nos",
//     description: item.description || "",
//   }));

//   const filteredItemOptions = searchTerm
//     ? itemOptions.filter(opt =>
//         opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         opt.description?.toLowerCase().includes(searchTerm.toLowerCase())
//       )
//     : itemOptions;

//   const sectionOptions = Object.keys(sectionSubSectionMap).map(sec => ({
//     value: sec,
//     label: sec,
//   }));

//   const subSectionChoices = addItemsSection
//     ? Object.keys(sectionSubSectionMap[addItemsSection] || {})
//         .filter(sub => sub !== "Section Materials")
//         .map(sub => ({ value: sub, label: sub }))
//     : [];

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//               <FaFileInvoice className="text-indigo-600" /> BOQ: {boq.boqNumber}
//             </h1>
//             <p className="text-sm text-gray-400 mt-0.5">
//               Project: {boq.project?.name} · Contractor: {boq.contractor?.supplierName || boq.contractor?.name || "—"} · Total: {formatCurrency(boq.totalAmount)}
//             </p>
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={goToProgressBilling}
//               className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
//             >
//               <FaFileInvoice size={12} /> Generate Invoice
//             </button>
//             <button
//               onClick={() => openWoModal("All")}
//               className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
//             >
//               <FaFileContract size={12} /> Create Work Order (All)
//             </button>
//           </div>
//         </div>

//         {/* ─── BOQ Items Sections ─────────────────────────────────────────── */}
//         <div className="space-y-6">
//           {Object.keys(sectionSubSectionMap).map((sectionName) => {
//             const subSections = sectionSubSectionMap[sectionName];
//             const allItems = Object.values(subSections).flat();
//             const woList = getWorkOrdersForSection(sectionName);
//             const isExpanded = expandedSections[sectionName] ?? true;

//             return (
//               <div key={sectionName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//                 <div
//                   className="px-6 py-4 bg-indigo-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-indigo-50/80 transition-colors"
//                   onClick={() => toggleSection(sectionName)}
//                 >
//                   <div className="flex items-center gap-3">
//                     <button type="button" className="text-gray-400 hover:text-indigo-600">
//                       {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
//                     </button>
//                     <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
//                     <span className="text-xs text-gray-400">({allItems.length} items)</span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <button
//                       type="button"
//                       onClick={(e) => { e.stopPropagation(); openWoModal(sectionName); }}
//                       className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors"
//                     >
//                       <FaFileContract size={10} /> WO
//                     </button>
//                     <button
//                       type="button"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         openAddItemsModal(sectionName);
//                       }}
//                       className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
//                     >
//                       <FaPlus size={10} /> Add Materials
//                     </button>
//                     <span className="text-xs text-gray-400">WO: {woList.length}</span>
//                   </div>
//                 </div>

//                 {isExpanded && (
//                   <div className="p-6 space-y-4">
//                     {Object.keys(subSections).map((subSectionName) => {
//                       const items = subSections[subSectionName];
//                       if (subSectionName === "Section Materials") return null;
//                       return (
//                         <div key={subSectionName} className="ml-4 border-l-2 border-indigo-200 pl-4">
//                           <div className="flex items-center gap-2 mb-2">
//                             <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
//                               {subSectionName}
//                             </span>
//                             <span className="text-[10px] text-gray-400">({items.length} items)</span>
//                           </div>
//                           <div className="overflow-x-auto">
//                             <table className="w-full text-sm border-collapse">
//                               <thead className="bg-gray-50">
//                                 <tr>
//                                   <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Item</th>
//                                   <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
//                                   <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
//                                   <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
//                                   <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
//                                 </tr>
//                               </thead>
//                               <tbody className="divide-y divide-gray-100">
//                                 {items.map((item) => (
//                                   <tr key={item._id} className="hover:bg-indigo-50/20">
//                                     <td className="px-3 py-2 text-xs text-gray-700">{item.itemName}</td>
//                                     <td className="px-3 py-2 text-center text-xs text-gray-600">{item.unit}</td>
//                                     <td className="px-3 py-2 text-center text-xs text-gray-700">{item.quantity}</td>
//                                     <td className="px-3 py-2 text-center text-xs text-gray-700">{item.rate}</td>
//                                     <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{formatCurrency(item.amount)}</td>
//                                   </tr>
//                                 ))}
//                                 <tr className="bg-indigo-50/30">
//                                   <td colSpan="4" className="px-3 py-2 text-right text-xs font-bold text-indigo-600">Sub‑Section Total</td>
//                                   <td className="px-3 py-2 text-right text-xs font-bold text-indigo-700">
//                                     {formatCurrency(items.reduce((sum, i) => sum + (i.amount || 0), 0))}
//                                   </td>
//                                 </tr>
//                               </tbody>
//                             </table>
//                           </div>
//                         </div>
//                       );
//                     })}

//                     {subSections["Section Materials"] && subSections["Section Materials"].length > 0 && (
//                       <div className="ml-4 border-l-2 border-indigo-200 pl-4 mt-4 pt-2 border-t border-indigo-100">
//                         <div className="flex items-center gap-2 mb-2">
//                           <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">📦 Section Materials</span>
//                           <span className="text-[10px] text-gray-400">({subSections["Section Materials"].length} items)</span>
//                         </div>
//                         <div className="overflow-x-auto">
//                           <table className="w-full text-sm border-collapse">
//                             <thead className="bg-gray-50">
//                               <tr>
//                                 <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Item</th>
//                                 <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
//                                 <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
//                                 <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
//                                 <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
//                               </tr>
//                             </thead>
//                             <tbody className="divide-y divide-gray-100">
//                               {subSections["Section Materials"].map((item) => (
//                                 <tr key={item._id} className="hover:bg-blue-50/20">
//                                   <td className="px-3 py-2 text-xs text-gray-700">{item.itemName}</td>
//                                   <td className="px-3 py-2 text-center text-xs text-gray-600">{item.unit}</td>
//                                   <td className="px-3 py-2 text-center text-xs text-gray-700">{item.quantity}</td>
//                                   <td className="px-3 py-2 text-center text-xs text-gray-700">{item.rate}</td>
//                                   <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{formatCurrency(item.amount)}</td>
//                                 </tr>
//                               ))}
//                               <tr className="bg-blue-50/30">
//                                 <td colSpan="4" className="px-3 py-2 text-right text-xs font-bold text-blue-600">Section Materials Total</td>
//                                 <td className="px-3 py-2 text-right text-xs font-bold text-blue-700">
//                                   {formatCurrency(subSections["Section Materials"].reduce((sum, i) => sum + (i.amount || 0), 0))}
//                                 </td>
//                               </tr>
//                             </tbody>
//                           </table>
//                         </div>
//                       </div>
//                     )}

//                     <div className="flex justify-end items-center mt-2 pt-2 border-t-2 border-indigo-200">
//                       <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
//                         Section Total ({allItems.length} items)
//                       </span>
//                       <span className="text-sm font-extrabold text-indigo-700">
//                         {formatCurrency(allItems.reduce((sum, i) => sum + (i.amount || 0), 0))}
//                       </span>
//                     </div>

//                     {woList.length > 0 && (
//                       <div className="border-t border-gray-200 pt-3 mt-2">
//                         <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Work Orders</p>
//                         <div className="overflow-x-auto">
//                           <table className="w-full text-xs border-collapse">
//                             <thead className="bg-gray-50">
//                               <tr>
//                                 <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">WO #</th>
//                                 <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">Contractor</th>
//                                 <th className="px-2 py-1 text-center text-[9px] font-bold uppercase text-gray-400">Status</th>
//                                 <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">Amount</th>
//                                 <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">Actions</th>
//                               </tr>
//                             </thead>
//                             <tbody className="divide-y divide-gray-100">
//                               {woList.map(wo => (
//                                 <tr key={wo._id} className="hover:bg-indigo-50/20">
//                                   <td className="px-2 py-1 font-medium text-indigo-600">{wo.workOrderNumber}</td>
//                                   <td className="px-2 py-1 text-gray-600">{wo.contractor?.supplierName || wo.contractor?.name || "—"}</td>
//                                   <td className="px-2 py-1 text-center"><StatusBadge status={wo.status} /></td>
//                                   <td className="px-2 py-1 text-right font-bold">{formatCurrency(wo.items.reduce((s, i) => s + (i.amount || 0), 0))}</td>
//                                   <td className="px-2 py-1 text-right">
//                                     <button
//                                       onClick={() => router.push(`/construction/work-orders/${wo._id}`)}
//                                       className="text-gray-400 hover:text-indigo-600"
//                                     >
//                                       <HiDotsVertical size={14} />
//                                     </button>
//                                   </td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>

//         {/* ─── Additional Materials Section ─────────────────────────────── */}
//         {Object.keys(materialSectionMap).length > 0 && (
//           <div className="mt-8 space-y-6">
//             <div className="flex items-center justify-between">
//               <h2 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
//                 <FaBoxes className="text-blue-600" /> Additional Materials
//               </h2>
//               <button
//                 onClick={() => openAddItemsModal("")}
//                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
//               >
//                 <FaPlus size={12} /> Add Materials
//               </button>
//             </div>

//             {Object.keys(materialSectionMap).map((sectionName) => {
//               const subSections = materialSectionMap[sectionName];
//               const allMaterials = Object.values(subSections).flat();
//               const isExpanded = expandedMaterialSections[sectionName] ?? true;

//               return (
//                 <div key={`mat-${sectionName}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//                   <div
//                     className="px-6 py-4 bg-blue-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/80 transition-colors"
//                     onClick={() => toggleMaterialSection(sectionName)}
//                   >
//                     <div className="flex items-center gap-3">
//                       <button type="button" className="text-gray-400 hover:text-blue-600">
//                         {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
//                       </button>
//                       <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
//                       <span className="text-xs text-gray-400">({allMaterials.length} materials)</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           openAddItemsModal(sectionName);
//                         }}
//                         className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
//                       >
//                         <FaPlus size={10} /> Add
//                       </button>
//                     </div>
//                   </div>

//                   {isExpanded && (
//                     <div className="p-6 space-y-4">
//                       {Object.keys(subSections).map((subSectionName) => {
//                         const materials = subSections[subSectionName];
//                         return (
//                           <div key={`mat-${sectionName}-${subSectionName}`} className="ml-4 border-l-2 border-blue-200 pl-4">
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
//                                     <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Material</th>
//                                     <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
//                                     <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
//                                     <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
//                                   </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                   {materials.map((mat) => (
//                                     <tr key={mat._id} className="hover:bg-blue-50/20">
//                                       <td className="px-3 py-2 text-xs text-gray-700">{mat.itemName}</td>
//                                       <td className="px-3 py-2 text-xs text-gray-600">{mat.unit}</td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-700">{mat.quantity}</td>
//                                       <td className="px-3 py-2 text-center text-xs text-gray-700">{mat.rate}</td>
//                                       <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{formatCurrency(mat.amount)}</td>
//                                     </tr>
//                                   ))}
//                                   <tr className="bg-blue-50/30">
//                                     <td colSpan="4" className="px-3 py-2 text-right text-xs font-bold text-blue-600">Sub‑Section Total</td>
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

//         {Object.keys(materialSectionMap).length === 0 && (
//           <div className="mt-8 bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
//             <FaBoxes className="text-gray-300 text-4xl mx-auto mb-3" />
//             <p className="text-gray-400 text-sm font-medium">No additional materials added yet.</p>
//             <button
//               onClick={() => openAddItemsModal("")}
//               className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
//             >
//               <FaPlus size={12} /> Add Materials
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ─── Work Order Modal ─────────────────────────────────────────── */}
//       {isWoModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
//             <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
//               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm"><FaFileContract size={20} /></div>
//               <h2 className="text-lg font-black text-gray-900 tracking-tight">Create Work Order</h2>
//             </div>
//             <form onSubmit={handleGenerateWo} className="p-6 space-y-4 overflow-y-auto flex-1">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="Sub‑Sections" req />
//                   <Select
//                     options={subSectionOptions}
//                     value={subSectionOptions.filter(opt => selectedSubSections.includes(opt.value))}
//                     onChange={handleSubSectionSelection}
//                     placeholder="Select sub‑sections..."
//                     isMulti
//                     className="text-sm"
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="Contractor (optional)" />
//                   <Select
//                     options={suppliers.map(s => ({
//                       value: s._id,
//                       label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id
//                     }))}
//                     value={selectedContractor}
//                     onChange={setSelectedContractor}
//                     placeholder={suppliers.length === 0 ? "No suppliers found" : "Select contractor..."}
//                     className="text-sm"
//                     isClearable
//                     noOptionsMessage={() => suppliers.length === 0 ? "No suppliers available" : "No matches"}
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="Status" />
//                   <select className={fi} value={woStatus} onChange={e => setWoStatus(e.target.value)}>
//                     <option value="draft">Draft</option>
//                     <option value="issued">Issued</option>
//                     <option value="in-progress">In Progress</option>
//                   </select>
//                 </div>
//                 <div>
//                   <Lbl text="Issue Date" />
//                   <input type="date" className={fi} value={woDate} onChange={e => setWoDate(e.target.value)} />
//                 </div>
//                 <div className="md:col-span-2">
//                   <Lbl text="Remarks" />
//                   <input type="text" className={fi} value={woRemarks} onChange={e => setWoRemarks(e.target.value)} placeholder="Notes..." />
//                 </div>
//               </div>

//               <div className="border-t border-gray-200 pt-4">
//                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
//                   Items ({woItems.length})
//                 </p>
//                 {woItems.length === 0 ? (
//                   <p className="text-xs text-gray-400 text-center py-4">Select at least one sub‑section to see items.</p>
//                 ) : (
//                   <div className="overflow-x-auto border border-gray-200 rounded-xl">
//                     <table className="w-full text-sm divide-y divide-gray-100">
//                       <thead className="bg-gray-50">
//                         <tr>
//                           <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[120px]">Section</th>
//                           <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[100px]">Sub‑Section</th>
//                           <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[150px]">Item Name</th>
//                           <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[60px]">Type</th>
//                           <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[150px]">Description</th>
//                           <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Unit</th>
//                           <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Qty</th>
//                           <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Rate</th>
//                           <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-400">Amount</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-gray-100 bg-white">
//                         {woItems.map(item => (
//                           <tr key={item._id}>
//                             <td className="px-3 py-2 text-xs text-gray-500">{item.section}</td>
//                             <td className="px-3 py-2 text-xs text-gray-500">{item.subSection}</td>
//                             <td className="px-3 py-2 text-xs text-gray-700">{item.itemName}</td>
//                             <td className="px-3 py-2 text-xs text-gray-500">
//                               {item.isMaterial ? <span className="text-blue-600">Material</span> : <span className="text-indigo-600">BOQ</span>}
//                             </td>
//                             <td className="px-3 py-2 text-xs text-gray-700">{item.description}</td>
//                             <td className="px-3 py-2 text-center text-xs">{item.unit}</td>
//                             <td className="px-3 py-2 text-center text-xs">{item.quantity}</td>
//                             <td className="px-3 py-2 text-center text-xs">{item.rate}</td>
//                             <td className="px-3 py-2 text-right text-xs font-bold text-gray-700">{formatCurrency(item.amount)}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}
//               </div>

//               <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100">
//                 <button type="button" onClick={() => setIsWoModalOpen(false)} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
//                 <button
//                   type="submit"
//                   disabled={generatingWo || woItems.length === 0}
//                   className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
//                 >
//                   {generatingWo ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaCheck size={12} />}
//                   {generatingWo ? "Creating..." : "Create Work Order"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ─── Add Materials Modal ────────────────────────────────────────── */}
//       {isAddItemsModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
//             <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-blue-50/50 shrink-0">
//               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
//                 <FaPlus size={20} />
//               </div>
//               <h2 className="text-lg font-black text-gray-900 tracking-tight">Add Materials</h2>
//             </div>
//             <form onSubmit={handleAddItemsSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
//               <div>
//                 <Lbl text="Section" req />
//                 <Select
//                   options={sectionOptions}
//                   value={sectionOptions.find(opt => opt.value === addItemsSection) || null}
//                   onChange={(opt) => {
//                     setAddItemsSection(opt?.value || "");
//                     setAddItemsSubSection("__SECTION_LEVEL__");
//                   }}
//                   placeholder="Select section..."
//                   className="text-sm"
//                   isClearable
//                 />
//               </div>
//               <div>
//                 <Lbl text="Sub‑Section (optional)" />
//                 <Select
//                   options={subSectionChoices}
//                   value={subSectionChoices.find(opt => opt.value === addItemsSubSection) || null}
//                   onChange={(opt) => setAddItemsSubSection(opt?.value || "__SECTION_LEVEL__")}
//                   placeholder="Select sub‑section..."
//                   className="text-sm"
//                   isClearable
//                   isDisabled={!addItemsSection}
//                 />
//                 <p className="text-xs text-gray-400 mt-1">Leave empty to add at section level.</p>
//               </div>
//               <div>
//                 <Lbl text="Search Materials" />
//                 <input
//                   type="text"
//                   className={fi}
//                   placeholder="Type to filter materials..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                 />
//               </div>
//               <div>
//                 <Lbl text="Select Materials" req />
//                 <Select
//                   options={filteredItemOptions}
//                   value={addItemsSelected}
//                   onChange={handleAddItemsSelect}
//                   placeholder="Select materials..."
//                   isMulti
//                   isSearchable
//                   className="text-sm"
//                   noOptionsMessage={() => filteredItemOptions.length === 0 ? "No items found" : "No matches"}
//                 />
//               </div>
//               <div>
//                 <div className="flex items-center justify-between mb-2">
//                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Materials to add</p>
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setAddItemsRows(prev => [
//                         ...prev,
//                         { _id: generateId(), itemId: null, itemName: "", description: "", unit: "nos", quantity: 1, rate: 0 },
//                       ]);
//                     }}
//                     className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
//                   >
//                     <FaPlus size={10} /> Add Row
//                   </button>
//                 </div>
//                 {addItemsRows.length > 0 ? (
//                   <div className="overflow-x-auto border border-gray-200 rounded-xl">
//                     <table className="w-full text-sm divide-y divide-gray-100">
//                       <thead className="bg-gray-50">
//                         <tr>
//                           <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[180px]">Material</th>
//                           <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[80px]">Unit</th>
//                           <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Qty</th>
//                           <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">Rate</th>
//                           <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-400">Amount</th>
//                           <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">#</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-gray-100 bg-white">
//                         {addItemsRows.map((row) => {
//                           const selectedOption = itemOptions.find(opt => opt.value === row.itemId) || null;
//                           return (
//                             <tr key={row._id}>
//                               <td className="px-3 py-2">
//                                 <Select
//                                   options={itemOptions}
//                                   value={selectedOption}
//                                   onChange={(selected) => {
//                                     setAddItemsRows(prev =>
//                                       prev.map(r => {
//                                         if (r._id !== row._id) return r;
//                                         return {
//                                           ...r,
//                                           itemId: selected?.value || null,
//                                           itemName: selected?.label || "",
//                                           unit: selected?.unit || "nos",
//                                           description: selected?.description || "",
//                                         };
//                                       })
//                                     );
//                                   }}
//                                   placeholder="Search or select item..."
//                                   isSearchable
//                                   isClearable
//                                   className="text-xs"
//                                   styles={{
//                                     control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
//                                     menu: (base) => ({ ...base, fontSize: '12px' }),
//                                   }}
//                                 />
//                               </td>
//                               <td className="px-3 py-2">
//                                 <input
//                                   type="text"
//                                   className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none"
//                                   value={row.unit}
//                                   onChange={(e) => handleAddItemsRowChange(row._id, "unit", e.target.value)}
//                                   placeholder="e.g. nos"
//                                 />
//                               </td>
//                               <td className="px-3 py-2">
//                                 <input
//                                   type="number"
//                                   step="any"
//                                   className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
//                                   value={row.quantity}
//                                   onChange={(e) => handleAddItemsRowChange(row._id, "quantity", e.target.value)}
//                                   min="0"
//                                 />
//                               </td>
//                               <td className="px-3 py-2">
//                                 <input
//                                   type="number"
//                                   step="any"
//                                   className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
//                                   value={row.rate}
//                                   onChange={(e) => handleAddItemsRowChange(row._id, "rate", e.target.value)}
//                                   min="0"
//                                 />
//                               </td>
//                               <td className="px-3 py-2 text-right font-bold text-gray-700">
//                                 {formatCurrency((parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0))}
//                               </td>
//                               <td className="px-3 py-2 text-center">
//                                 <button
//                                   type="button"
//                                   onClick={() => {
//                                     setAddItemsRows(prev => prev.filter(r => r._id !== row._id));
//                                     if (row.itemId) {
//                                       setAddItemsSelected(prev =>
//                                         prev.filter(opt => opt.value !== row.itemId)
//                                       );
//                                     }
//                                   }}
//                                   className="text-gray-300 hover:text-red-500 transition-colors"
//                                 >
//                                   <FaTrash size={12} />
//                                 </button>
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>
//                 ) : (
//                   <p className="text-xs text-gray-400 text-center py-4 border border-gray-200 rounded-xl">
//                     No materials added yet. Select from the dropdown or click "Add Row".
//                   </p>
//                 )}
//               </div>
//               <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100">
//                 <button
//                   type="button"
//                   onClick={() => { setIsAddItemsModalOpen(false); setSearchTerm(""); }}
//                   className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={addItemsRows.length === 0}
//                   className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
//                 >
//                   <FaCheck size={12} /> Add {addItemsRows.length} Materials
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
