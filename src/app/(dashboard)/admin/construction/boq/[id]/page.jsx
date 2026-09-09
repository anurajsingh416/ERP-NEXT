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
//   FaUserTie,
//   FaUserFriends,
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
//   const [customers, setCustomers] = useState([]);
//   const [items, setItems] = useState([]);
//   const [loadingItems, setLoadingItems] = useState(false);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [expandedMaterialSections, setExpandedMaterialSections] = useState({});

//   // ─── Work Order Modal ────────────────────────────────────────────────
//   const [isWoModalOpen, setIsWoModalOpen] = useState(false);
//   const [selectedSubSections, setSelectedSubSections] = useState([]);
//   const [woItems, setWoItems] = useState([]);
//   const [orderType, setOrderType] = useState("contractor"); // "contractor" or "customer"
//   const [selectedContractor, setSelectedContractor] = useState(null);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
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
//           const custRes = await api.get("/customers", headers);
//           const customersData = custRes.data?.data || custRes.data || [];
//           setCustomers(customersData);
//         } catch (err) {
//           console.error("❌ Failed to fetch customers:", err);
//           toast.warning("Could not load customers.");
//           setCustomers([]);
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
//           itemId: mat.itemId || null,
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
//     setSelectedCustomer(null);
//     setOrderType("contractor"); // default
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
//           itemId: mat.itemId || null,
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

//     // Validate based on order type
//     if (orderType === "contractor" && !selectedContractor) {
//       toast.error("Please select a contractor.");
//       return;
//     }
//     if (orderType === "customer" && !selectedCustomer) {
//       toast.error("Please select a customer.");
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
//         orderType: orderType,
//         contractor: orderType === "contractor" ? selectedContractor?.value : null,
//         customer: orderType === "customer" ? selectedCustomer?.value : null,
//         workOrderNumber: `WO-${Date.now().toString().slice(-6)}`,
//         status: woStatus,
//         issuedDate: woDate,
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
//     router.push(`/admin/construction/progress-billing?boqId=${id}`);
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

//   // ─── Build dropdown options ──────────────────────────────────────────
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

//   const supplierOptions = suppliers.map(s => ({
//     value: s._id,
//     label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id,
//   }));

//   const customerOptions = customers.map(c => ({
//     value: c._id,
//     label: c.customerName || c.name || c.contactPersonName || c._id,
//   }));

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
//                                 <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">Type</th>
//                                 <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">Contractor / Customer</th>
//                                 <th className="px-2 py-1 text-center text-[9px] font-bold uppercase text-gray-400">Status</th>
//                                 <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">Amount</th>
//                                 <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">Actions</th>
//                               </tr>
//                             </thead>
//                             <tbody className="divide-y divide-gray-100">
//                               {woList.map(wo => (
//                                 <tr key={wo._id} className="hover:bg-indigo-50/20">
//                                   <td className="px-2 py-1 font-medium text-indigo-600">{wo.workOrderNumber}</td>
//                                   <td className="px-2 py-1 text-xs font-medium text-gray-500 capitalize">{wo.orderType || "contractor"}</td>
//                                   <td className="px-2 py-1 text-gray-600">
//                                     {wo.orderType === "customer" 
//                                       ? wo.customer?.customerName || wo.customer?.name || "—"
//                                       : wo.contractor?.supplierName || wo.contractor?.name || "—"}
//                                   </td>
//                                   <td className="px-2 py-1 text-center"><StatusBadge status={wo.status} /></td>
//                                   <td className="px-2 py-1 text-right font-bold">{formatCurrency(wo.items.reduce((s, i) => s + (i.amount || 0), 0))}</td>
//                                   <td className="px-2 py-1 text-right">
//                                     <button
//                                       onClick={() => router.push(`/admin/construction/work-orders/${wo._id}`)}
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

//                 {/* ─── Order Type Toggle ─── */}
//                 <div>
//                   <Lbl text="Order Type" req />
//                   <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
//                     <button
//                       type="button"
//                       className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${
//                         orderType === "contractor"
//                           ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
//                           : "text-gray-500 hover:bg-gray-100"
//                       }`}
//                       onClick={() => {
//                         setOrderType("contractor");
//                         setSelectedCustomer(null);
//                       }}
//                     >
//                       <FaUserTie className="inline mr-2" size={14} /> Contractor
//                     </button>
//                     <button
//                       type="button"
//                       className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${
//                         orderType === "customer"
//                           ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
//                           : "text-gray-500 hover:bg-gray-100"
//                       }`}
//                       onClick={() => {
//                         setOrderType("customer");
//                         setSelectedContractor(null);
//                       }}
//                     >
//                       <FaUserFriends className="inline mr-2" size={14} /> Customer
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               {/* ─── Contractor / Customer Dropdown ─── */}
//               <div>
//                 {orderType === "contractor" ? (
//                   <div>
//                     <Lbl text="Contractor" req />
//                     <Select
//                       options={supplierOptions}
//                       value={selectedContractor}
//                       onChange={setSelectedContractor}
//                       placeholder="Select contractor..."
//                       className="text-sm"
//                       isClearable
//                       noOptionsMessage={() => supplierOptions.length === 0 ? "No suppliers found" : "No matches"}
//                     />
//                   </div>
//                 ) : (
//                   <div>
//                     <Lbl text="Customer" req />
//                     <Select
//                       options={customerOptions}
//                       value={selectedCustomer}
//                       onChange={setSelectedCustomer}
//                       placeholder="Select customer..."
//                       className="text-sm"
//                       isClearable
//                       noOptionsMessage={() => customerOptions.length === 0 ? "No customers found" : "No matches"}
//                     />
//                   </div>
//                 )}
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import axios from "axios";
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
  FaSpinner,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

let idCounter = 0;
const generateId = () => ++idCounter;

function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function AICleanPreviewModal({ isOpen, onClose, onConfirm, changes, isSaving }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              ✨ Review AI Corrections
            </h3>
            <p className="text-xs text-gray-500">
              Found <strong className="text-violet-600">{changes.length}</strong> item(s) with suggested corrections.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Diff Table */}
        <div className="overflow-y-auto flex-1 my-4 border border-gray-200 rounded-xl">
          <table className="w-full text-xs border-collapse divide-y divide-gray-200">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left w-1/2 bg-red-50/50 text-red-700">Original (Current)</th>
                <th className="px-3 py-2 text-left w-1/2 bg-emerald-50/50 text-emerald-700">AI Suggested (Cleaned)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {changes.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-gray-50/50">
                  {/* Original */}
                  <td className="px-3 py-2.5 align-top border-r border-gray-100 space-y-1">
                    <p className="font-bold text-gray-800 line-through text-red-600/80">
                      {item.originalItemName}
                    </p>
                    <p className="text-[11px] text-gray-500 whitespace-pre-line">
                      {item.originalDescription || <em className="text-gray-300">No description</em>}
                    </p>
                  </td>

                  {/* Cleaned */}
                  <td className="px-3 py-2.5 align-top bg-emerald-50/20 space-y-1">
                    <p className="font-bold text-emerald-700">
                      {item.cleanedItemName}
                    </p>
                    <p className="text-[11px] text-gray-700 whitespace-pre-line">
                      {item.cleanedDescription || <em className="text-gray-300">No description</em>}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? "Saving..." : "Apply & Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}



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
  const [expandedBOMRows, setExpandedBOMRows] = useState({});

  // ─── Work Order Modal ────────────────────────────────────────────────
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [selectedSubSections, setSelectedSubSections] = useState([]);
  const [woItems, setWoItems] = useState([]);
  const [orderType, setOrderType] = useState("contractor");
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
          router.push("/signin");
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
          setSuppliers(supRes.data?.data || supRes.data || []);
        } catch (err) {
          setSuppliers([]);
        }

        try {
          const custRes = await api.get("/customers", headers);
          setCustomers(custRes.data?.data || custRes.data || []);
        } catch (err) {
          setCustomers([]);
        }

        try {
          const pRes = await api.get("/construction/projects", headers);
          setProjects(pRes.data.data || pRes.data || []);
        } catch (err) {
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

  // ─── Fetch general inventory items from Master ─────────────────────
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
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  // ─── Hierarchy Mapping ─────────────────────────────────────────────
  const getSectionSubSectionMap = () => {
    if (!boq || !Array.isArray(boq.items)) return {};
    const map = {};
    boq.items.forEach((item) => {
      const section = item.section || "Other Work";
      const subSection = item.subSection || "Main";
      if (!map[section]) map[section] = {};
      if (!map[section][subSection]) map[section][subSection] = [];
      map[section][subSection].push(item);
    });
    return map;
  };

  const getMaterialsSectionMap = () => {
    if (!boq || !Array.isArray(boq.materials)) return {};
    const map = {};
    boq.materials.forEach((mat) => {
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
    return materialSectionMap[section]?.[subSection] || [];
  };

  const getAllSubSectionOptions = () => {
    const options = [];
    const seen = new Set();

    Object.keys(sectionSubSectionMap).forEach((section) => {
      Object.keys(sectionSubSectionMap[section]).forEach((subSection) => {
        const key = `${section}||${subSection}`;
        if (!seen.has(key)) {
          seen.add(key);
          options.push({ value: key, label: `${section} → ${subSection}`, section, subSection });
        }
      });
    });

    Object.keys(materialSectionMap).forEach((section) => {
      Object.keys(materialSectionMap[section]).forEach((subSection) => {
        const key = `${section}||${subSection}`;
        if (!seen.has(key)) {
          seen.add(key);
          options.push({
            value: key,
            label: `${section} → ${subSection} (materials)`,
            section,
            subSection,
          });
        }
      });
    });

    return options;
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleMaterialSection = (section) => {
    setExpandedMaterialSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleBOMRow = (lineId) => {
    setExpandedBOMRows((prev) => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  const getWorkOrdersForSection = (sectionName) => {
    return workOrders.filter((wo) =>
      (wo.items || []).some((item) => item.section === sectionName)
    );
  };

  // ─── Work Order Construction from Hierarchical Items ─────────────────
  const buildWoItemFromBoqDescLine = (parentItem, descLine, section, subSection) => ({
    _id: generateId(),
    boqItemId: parentItem._id,
    descLineId: descLine._id,
    itemId: descLine.itemId || null,
    itemName: parentItem.itemName,
    description: descLine.description || parentItem.itemName,
    unit: descLine.unit || "nos",
    quantity: descLine.quantity || 0,
    unitRateSupply: descLine.unitRateSupply || 0,
    unitRateInstallation: descLine.unitRateInstallation || 0,
    rate: (descLine.unitRateSupply || 0) + (descLine.unitRateInstallation || 0),
    amount: descLine.amount || descLine.totalAmount || 0,
    isRateOnly: !!descLine.isRateOnly,
    section: parentItem.section || section,
    subSection: parentItem.subSection || subSection,
    subSectionIndex: parentItem.subSectionIndex || 1,
    isMaterial: false,
  });

  const buildWoItemFromMaterial = (mat, section, subSection) => ({
    _id: generateId(),
    boqItemId: null,
    itemId: mat.itemId || null,
    itemName: mat.itemName || "",
    description: mat.itemName || "",
    unit: mat.unit || "nos",
    quantity: mat.quantity || 0,
    rate: mat.rate || 0,
    amount: mat.amount || 0,
    isRateOnly: !!mat.isRateOnly,
    section: mat.section || section,
    subSection: mat.subSection || subSection,
    subSectionIndex: mat.subSectionIndex || 1,
    isMaterial: true,
  });

  const buildWoItemsForSelection = (selectedKeys) => {
    const allWoItems = [];
    selectedKeys.forEach((key) => {
      const [section, subSection] = key.split("||");
      getItemsForSubSection(section, subSection).forEach((parentItem) => {
        (parentItem.descriptions || []).forEach((descLine) => {
          allWoItems.push(buildWoItemFromBoqDescLine(parentItem, descLine, section, subSection));
        });
      });
      getMaterialsForSubSection(section, subSection).forEach((mat) => {
        allWoItems.push(buildWoItemFromMaterial(mat, section, subSection));
      });
    });
    return allWoItems;
  };

  const openWoModal = (preselected) => {
    let selected = [];
    if (preselected === "All") {
      selected = getAllSubSectionOptions().map((opt) => opt.value);
    } else if (typeof preselected === "string") {
      selected = getAllSubSectionOptions()
        .filter((opt) => opt.section === preselected)
        .map((opt) => opt.value);
    } else if (Array.isArray(preselected)) {
      selected = preselected;
    }

    setWoItems(buildWoItemsForSelection(selected));
    setSelectedSubSections(selected);
    setSelectedContractor(null);
    setSelectedCustomer(null);
    setOrderType("contractor");
    setWoStatus("draft");
    setWoDate(new Date().toISOString().split("T")[0]);
    setWoRemarks("");
    setIsWoModalOpen(true);
  };

  const handleSubSectionSelection = (selectedOptions) => {
    const selected = selectedOptions ? selectedOptions.map((opt) => opt.value) : [];
    setSelectedSubSections(selected);
    setWoItems(buildWoItemsForSelection(selected));
  };

  const handleGenerateWo = async (e) => {
    e.preventDefault();
    const validItems = woItems.filter((item) => item.itemName && item.itemName.trim() !== "");
    if (validItems.length === 0) {
      toast.error("No valid items to create work order.");
      return;
    }

    if (orderType === "contractor" && !selectedContractor) {
      toast.error("Please select a contractor.");
      return;
    }
    if (orderType === "customer" && !selectedCustomer) {
      toast.error("Please select a customer.");
      return;
    }

    const boqLines = validItems
      .filter((item) => !item.isMaterial)
      .filter((item) => item.quantity > 0 || item.isRateOnly);

    const materialLines = validItems
      .filter((item) => item.isMaterial)
      .filter((item) => item.quantity > 0 || item.isRateOnly);

    if (boqLines.length === 0 && materialLines.length === 0) {
      toast.error("Selected items contain no priced quantities.");
      return;
    }

    setGeneratingWo(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        project: boq.project?._id || boq.project,
        boq: boq._id,
        orderType,
        contractor: orderType === "contractor" ? selectedContractor?.value : null,
        customer: orderType === "customer" ? selectedCustomer?.value : null,
        workOrderNumber: `WO-${Date.now().toString().slice(-6)}`,
        status: woStatus,
        issuedDate: woDate,
        items: boqLines.map((item) => ({
          boqItemId: item.boqItemId,
          itemId: item.itemId || null,
          itemName: item.itemName,
          description: item.description,
          unit: item.unit,
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          unitRateSupply: parseFloat(item.unitRateSupply) || 0,
          unitRateInstallation: parseFloat(item.unitRateInstallation) || 0,
          amount: parseFloat(item.amount) || 0,
          section: item.section || "Other Work",
          subSection: item.subSection || "Main",
          subSectionIndex: item.subSectionIndex || 1,
          transferFromStock: false,
        })),
        materials: materialLines.map((mat) => ({
          itemId: mat.itemId || null,
          itemName: mat.itemName,
          description: mat.description,
          unit: mat.unit,
          quantity: parseFloat(mat.quantity) || 0,
          rate: parseFloat(mat.rate) || 0,
          amount: parseFloat(mat.amount) || 0,
          section: mat.section || "Other Work",
          subSection: mat.subSection || "Main",
          subSectionIndex: mat.subSectionIndex || 1,
          isRateOnly: false,
          type: "material",
          transferFromStock: false,
        })),
        remarks: woRemarks,
      };

      const res = await api.post("/construction/work-orders", payload, headers);
      const newWO = res.data.data || res.data;
      setWorkOrders((prev) => [...prev, newWO]);
      toast.success("Work order created successfully!");
      setIsWoModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create work order.");
    } finally {
      setGeneratingWo(false);
    }
  };

  // ─── Add Materials Submission ─────────────────────────────────────────
  const openAddItemsModal = (sectionName) => {
    const sections = Object.keys(sectionSubSectionMap);
    setAddItemsSection(sectionName || (sections.length > 0 ? sections[0] : ""));
    setAddItemsSubSection("Main");
    setAddItemsRows([]);
    setAddItemsSelected([]);
    setSearchTerm("");
    setIsAddItemsModalOpen(true);
  };

  const handleAddItemsSelect = (selectedOptions) => {
    setAddItemsSelected(selectedOptions || []);
    const newRows = (selectedOptions || []).map((opt) => {
      const matched = items.find(
        (i) => normalize(i.itemName || i.name) === normalize(opt.itemName)
      );

      return {
        _id: generateId(),
        itemId: matched?._id || opt.value,
        itemName: matched?.itemName || opt.itemName,
        description: matched?.description || opt.description || "",
        unit: matched?.uom || matched?.unit || opt.unit || "nos",
        quantity: 1,
        rate: matched?.unitPrice || 0,
      };
    });
    setAddItemsRows(newRows);
  };

  const handleAddItemsRowChange = (rowId, field, value) => {
    setAddItemsRows((prev) =>
      prev.map((row) => {
        if (row._id !== rowId) return row;

        if (field === "itemName") {
          const matched = items.find(
            (i) => normalize(i.itemName || i.name) === normalize(value)
          );
          if (matched) {
            return {
              ...row,
              itemName: matched.itemName,
              itemId: matched._id,
              unit: matched.uom || matched.unit || row.unit,
              description: matched.description || row.description,
            };
          }
          return { ...row, itemName: value, itemId: null };
        }

        return { ...row, [field]: value };
      })
    );
  };

  const handleAddItemsSubmit = async (e) => {
    e.preventDefault();
    const validRows = addItemsRows.filter((r) => r.itemName && r.itemName.trim() !== "");
    if (validRows.length === 0) {
      toast.error("Please add at least one material with a name.");
      return;
    }

    const newMaterials = validRows.map((row) => {
      const matched = items.find(
        (i) => normalize(i.itemName || i.name) === normalize(row.itemName)
      );

      return {
        itemId: matched?._id || row.itemId || null,
        itemName: matched?.itemName || row.itemName.trim(),
        quantity: parseFloat(row.quantity) || 0,
        unit: row.unit.trim() || "nos",
        rate: parseFloat(row.rate) || 0,
        amount: (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0),
        section: addItemsSection || "Other Work",
        subSection: addItemsSubSection || "Main",
        subSectionIndex: 1,
        isRateOnly: false,
        type: "material",
      };
    });

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const currentMaterials = boq.materials || [];
      const updatedMaterials = [...currentMaterials, ...newMaterials];

      const payload = {
        project: boq.project?._id || boq.project,
        contractor: boq.contractor?._id || null,
        customer: boq.customer?._id || null,
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

  const goToSectionInvoice = (sectionName) => {
    router.push(
      `/admin/construction/progress-billing?boqId=${id}&section=${encodeURIComponent(sectionName)}`
    );
  };

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const fi =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      draft: "bg-gray-100 text-gray-600",
      issued: "bg-blue-100 text-blue-700",
      "in-progress": "bg-amber-100 text-amber-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft
          }`}
      >
        {status}
      </span>
    );
  };

  const subSectionOptions = getAllSubSectionOptions();

  // Filter strictly to Raw Material items for the materials dropdowns
  const itemOptions = items
    .filter((item) => item.itemType === "Raw Material")
    .map((item) => {
      const itemName = item.itemName || item.name || "Unnamed";
      return {
        value: item._id,
        itemName: itemName,
        label: item.itemCode ? `${itemName} (${item.itemCode})` : itemName,
        unit: item.uom || item.unit || "nos",
        description: item.description || "",
      };
    });

  const filteredItemOptions = searchTerm
    ? itemOptions.filter(
      (opt) =>
        opt.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : itemOptions;

  const sectionOptions = Object.keys(sectionSubSectionMap).map((sec) => ({
    value: sec,
    label: sec,
  }));

  const subSectionChoices = addItemsSection
    ? Object.keys(sectionSubSectionMap[addItemsSection] || {}).map((sub) => ({
      value: sub,
      label: sub,
    }))
    : [];

  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.supplierName || s.name || s.contactPersonName || s._id,
  }));

  const customerOptions = customers.map((c) => ({
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
              Project: {boq.project?.name || "—"} · Contractor:{" "}
              {boq.contractor?.supplierName || boq.contractor?.name || "—"} · Total:{" "}
              {formatCurrency(boq.totalAmount)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            const parentItemsInSection = Object.values(subSections).flat();
            const totalDescLines = parentItemsInSection.reduce(
              (acc, p) => acc + (p.descriptions?.length || 0),
              0
            );
            const sectionTotalAmount = parentItemsInSection.reduce(
              (sum, p) => sum + (p.itemTotalAmount || 0),
              0
            );
            const woList = getWorkOrdersForSection(sectionName);
            const isExpanded = expandedSections[sectionName] ?? true;
            const primaryCode = parentItemsInSection[0]?.itemSerialNo;

            return (
              <div
                key={sectionName}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div
                  className="px-6 py-4 bg-indigo-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-indigo-50/80 transition-colors"
                  onClick={() => toggleSection(sectionName)}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button type="button" className="text-gray-400 hover:text-indigo-600">
                      {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                    </button>
                    {primaryCode && (
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-md shadow-xs">
                        {primaryCode}
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
                    <span className="text-xs text-gray-400">
                      ({totalDescLines} Lines)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-indigo-900 font-mono">
                      {formatCurrency(sectionTotalAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWoModal(sectionName);
                      }}
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToSectionInvoice(sectionName);
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                      title="Generate Invoice for this section"
                    >
                      <FaFileInvoice size={10} /> Invoice
                    </button>
                    <span className="text-xs text-gray-400">WO: {woList.length}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {Object.keys(subSections).map((subSectionName) => {
                      const parentItems = subSections[subSectionName];
                      const subSectionTotal = parentItems.reduce(
                        (sum, p) => sum + (p.itemTotalAmount || 0),
                        0
                      );

                      return (
                        <div
                          key={subSectionName}
                          className="ml-2 border-l-2 border-indigo-200 pl-4"
                        >
                          {subSectionName !== "Main" && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded">
                                {subSectionName}
                              </span>
                            </div>
                          )}

                          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
                            <table className="w-full text-xs border-collapse">
                              <thead className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                  <th className="px-3 py-2 text-center w-[75px]">Sr. No.</th>
                                  <th className="px-3 py-2 text-left min-w-[280px]">Description</th>
                                  <th className="px-2 py-2 text-center w-[60px]">Unit</th>
                                  <th className="px-2 py-2 text-center w-[60px]">Qty</th>
                                  <th className="px-2 py-2 text-right w-[80px]">Rate (Supply)</th>
                                  <th className="px-2 py-2 text-right w-[80px]">Rate (Install)</th>
                                  <th className="px-3 py-2 text-right w-[95px]">Amt (Supply)</th>
                                  <th className="px-3 py-2 text-right w-[95px]">Amt (Install)</th>
                                  <th className="px-3 py-2 text-right w-[110px]">Total Amount</th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-gray-100">
                                {parentItems.map((parent) => {
                                  // Suppress duplicate row if parent name is already the Section Accordion title
                                  const isRedundantParentRow =
                                    normalize(parent.itemName) === normalize(sectionName);

                                  return (
                                    <Fragment key={parent._id || parent.itemSerialNo}>
                                      {/* Only show distinct Parent row if it does not repeat the Section Header */}
                                      {!isRedundantParentRow && (
                                        <tr className="bg-indigo-50/80 border-t-2 border-indigo-200">
                                          <td className="px-3 py-1.5 text-center font-black text-xs text-indigo-950 font-mono">
                                            {parent.itemSerialNo || "—"}
                                          </td>
                                          <td colSpan={7} className="px-3 py-1.5">
                                            <span className="font-bold text-gray-900 text-xs tracking-tight">
                                              {parent.itemName}
                                            </span>
                                          </td>
                                          <td className="px-3 py-1.5 text-right font-black text-xs text-indigo-900">
                                            {formatCurrency(parent.itemTotalAmount)}
                                          </td>
                                        </tr>
                                      )}

                                      {/* Technical Specification Clause */}
                                      {parent.sectionSpecification && (
                                        <tr className="bg-amber-50/60 border-t border-amber-200/50">
                                          <td className="px-3 py-1.5 text-center text-[10px] font-bold text-amber-700 uppercase">
                                            SPEC
                                          </td>
                                          <td
                                            colSpan={8}
                                            className="px-4 py-2 text-[11px] text-amber-950 leading-relaxed italic whitespace-pre-line"
                                          >
                                            <strong className="not-italic text-amber-900 uppercase tracking-wider text-[10px] block mb-0.5">
                                              General Specification & Scope:
                                            </strong>
                                            {parent.sectionSpecification}
                                          </td>
                                        </tr>
                                      )}

                                      {/* Description Lines */}
                                      {(parent.descriptions || []).map((line) => {
                                        const isZeroQty =
                                          !line.quantity || Number(line.quantity) === 0;
                                        const isZeroSupply =
                                          !line.unitRateSupply ||
                                          Number(line.unitRateSupply) === 0;
                                        const isZeroInstall =
                                          !line.unitRateInstallation ||
                                          Number(line.unitRateInstallation) === 0;
                                        const isZeroAmount =
                                          !line.amount && !line.totalAmount;

                                        const lineAmount =
                                          line.totalAmount ||
                                          line.amount ||
                                          (line.amountSupply || 0) + (line.amountInstallation || 0);

                                        const hasBOM =
                                          Array.isArray(line.materials) && line.materials.length > 0;
                                        const isBOMOpen = !!expandedBOMRows[line._id];

                                        return (
                                          <Fragment key={line._id}>
                                            <tr
                                              className={`hover:bg-indigo-50/20 transition-colors ${isZeroQty ? "bg-slate-50/40 text-slate-800" : ""
                                                }`}
                                            >
                                              <td className="px-3 py-1.5 text-center font-mono text-[11px] text-gray-500 align-top">
                                                {line.srNo || "—"}
                                              </td>
                                              <td className="px-3 py-1.5 text-[11px] text-gray-800 align-top leading-relaxed">
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex-1 whitespace-pre-line">
                                                    {line.description}
                                                  </div>
                                                  {hasBOM && (
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleBOMRow(line._id)}
                                                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-1.5 py-0.5 rounded shrink-0 transition-colors"
                                                    >
                                                      <FaBoxes size={10} />
                                                      {line.materials.length} BOM
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-2 py-1.5 text-center text-[11px] text-gray-500 align-top">
                                                {isZeroQty && isZeroSupply && isZeroInstall
                                                  ? "—"
                                                  : line.unit || "nos"}
                                              </td>
                                              <td className="px-2 py-1.5 text-center text-[11px] font-semibold text-gray-800 align-top">
                                                {line.isRateOnly
                                                  ? "—"
                                                  : isZeroQty
                                                    ? "—"
                                                    : line.quantity}
                                              </td>
                                              <td className="px-2 py-1.5 text-right text-[11px] text-gray-600 font-mono align-top">
                                                {isZeroSupply ? "—" : line.unitRateSupply}
                                              </td>
                                              <td className="px-2 py-1.5 text-right text-[11px] text-gray-600 font-mono align-top">
                                                {isZeroInstall ? "—" : line.unitRateInstallation}
                                              </td>
                                              <td className="px-3 py-1.5 text-right text-[11px] text-gray-600 font-mono align-top">
                                                {Number(line.amountSupply || 0) === 0
                                                  ? "—"
                                                  : formatCurrency(line.amountSupply)}
                                              </td>
                                              <td className="px-3 py-1.5 text-right text-[11px] text-gray-600 font-mono align-top">
                                                {Number(line.amountInstallation || 0) === 0
                                                  ? "—"
                                                  : formatCurrency(line.amountInstallation)}
                                              </td>
                                              <td className="px-3 py-1.5 text-right font-bold text-[11px] text-gray-900 font-mono align-top">
                                                {line.isRateOnly ? (
                                                  <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                                                    Rate Only
                                                  </span>
                                                ) : isZeroAmount ? (
                                                  "—"
                                                ) : (
                                                  formatCurrency(lineAmount)
                                                )}
                                              </td>
                                            </tr>

                                            {/* Nested Raw Materials BOM Drawer */}
                                            {isBOMOpen && hasBOM && (
                                              <tr className="bg-slate-50/80 border-y border-gray-200">
                                                <td colSpan={9} className="px-6 py-2.5">
                                                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-inner">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                                      <FaBoxes size={11} className="text-indigo-500" />
                                                      Allocated Raw Materials & Recipe
                                                    </p>
                                                    <div className="space-y-1.5">
                                                      {line.materials.map((mat, mIdx) => (
                                                        <div
                                                          key={mIdx}
                                                          className="flex items-center justify-between text-xs text-gray-700 border-b border-gray-50 pb-1"
                                                        >
                                                          <span className="font-semibold text-gray-800">
                                                            {mat.rawMaterialName || "Material"}
                                                          </span>
                                                          <span className="font-mono text-gray-500 text-[11px]">
                                                            {mat.quantityPerUnit} {mat.uom || "nos"} @ {formatCurrency(mat.unitRate)}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                    </Fragment>
                                  );
                                })}

                                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                  <td
                                    colSpan={8}
                                    className="px-4 py-2 text-right text-xs text-slate-700"
                                  >
                                    Sub‑Section Total:
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs font-black text-indigo-900 font-mono">
                                    {formatCurrency(subSectionTotal)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex justify-end items-center mt-3 pt-3 border-t-2 border-indigo-200">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
                        Section Total:
                      </span>
                      <span className="text-base font-extrabold text-indigo-700">
                        {formatCurrency(sectionTotalAmount)}
                      </span>
                    </div>

                    {woList.length > 0 && (
                      <div className="border-t border-gray-200 pt-3 mt-2">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                          Work Orders
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">
                                  WO #
                                </th>
                                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">
                                  Type
                                </th>
                                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-400">
                                  Contractor / Customer
                                </th>
                                <th className="px-2 py-1 text-center text-[9px] font-bold uppercase text-gray-400">
                                  Status
                                </th>
                                <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">
                                  Amount
                                </th>
                                <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-400">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {woList.map((wo) => (
                                <tr key={wo._id} className="hover:bg-indigo-50/20">
                                  <td className="px-2 py-1 font-medium text-indigo-600">
                                    {wo.workOrderNumber}
                                  </td>
                                  <td className="px-2 py-1 text-xs font-medium text-gray-500 capitalize">
                                    {wo.orderType || "contractor"}
                                  </td>
                                  <td className="px-2 py-1 text-gray-600">
                                    {wo.orderType === "customer"
                                      ? wo.customer?.customerName ||
                                      wo.customer?.name ||
                                      "—"
                                      : wo.contractor?.supplierName ||
                                      wo.contractor?.name ||
                                      "—"}
                                  </td>
                                  <td className="px-2 py-1 text-center">
                                    <StatusBadge status={wo.status} />
                                  </td>
                                  <td className="px-2 py-1 text-right font-bold">
                                    {formatCurrency(
                                      (wo.items || []).reduce(
                                        (s, i) => s + (i.amount || 0),
                                        0
                                      )
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/admin/construction/work-orders/${wo._id}`
                                        )
                                      }
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
                <div
                  key={`mat-${sectionName}`}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div
                    className="px-6 py-4 bg-blue-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/80 transition-colors"
                    onClick={() => toggleMaterialSection(sectionName)}
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-gray-400 hover:text-blue-600">
                        {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                      </button>
                      <h3 className="text-sm font-bold text-gray-800">{sectionName}</h3>
                      <span className="text-xs text-gray-400">
                        ({allMaterials.length} materials)
                      </span>
                    </div>
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

                  {isExpanded && (
                    <div className="p-6 space-y-4">
                      {Object.keys(subSections).map((subSectionName) => {
                        const materials = subSections[subSectionName];
                        return (
                          <div
                            key={`mat-${sectionName}-${subSectionName}`}
                            className="ml-2 border-l-2 border-blue-200 pl-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                {subSectionName}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ({materials.length} materials)
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400">
                                      Material
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400">
                                      Unit
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                                      Qty
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                                      Rate
                                    </th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-400">
                                      Amount
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {materials.map((mat) => (
                                    <tr key={mat._id} className="hover:bg-blue-50/20">
                                      <td className="px-3 py-2 text-xs text-gray-700">
                                        {mat.itemName}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600">
                                        {mat.unit}
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
                                    </tr>
                                  ))}
                                  <tr className="bg-blue-50/30">
                                    <td
                                      colSpan="4"
                                      className="px-3 py-2 text-right text-xs font-bold text-blue-600"
                                    >
                                      Sub‑Section Total
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-bold text-blue-700">
                                      {formatCurrency(
                                        materials.reduce(
                                          (sum, m) => sum + (m.amount || 0),
                                          0
                                        )
                                      )}
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
                          {formatCurrency(
                            allMaterials.reduce((sum, m) => sum + (m.amount || 0), 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state for materials */}
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
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaFileContract size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Create Work Order</h2>
            </div>
            <form onSubmit={handleGenerateWo} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Sub‑Sections" req />
                  <Select
                    options={subSectionOptions}
                    value={subSectionOptions.filter((opt) =>
                      selectedSubSections.includes(opt.value)
                    )}
                    onChange={handleSubSectionSelection}
                    placeholder="Select sub‑sections..."
                    isMulti
                    className="text-sm"
                  />
                </div>

                <div>
                  <Lbl text="Order Type" req />
                  <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${orderType === "contractor"
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
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${orderType === "customer"
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
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Status" />
                  <select
                    className={fi}
                    value={woStatus}
                    onChange={(e) => setWoStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="in-progress">In Progress</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Issue Date" />
                  <input
                    type="date"
                    className={fi}
                    value={woDate}
                    onChange={(e) => setWoDate(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Lbl text="Remarks" />
                  <input
                    type="text"
                    className={fi}
                    value={woRemarks}
                    onChange={(e) => setWoRemarks(e.target.value)}
                    placeholder="Notes..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Items ({woItems.length})
                </p>
                {woItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Select at least one sub‑section to see items.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[120px]">
                            Section
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[100px]">
                            Sub‑Section
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[150px]">
                            Item Name
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[60px]">
                            Type
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[150px]">
                            Description
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                            Unit
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                            Rate
                          </th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-400">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {woItems.map((item) => (
                          <tr key={item._id}>
                            <td className="px-3 py-2 text-xs text-gray-500">{item.section}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{item.subSection}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{item.itemName}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {item.isMaterial ? (
                                <span className="text-blue-600">Material</span>
                              ) : (
                                <span className="text-indigo-600">BOQ</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-700">
                              {item.description}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">{item.unit}</td>
                            <td className="px-3 py-2 text-center text-xs">{item.quantity}</td>
                            <td className="px-3 py-2 text-center text-xs">{item.rate}</td>
                            <td className="px-3 py-2 text-right text-xs font-bold text-gray-700">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsWoModalOpen(false)}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingWo || woItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {generatingWo ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FaCheck size={12} />
                  )}
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
                  value={sectionOptions.find((opt) => opt.value === addItemsSection) || null}
                  onChange={(opt) => {
                    setAddItemsSection(opt?.value || "");
                    setAddItemsSubSection("Main");
                  }}
                  placeholder="Select section..."
                  className="text-sm"
                  isClearable
                />
              </div>
              <div>
                <Lbl text="Sub‑Section" />
                <Select
                  options={subSectionChoices}
                  value={
                    subSectionChoices.find((opt) => opt.value === addItemsSubSection) || null
                  }
                  onChange={(opt) => setAddItemsSubSection(opt?.value || "Main")}
                  placeholder="Select sub‑section..."
                  className="text-sm"
                  isClearable
                  isDisabled={!addItemsSection}
                />
              </div>
              <div>
                <Lbl text="Search Materials by Name" />
                <input
                  type="text"
                  className={fi}
                  placeholder="Type to filter materials by Item Name..."
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
                  placeholder="Select materials by Item Name..."
                  isMulti
                  isSearchable
                  className="text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Materials to add
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddItemsRows((prev) => [
                        ...prev,
                        {
                          _id: generateId(),
                          itemId: null,
                          itemName: "",
                          description: "",
                          unit: "nos",
                          quantity: 1,
                          rate: 0,
                        },
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
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[180px]">
                            Material (Item Name)
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400 min-w-[80px]">
                            Unit
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                            Rate
                          </th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-400">
                            Amount
                          </th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-400">
                            #
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {addItemsRows.map((row) => (
                          <tr key={row._id}>
                            <td className="px-3 py-2">
                              <Select
                                options={itemOptions}
                                value={
                                  itemOptions.find(
                                    (opt) =>
                                      normalize(opt.itemName) === normalize(row.itemName)
                                  ) || null
                                }
                                onChange={(selected) => {
                                  handleAddItemsRowChange(
                                    row._id,
                                    "itemName",
                                    selected?.itemName || ""
                                  );
                                  handleAddItemsRowChange(
                                    row._id,
                                    "itemId",
                                    selected?.value || null
                                  );
                                  handleAddItemsRowChange(
                                    row._id,
                                    "unit",
                                    selected?.unit || "nos"
                                  );
                                  handleAddItemsRowChange(
                                    row._id,
                                    "description",
                                    selected?.description || ""
                                  );
                                }}
                                placeholder="Search or select Item Name..."
                                isSearchable
                                isClearable
                                className="text-xs"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none"
                                value={row.unit}
                                onChange={(e) =>
                                  handleAddItemsRowChange(row._id, "unit", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
                                value={row.quantity}
                                onChange={(e) =>
                                  handleAddItemsRowChange(row._id, "quantity", e.target.value)
                                }
                                min="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                className="w-16 px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-blue-300 outline-none text-center"
                                value={row.rate}
                                onChange={(e) =>
                                  handleAddItemsRowChange(row._id, "rate", e.target.value)
                                }
                                min="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-700">
                              {formatCurrency(
                                (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0)
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddItemsRows((prev) =>
                                    prev.filter((r) => r._id !== row._id)
                                  );
                                  setAddItemsSelected((prev) =>
                                    prev.filter(
                                      (opt) =>
                                        normalize(opt.itemName) !== normalize(row.itemName)
                                    )
                                  );
                                }}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <FaTrash size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
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
                  onClick={() => {
                    setIsAddItemsModalOpen(false);
                    setSearchTerm("");
                  }}
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
