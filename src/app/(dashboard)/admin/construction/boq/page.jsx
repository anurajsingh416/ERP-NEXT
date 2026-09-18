// "use client";

// import { useEffect, useReducer, useCallback, useMemo, memo, useRef } from "react";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import api from "@/lib/api";
// import Select from "react-select";
// import {
//   FaPlus,
//   FaCheck,
//   FaFileInvoice,
//   FaFileExcel,
//   FaTimes,
//   FaTrash,
//   FaFolderOpen,
//   FaEdit,
//   FaTrashAlt,
//   FaUserTie,
//   FaUserFriends,
// } from "react-icons/fa";
// import { HiDotsVertical } from "react-icons/hi";
// import { toast } from "react-toastify";

// // ─── Utility: generate unique ID ────────────────────────────────────────────
// let idCounter = 0;
// const generateId = () => ++idCounter;

// // ─── Default section ────────────────────────────────────────────────────────
// const createDefaultSection = (index) => ({
//   id: generateId(),
//   name: `Section ${index}`,
//   subSections: [createDefaultSubSection(index, 1)],
// });

// const createDefaultSubSection = (sectionIndex, subIndex) => ({
//   id: generateId(),
//   name: `Sub-Section ${sectionIndex}.${subIndex}`,
//   items: [createDefaultItem()],
// });

// const createDefaultDescriptionLine = () => ({
//   id: generateId(),
//   srNo: "",
//   description: "",
//   qty: 1,
//   unit: "nos",
//   unitRateSupply: 0,
//   unitRateInstallation: 0,
// });

// const createDefaultItem = () => ({
//   id: generateId(),
//   descriptions: [createDefaultDescriptionLine()],
// });

// // ─── Shared formatter ──────────────────────────────────────────────────────
// const formatCurrency = (num) => {
//   return new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 0,
//   }).format(num);
// };

// const calcLine = (desc) => {
//   const qty = parseFloat(desc.qty) || 0;
//   const rateSupply = parseFloat(desc.unitRateSupply) || 0;
//   const rateInstall = parseFloat(desc.unitRateInstallation) || 0;
//   const amountSupply = qty * rateSupply;
//   const amountInstallation = qty * rateInstall;
//   return { amountSupply, amountInstallation, totalAmount: amountSupply + amountInstallation };
// };

// const itemTotal = (item) => item.descriptions.reduce((sum, d) => sum + calcLine(d).totalAmount, 0);
// const subSectionTotal = (sub) => sub.items.reduce((sum, it) => sum + itemTotal(it), 0);
// const sectionTotalOf = (sec) => sec.subSections.reduce((sum, sub) => sum + subSectionTotal(sub), 0);

// // ─── Hook: auto‑grow textarea ─────────────────────────────────────────────
// function useAutosizeTextarea(value) {
//   const ref = useRef(null);

//   useEffect(() => {
//     const el = ref.current;
//     if (!el) return;
//     el.style.height = "auto";
//     el.style.height = `${el.scrollHeight}px`;
//   }, [value]);

//   return ref;
// }

// // ─── UI Helpers ─────────────────────────────────────────────────────────────
// const Lbl = ({ text, req }) => (
//   <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
//     {text}
//     {req && <span className="text-red-500 ml-0.5">*</span>}
//   </label>
// );

// const fi =
//   "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

// const StatusBadge = ({ status }) => {
//   const colors = {
//     draft: "bg-gray-100 text-gray-600",
//     submitted: "bg-blue-100 text-blue-700",
//     approved: "bg-emerald-100 text-emerald-700",
//     rejected: "bg-red-100 text-red-700",
//   };
//   return (
//     <span
//       className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}
//     >
//       {status}
//     </span>
//   );
// };

// // ─── Reducer ────────────────────────────────────────────────────────────────
// const initialState = {
//   sections: [createDefaultSection(1)],
// };

// function boqReducer(state, action) {
//   switch (action.type) {
//     case "SET_SECTIONS":
//       return { ...state, sections: action.payload };

//     case "ADD_SECTION": {
//       const newIndex = state.sections.length + 1;
//       return {
//         ...state,
//         sections: [...state.sections, createDefaultSection(newIndex)],
//       };
//     }
//     case "REMOVE_SECTION": {
//       if (state.sections.length === 1) {
//         toast.warning("Cannot remove the last section.");
//         return state;
//       }
//       return {
//         ...state,
//         sections: state.sections.filter((s) => s.id !== action.payload),
//       };
//     }
//     case "UPDATE_SECTION_NAME": {
//       return {
//         ...state,
//         sections: state.sections.map((s) =>
//           s.id === action.payload.sectionId
//             ? { ...s, name: action.payload.newName }
//             : s
//         ),
//       };
//     }

//     case "ADD_SUB_SECTION": {
//       const section = state.sections.find((s) => s.id === action.payload);
//       if (!section) return state;
//       const secIndex = state.sections.findIndex((s) => s.id === action.payload) + 1;
//       const newSubIndex = section.subSections.length + 1;
//       return {
//         ...state,
//         sections: state.sections.map((s) =>
//           s.id === action.payload
//             ? {
//               ...s,
//               subSections: [
//                 ...s.subSections,
//                 createDefaultSubSection(secIndex, newSubIndex),
//               ],
//             }
//             : s
//         ),
//       };
//     }
//     case "REMOVE_SUB_SECTION": {
//       const { sectionId, subSectionId } = action.payload;
//       const section = state.sections.find((s) => s.id === sectionId);
//       if (!section || section.subSections.length === 1) {
//         toast.warning("Cannot remove the last sub-section. Remove the section instead.");
//         return state;
//       }
//       return {
//         ...state,
//         sections: state.sections.map((s) =>
//           s.id === sectionId
//             ? {
//               ...s,
//               subSections: s.subSections.filter((sub) => sub.id !== subSectionId),
//             }
//             : s
//         ),
//       };
//     }
//     case "UPDATE_SUB_SECTION_NAME": {
//       const { sectionId, subSectionId, newName } = action.payload;
//       return {
//         ...state,
//         sections: state.sections.map((s) =>
//           s.id === sectionId
//             ? {
//               ...s,
//               subSections: s.subSections.map((sub) =>
//                 sub.id === subSectionId ? { ...sub, name: newName } : sub
//               ),
//             }
//             : s
//         ),
//       };
//     }

//     case "ADD_ITEM": {
//       const { sectionId, subSectionId } = action.payload;
//       return {
//         ...state,
//         sections: state.sections.map((s) =>
//           s.id === sectionId
//             ? {
//               ...s,
//               subSections: s.subSections.map((sub) =>
//                 sub.id === subSectionId
//                   ? { ...sub, items: [...sub.items, createDefaultItem()] }
//                   : sub
//               ),
//             }
//             : s
//         ),
//       };
//     }
//     case "REMOVE_ITEM": {
//       const { sectionId, subSectionId, itemId } = action.payload;
//       const section = state.sections.find((s) => s.id === sectionId);
//       if (!section) return state;
//       const subSection = section.subSections.find((sub) => sub.id === subSectionId);
//       if (!subSection || subSection.items.length === 1) {
//         toast.warning("Cannot remove the last item. Delete the sub-section instead.");
//         return state;
//       }
//       return {
//         ...state,
//         sections: state.sections.map((s) =>
//           s.id === sectionId
//             ? {
//               ...s,
//               subSections: s.subSections.map((sub) =>
//                 sub.id === subSectionId
//                   ? {
//                     ...sub,
//                     items: sub.items.filter((it) => it.id !== itemId),
//                   }
//                   : sub
//               ),
//             }
//             : s
//         ),
//       };
//     }
//     case "UPDATE_ITEM_FIELD": {
//       const { sectionId, subSectionId, itemId, field, value } = action.payload;
//       return {
//         ...state,
//         sections: state.sections.map((s) =>
//           s.id === sectionId
//             ? {
//               ...s,
//               subSections: s.subSections.map((sub) =>
//                 sub.id === subSectionId
//                   ? {
//                     ...sub,
//                     items: sub.items.map((it) => {
//                       if (it.id !== itemId) return it;
//                       const updated = { ...it, [field]: value };
//                       if (field === "quantity" || field === "rate") {
//                         const qty =
//                           field === "quantity"
//                             ? parseFloat(value) || 0
//                             : parseFloat(it.quantity) || 0;
//                         const rate =
//                           field === "rate"
//                             ? parseFloat(value) || 0
//                             : parseFloat(it.rate) || 0;
//                         updated.amount = qty * rate;
//                       }
//                       return updated;
//                     }),
//                   }
//                   : sub
//               ),
//             }
//             : s
//         ),
//       };
//     }

//     default:
//       return state;
//   }
// }

// // ─── ItemRow Component ──────────────────────────────────────────────────────
// const ItemRow = memo(function ItemRow({
//   item,
//   itemNumber,
//   sectionId,
//   subSectionId,
//   onUpdateItem,
//   onRemoveItem,
//   isLastItem,
// }) {
//   const handleItemNameChange = useCallback(
//     (e) => onUpdateItem(sectionId, subSectionId, item.id, "itemName", e.target.value),
//     [sectionId, subSectionId, item.id, onUpdateItem]
//   );

//   const handleDescriptionChange = useCallback(
//     (e) => onUpdateItem(sectionId, subSectionId, item.id, "description", e.target.value),
//     [sectionId, subSectionId, item.id, onUpdateItem]
//   );

//   const handleUnitChange = useCallback(
//     (e) => onUpdateItem(sectionId, subSectionId, item.id, "unit", e.target.value),
//     [sectionId, subSectionId, item.id, onUpdateItem]
//   );

//   const handleQuantityChange = useCallback(
//     (e) => {
//       const val = e.target.value ? parseFloat(e.target.value) : 0;
//       onUpdateItem(sectionId, subSectionId, item.id, "quantity", val);
//     },
//     [sectionId, subSectionId, item.id, onUpdateItem]
//   );

//   const handleRateChange = useCallback(
//     (e) => {
//       const val = e.target.value ? parseFloat(e.target.value) : 0;
//       onUpdateItem(sectionId, subSectionId, item.id, "rate", val);
//     },
//     [sectionId, subSectionId, item.id, onUpdateItem]
//   );

//   const handleRemove = useCallback(
//     () => onRemoveItem(sectionId, subSectionId, item.id),
//     [sectionId, subSectionId, item.id, onRemoveItem]
//   );

//   return (
//     <tr className="hover:bg-gray-50">
//       <td className="px-2 py-0.5 text-center text-gray-500 text-[10px] font-bold">
//         {itemNumber}
//       </td>
//       <td className="px-2 py-0.5">
//         <input
//           type="text"
//           className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none"
//           value={item.itemName || ""}
//           onChange={handleItemNameChange}
//           placeholder="Item name"
//         />
//       </td>
//       <td className="px-2 py-0.5">
//         <input
//           type="text"
//           className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none"
//           value={item.description || ""}
//           onChange={handleDescriptionChange}
//           placeholder="Description"
//         />
//       </td>
//       <td className="px-2 py-0.5">
//         <input
//           type="text"
//           className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none text-center"
//           value={item.unit || ""}
//           onChange={handleUnitChange}
//           placeholder="nos"
//         />
//       </td>
//       <td className="px-2 py-0.5">
//         <input
//           type="number"
//           step="0.01"
//           className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none text-center"
//           value={item.rate || 0}
//           onChange={handleRateChange}
//         />
//       </td>
//       <td className="px-2 py-0.5">
//         <input
//           type="number"
//           step="0.01"
//           className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none text-center"
//           value={item.quantity || 0}
//           onChange={handleQuantityChange}
//         />
//       </td>
//       <td className="px-2 py-0.5 text-right font-bold text-gray-700 text-[10px]">
//         {formatCurrency(item.amount || 0)}
//       </td>
//       <td className="px-2 py-0.5 text-center">
//         <button
//           type="button"
//           onClick={handleRemove}
//           className="text-gray-300 hover:text-red-500 transition-colors"
//           disabled={isLastItem}
//         >
//           <FaTimes size={10} />
//         </button>
//       </td>
//     </tr>
//   );
// });

// // ─── Sub-Section Table ──────────────────────────────────────────────────────
// const SubSectionTable = memo(function SubSectionTable({
//   sectionId,
//   subSection,
//   subSectionNumber,
//   onAddItem,
//   onRemoveItem,
//   onUpdateItem,
//   onUpdateName,
//   onRemoveSubSection,
// }) {
//   const handleAddItem = useCallback(
//     () => onAddItem(sectionId, subSection.id),
//     [sectionId, subSection.id, onAddItem]
//   );

//   const handleRemoveSubSection = useCallback(
//     () => onRemoveSubSection(sectionId, subSection.id),
//     [sectionId, subSection.id, onRemoveSubSection]
//   );

//   const handleUpdateName = useCallback(
//     (e) => onUpdateName(sectionId, subSection.id, e.target.value),
//     [sectionId, subSection.id, onUpdateName]
//   );

//   const nameRef = useAutosizeTextarea(subSection.name);

//   return (
//     <div className="ml-4 mt-2 border-l-2 border-indigo-200 pl-4">
//       <div className="flex items-start justify-between mb-2 gap-2">
//         <div className="flex items-start gap-2 flex-1">
//           <span className="font-bold text-indigo-500 text-xs bg-indigo-100 px-2 py-0.5 rounded shrink-0 mt-0.5">
//             {subSectionNumber}
//           </span>
//           <textarea
//             ref={nameRef}
//             rows={1}
//             className="font-semibold text-gray-700 text-xs border border-transparent bg-transparent focus:border-indigo-300 focus:bg-white px-2 py-0.5 rounded outline-none resize-none overflow-hidden flex-1 min-w-[180px] leading-snug"
//             value={subSection.name}
//             onChange={handleUpdateName}
//             placeholder="Sub-Section Name"
//           />
//           <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">
//             {subSection.items.length} items
//           </span>
//         </div>
//         <div className="flex gap-1">
//           <button
//             type="button"
//             onClick={handleAddItem}
//             className="text-indigo-600 hover:text-indigo-800 text-xs"
//           >
//             <FaPlus size={10} /> Add Item
//           </button>
//           <button
//             type="button"
//             onClick={handleRemoveSubSection}
//             className="text-gray-400 hover:text-red-500 text-xs ml-1"
//           >
//             <FaTrash size={10} />
//           </button>
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full text-xs border border-gray-200 rounded-lg">
//           <thead className="bg-gray-50 text-[9px] font-black uppercase tracking-wider text-gray-400">
//             <tr>
//               <th className="px-2 py-1 text-center w-[30px]">Sr.No.</th>
//               <th className="px-2 py-1 text-left min-w-[120px]">Item</th>
//               <th className="px-2 py-1 text-left min-w-[100px]">Description</th>
//               <th className="px-2 py-1 text-center w-[50px]">Unit</th>
//               <th className="px-2 py-1 text-center w-[60px]">Rate (₹)</th>
//               <th className="px-2 py-1 text-center w-[50px]">Qty</th>
//               <th className="px-2 py-1 text-right w-[80px]">Amount (₹)</th>
//               <th className="px-2 py-1 text-center w-[25px]">#</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {subSection.items.length === 0 ? (
//               <tr>
//                 <td colSpan="8" className="px-2 py-2 text-center text-gray-400 text-[10px]">
//                   No items. Click "Add Item".
//                 </td>
//               </tr>
//             ) : (
//               subSection.items.map((item, idx) => {
//                 const itemNumber = `${subSectionNumber}.${idx + 1}`;
//                 return (
//                   <ItemRow
//                     key={item.id}
//                     item={item}
//                     itemNumber={itemNumber}
//                     sectionId={sectionId}
//                     subSectionId={subSection.id}
//                     onUpdateItem={onUpdateItem}
//                     onRemoveItem={onRemoveItem}
//                     isLastItem={subSection.items.length === 1}
//                   />
//                 );
//               })
//             )}
//           </tbody>
//           {subSection.items.length > 0 && (
//             <tfoot className="bg-gray-50/80 border-t border-gray-200">
//               <tr>
//                 <td colSpan="6" className="px-2 py-1 text-right text-[9px] font-bold text-gray-600">
//                   Sub-Total
//                 </td>
//                 <td className="px-2 py-1 text-right text-[11px] font-extrabold text-indigo-600">
//                   {formatCurrency(
//                     subSection.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
//                   )}
//                 </td>
//                 <td></td>
//               </tr>
//             </tfoot>
//           )}
//         </table>
//       </div>
//     </div>
//   );
// });

// // ─── Section Table ──────────────────────────────────────────────────────────
// const SectionTable = memo(function SectionTable({
//   section,
//   sectionIndex,
//   onUpdateSectionName,
//   onRemoveSection,
//   onAddSubSection,
//   onRemoveSubSection,
//   onUpdateSubSectionName,
//   onAddItem,
//   onRemoveItem,
//   onUpdateItem,
// }) {
//   const handleUpdateSectionName = useCallback(
//     (e) => onUpdateSectionName(section.id, e.target.value),
//     [section.id, onUpdateSectionName]
//   );

//   const handleRemoveSection = useCallback(
//     () => onRemoveSection(section.id),
//     [section.id, onRemoveSection]
//   );

//   const handleAddSubSection = useCallback(
//     () => onAddSubSection(section.id),
//     [section.id, onAddSubSection]
//   );

//   const nameRef = useAutosizeTextarea(section.name);

//   const sectionTotal = useMemo(() => {
//     return section.subSections.reduce(
//       (total, sub) =>
//         total + sub.items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0),
//       0
//     );
//   }, [section.subSections]);

//   const totalItems = useMemo(() => {
//     return section.subSections.reduce((count, sub) => count + sub.items.length, 0);
//   }, [section.subSections]);

//   return (
//     <div className="border border-gray-300 rounded-xl p-4 bg-white shadow-sm">
//       <div className="flex items-start justify-between mb-3 gap-2">
//         <div className="flex items-start gap-2 flex-1">
//           <span className="font-bold text-indigo-700 text-sm bg-indigo-100 px-2 py-0.5 rounded shrink-0 mt-1">
//             {sectionIndex}
//           </span>
//           <textarea
//             ref={nameRef}
//             rows={1}
//             className="font-bold text-gray-800 text-sm border border-transparent bg-transparent focus:border-indigo-300 focus:bg-white px-2 py-1 rounded outline-none resize-none overflow-hidden flex-1 min-w-[150px] leading-snug"
//             value={section.name}
//             onChange={handleUpdateSectionName}
//             placeholder="Section Name"
//           />
//           <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full shrink-0 mt-1">
//             {section.subSections.length} sub-sections
//           </span>
//         </div>
//         <div className="flex gap-2 shrink-0">
//           <button
//             type="button"
//             onClick={handleAddSubSection}
//             className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
//           >
//             <FaPlus size={10} /> Add Sub-Section
//           </button>
//           <button
//             type="button"
//             onClick={handleRemoveSection}
//             className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1"
//           >
//             <FaTrash size={12} /> Remove Section
//           </button>
//         </div>
//       </div>

//       <div className="space-y-3">
//         {section.subSections.map((sub, subIdx) => {
//           const subNumber = `${sectionIndex}.${subIdx + 1}`;
//           return (
//             <SubSectionTable
//               key={sub.id}
//               sectionId={section.id}
//               subSection={sub}
//               subSectionNumber={subNumber}
//               onAddItem={onAddItem}
//               onRemoveItem={onRemoveItem}
//               onUpdateItem={onUpdateItem}
//               onUpdateName={onUpdateSubSectionName}
//               onRemoveSubSection={onRemoveSubSection}
//             />
//           );
//         })}
//       </div>

//       {totalItems > 0 && (
//         <div className="flex justify-end items-center mt-3 pt-2 border-t-2 border-indigo-200">
//           <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
//             Section Total ({totalItems} items)
//           </span>
//           <span className="text-sm font-extrabold text-indigo-700">
//             {formatCurrency(sectionTotal)}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// });

// // ─── SectionContainer ──────────────────────────────────────────────────────
// const SectionContainer = memo(function SectionContainer({ section, sectionIndex, dispatch }) {
//   const onUpdateSectionName = useCallback(
//     (id, name) => dispatch({ type: "UPDATE_SECTION_NAME", payload: { sectionId: id, newName: name } }),
//     [dispatch]
//   );

//   const onRemoveSection = useCallback(
//     (id) => dispatch({ type: "REMOVE_SECTION", payload: id }),
//     [dispatch]
//   );

//   const onAddSubSection = useCallback(
//     (id) => dispatch({ type: "ADD_SUB_SECTION", payload: id }),
//     [dispatch]
//   );

//   const onRemoveSubSection = useCallback(
//     (sectionId, subSectionId) =>
//       dispatch({ type: "REMOVE_SUB_SECTION", payload: { sectionId, subSectionId } }),
//     [dispatch]
//   );

//   const onUpdateSubSectionName = useCallback(
//     (sectionId, subSectionId, newName) =>
//       dispatch({
//         type: "UPDATE_SUB_SECTION_NAME",
//         payload: { sectionId, subSectionId, newName },
//       }),
//     [dispatch]
//   );

//   const onAddItem = useCallback(
//     (sectionId, subSectionId) =>
//       dispatch({ type: "ADD_ITEM", payload: { sectionId, subSectionId } }),
//     [dispatch]
//   );

//   const onRemoveItem = useCallback(
//     (sectionId, subSectionId, itemId) =>
//       dispatch({ type: "REMOVE_ITEM", payload: { sectionId, subSectionId, itemId } }),
//     [dispatch]
//   );

//   const onUpdateItem = useCallback(
//     (sectionId, subSectionId, itemId, field, value) =>
//       dispatch({
//         type: "UPDATE_ITEM_FIELD",
//         payload: { sectionId, subSectionId, itemId, field, value },
//       }),
//     [dispatch]
//   );

//   return (
//     <SectionTable
//       section={section}
//       sectionIndex={sectionIndex}
//       onUpdateSectionName={onUpdateSectionName}
//       onRemoveSection={onRemoveSection}
//       onAddSubSection={onAddSubSection}
//       onRemoveSubSection={onRemoveSubSection}
//       onUpdateSubSectionName={onUpdateSubSectionName}
//       onAddItem={onAddItem}
//       onRemoveItem={onRemoveItem}
//       onUpdateItem={onUpdateItem}
//     />
//   );
// });

// // ─── Main Component ────────────────────────────────────────────────────────
// export default function ConstructionBOQPage() {
//   const [boqs, setBoqs] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [customers, setCustomers] = useState([]); // ✅ NEW
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isImportModalOpen, setIsImportModalOpen] = useState(false);
//   const [editBOQ, setEditBOQ] = useState(null);

//   // ── Form State ──
//   const [selectedProject, setSelectedProject] = useState(null);
//   const [selectedContractor, setSelectedContractor] = useState(null);
//   const [selectedCustomer, setSelectedCustomer] = useState(null); // ✅ NEW
//   const [selectedProjectImport, setSelectedProjectImport] = useState(null);
//   const [importFile, setImportFile] = useState(null);
//   const [importing, setImporting] = useState(false);
//   const [boqNumber, setBoqNumber] = useState("");
//   const [boqDate, setBoqDate] = useState("");
//   const [status, setStatus] = useState("draft");
//   const [state, dispatch] = useReducer(boqReducer, initialState);
//   const [openMenuId, setOpenMenuId] = useState(null);
//   const { sections } = state;
//   const [remarks, setRemarks] = useState("");
//   const router = useRouter();

//   // ── Fetch BOQs, Projects, Suppliers, Customers ──
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           setLoading(false);
//           return;
//         }
//         const headers = { headers: { Authorization: `Bearer ${token}` } };

//         const [boqRes, projRes, supRes, custRes] = await Promise.allSettled([
//           api.get("/construction/boq", headers),
//           api.get("/construction/projects", headers),
//           api.get("/suppliers", headers),
//           api.get("/customers", headers), // ✅ fetch customers
//         ]);

//         if (boqRes.status === "fulfilled") {
//           setBoqs(boqRes.value.data?.data || boqRes.value.data || []);
//         } else {
//           console.warn("BOQ API failed:", boqRes.reason);
//           setBoqs([]);
//         }

//         if (projRes.status === "fulfilled") {
//           setProjects(projRes.value.data?.data || projRes.value.data || []);
//         } else {
//           console.warn("Projects API failed:", projRes.reason);
//           setProjects([]);
//         }

//         if (supRes.status === "fulfilled") {
//           setSuppliers(supRes.value.data?.data || supRes.value.data || []);
//         } else {
//           console.warn("Suppliers API failed:", supRes.reason);
//           setSuppliers([]);
//         }

//         if (custRes.status === "fulfilled") {
//           setCustomers(custRes.value.data?.data || custRes.value.data || []);
//         } else {
//           console.warn("Customers API failed:", custRes.reason);
//           setCustomers([]);
//         }
//       } catch (err) {
//         console.error("Fetch error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // ── Calculate total across all sections ──
//   const totalBOQAmount = useMemo(() => {
//     return sections.reduce(
//       (sum, sec) =>
//         sum +
//         sec.subSections.reduce(
//           (subSum, sub) =>
//             subSum + sub.items.reduce((itemSum, it) => itemSum + (parseFloat(it.amount) || 0), 0),
//           0
//         ),
//       0
//     );
//   }, [sections]);

//   // ── Open Modal ──
//   const openModal = (boq = null) => {
//     setEditBOQ(boq);
//     if (boq) {
//       setSelectedProject({ value: boq.project._id, label: boq.project.name });
//       setSelectedContractor(
//         boq.contractor
//           ? { value: boq.contractor._id, label: boq.contractor.supplierName || boq.contractor.name || boq.contractor.contactPersonName || boq.contractor._id }
//           : null
//       );
//       setSelectedCustomer(
//         boq.customer
//           ? { value: boq.customer._id, label: boq.customer.customerName || boq.customer.name || boq.customer.contactPersonName || boq.customer._id }
//           : null
//       );
//       setBoqNumber(boq.boqNumber);
//       setBoqDate(boq.date.split("T")[0]);
//       setStatus(boq.status);
//       setRemarks(boq.remarks || "");

//       // ── Group by section, then by subSection ──
//       const sectionsMap = new Map();
//       boq.items.forEach((item) => {
//         const sectionName = item.section || "Other Work";
//         const subSectionName = item.subSection || "Main";
//         if (!sectionsMap.has(sectionName)) {
//           sectionsMap.set(sectionName, new Map());
//         }
//         const subMap = sectionsMap.get(sectionName);
//         if (!subMap.has(subSectionName)) {
//           subMap.set(subSectionName, []);
//         }
//         subMap.get(subSectionName).push({
//           id: generateId(),
//           itemName: item.itemName || "",
//           description: item.description || "",
//           unit: item.unit || "nos",
//           quantity: item.quantity || 0,
//           rate: item.rate || 0,
//           amount: item.amount || 0,
//         });
//       });

//       // ── Convert to sections array with subSections ──
//       const sectionsFromBOQ = Array.from(sectionsMap.entries()).map(([sectionName, subMap]) => ({
//         id: generateId(),
//         name: sectionName,
//         subSections: Array.from(subMap.entries()).map(([subName, items]) => ({
//           id: generateId(),
//           name: subName,
//           items: items,
//         })),
//       }));

//       dispatch({
//         type: "SET_SECTIONS",
//         payload: sectionsFromBOQ.length ? sectionsFromBOQ : [createDefaultSection(1)],
//       });
//     } else {
//       setSelectedProject(null);
//       setSelectedContractor(null);
//       setSelectedCustomer(null);
//       setBoqNumber(`BOQ-${Date.now().toString().slice(-6)}`);
//       setBoqDate(new Date().toISOString().split("T")[0]);
//       setStatus("draft");
//       setRemarks("");
//       dispatch({ type: "SET_SECTIONS", payload: [createDefaultSection(1)] });
//     }
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setEditBOQ(null);
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this BOQ? This action cannot be undone.")) return;
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       await api.delete(`/construction/boq/${id}`, headers);
//       // refresh list
//       const boqRes = await api.get("/construction/boq", headers);
//       setBoqs(boqRes.data?.data || boqRes.data || []);
//       toast.success("BOQ deleted successfully.");
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to delete BOQ.");
//     }
//     setOpenMenuId(null);
//   };

//   const handleEdit = (boq) => {
//     openModal(boq);
//     setOpenMenuId(null);
//   };

//   // ── Submit BOQ ──
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!selectedProject) {
//       toast.error("Please select a project.");
//       return;
//     }

//     const validItems = [];
//     sections.forEach((sec) => {
//       sec.subSections.forEach((sub) => {
//         sub.items.forEach((item) => {
//           item.descriptions.forEach((desc) => {
//             if (desc.description && desc.description.trim() !== "") {
//               const { amountSupply, amountInstallation, totalAmount } = calcLine(desc);
//               validItems.push({
//                 itemGroupId: item.id,      // ties multiple lines back to one Item on reload
//                 srNo: desc.srNo || "",
//                 description: desc.description,
//                 unit: desc.unit,
//                 quantity: parseFloat(desc.qty) || 0,
//                 unitRateSupply: parseFloat(desc.unitRateSupply) || 0,
//                 unitRateInstallation: parseFloat(desc.unitRateInstallation) || 0,
//                 amountSupply,
//                 amountInstallation,
//                 amount: totalAmount,
//                 section: sec.name,
//                 subSection: sub.name,
//               });
//             }
//           });
//         });
//       });
//     });

//     if (validItems.length === 0) {
//       toast.error("Please add at least one BOQ item.");
//       return;
//     }

//     const payload = {
//       project: selectedProject.value,
//       contractor: selectedContractor?.value || null,
//       customer: selectedCustomer?.value || null, // ✅ include customer
//       boqNumber,
//       date: boqDate,
//       status,
//       remarks,
//       items: validItems,
//     };

//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       if (editBOQ) {
//         const res = await api.put(`/construction/boq/${editBOQ._id}`, payload, headers);
//         setBoqs(
//           boqs.map((b) => (b._id === editBOQ._id ? res.data.data || res.data : b))
//         );
//         toast.success("BOQ updated successfully!");
//       } else {
//         const res = await api.post("/construction/boq", payload, headers);
//         setBoqs([res.data.data || res.data, ...boqs]);
//         toast.success("BOQ created successfully!");
//       }
//       closeModal();
//     } catch (err) {
//       console.error("❌ BOQ save failed:", err);
//       toast.error(err.response?.data?.message || "Failed to save BOQ. Check console.");
//     }
//   };

//   // ── Import BOQ from Excel ──
//   const handleImport = async () => {
//     if (!selectedProjectImport || !importFile) {
//       toast.error("Please select project and upload file.");
//       return;
//     }

//     setImporting(true);
//     const formData = new FormData();
//     formData.append("projectId", selectedProjectImport.value);
//     formData.append("file", importFile);

//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/construction/boq/import", {
//         method: "POST",
//         headers: { Authorization: `Bearer ${token}` },
//         body: formData,
//       });
//       const data = await res.json();

//       if (data.success) {
//         toast.success(data.message);
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const refreshRes = await api.get("/construction/boq", headers);
//         setBoqs(refreshRes.data.data || refreshRes.data || []);
//         setIsImportModalOpen(false);
//         setImportFile(null);
//         setSelectedProjectImport(null);
//       } else {
//         toast.error(data.message);
//       }
//     } catch (err) {
//       console.error("Import error:", err);
//       toast.error("Import failed. Check console.");
//     } finally {
//       setImporting(false);
//     }
//   };

//   // ── Build options ──
//   const supplierOptions = suppliers.map((s) => ({
//     value: s._id,
//     label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id,
//   }));

//   const customerOptions = customers.map((c) => ({
//     value: c._id,
//     label: c.customerName || c.name || c.contactPersonName || c._id,
//   }));

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//               <FaFileInvoice className="text-indigo-600" /> Construction BOQ
//             </h1>
//             <p className="text-sm text-gray-400 mt-0.5">
//               Project estimates with nested sections & manual item entry
//             </p>
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={() => setIsImportModalOpen(true)}
//               className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
//             >
//               <FaFileExcel size={12} /> Import Excel
//             </button>
//             <button
//               onClick={() => openModal()}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
//             >
//               <FaPlus size={12} /> New BOQ
//             </button>
//           </div>
//         </div>

//         {/* BOQ Table */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Sr. No.</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">BOQ #</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Contractor</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Customer</th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Phase</th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Date</th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Total Amount</th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-50">

//                 {loading ? (

//                   <tr>
//                     <td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">Loading BOQs...</td>
//                   </tr>
//                 ) : boqs.length === 0 ? (
//                   <tr>
//                     <td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">No BOQs found. Import from Excel or create manually.</td>
//                   </tr>
//                 ) : (
//                   boqs.map((b) => (
//                     <tr key={b._id} className="hover:bg-indigo-50/20 transition-colors">
//                       <td className="px-6 py-4 text-gray-500 text-sm">{boqs.indexOf(b) + 1}</td>
//                       <td className="px-6 py-4">
//                         <button
//                           onClick={() => router.push(`/admin/construction/boq/${b._id}`)}
//                           className="font-bold text-indigo-600 hover:underline cursor-pointer"
//                         >
//                           {b.boqNumber}
//                         </button>
//                       </td>
//                       <td className="px-6 py-4 font-medium text-gray-700">
//                         {b.project?.name || "N/A"}
//                       </td>
//                       <td className="px-6 py-4 text-gray-600">
//                         {b.contractor?.supplierName || b.contractor?.name || "—"}
//                       </td>
//                       <td className="px-6 py-4 text-gray-600">
//                         {b.customer?.customerName || b.customer?.name || "—"}
//                       </td>
//                       <td className="px-6 py-4 text-center font-bold text-indigo-500">
//                         {b.phase || "I"}
//                       </td>
//                       <td className="px-6 py-4 text-gray-500 text-xs">
//                         {new Date(b.date).toLocaleDateString("en-GB")}
//                       </td>
//                       <td className="px-6 py-4 text-right font-bold text-gray-800">
//                         {formatCurrency(
//                           b.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
//                         )}
//                       </td>
//                       <td className="px-6 py-4 text-center">
//                         <StatusBadge status={b.status} />
//                       </td>
//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={() => setOpenMenuId(openMenuId === b._id ? null : b._id)}
//                           className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"
//                         >
//                           <HiDotsVertical size={18} />
//                         </button>
//                         {openMenuId === b._id && (
//                           <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
//                             <button
//                               onClick={() => handleEdit(b)}
//                               className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
//                             >
//                               <FaEdit size={14} className="text-indigo-500" />
//                               Edit
//                             </button>
//                             <button
//                               onClick={() => handleDelete(b._id)}
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

//       {/* ── BOQ Modal ── */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh]">
//             <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
//               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
//                 <FaFileInvoice size={20} />
//               </div>
//               <h2 className="text-xl font-black text-gray-900 tracking-tight">
//                 {editBOQ ? "Edit BOQ" : "Create Bill of Quantities"}
//               </h2>
//               <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
//                 <span className="font-bold text-gray-400">Total:</span>
//                 <span className="font-black text-indigo-600">
//                   {formatCurrency(totalBOQAmount)}
//                 </span>
//               </div>
//             </div>

//             <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <div className="md:col-span-2">
//                   <Lbl text="Project" req />
//                   <Select
//                     options={projects.map((p) => ({ value: p._id, label: p.name }))}
//                     value={selectedProject}
//                     onChange={(s) => setSelectedProject(s)}
//                     placeholder="Select Project..."
//                     className="text-sm"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="BOQ Number" req />
//                   <input
//                     type="text"
//                     className={fi}
//                     value={boqNumber}
//                     onChange={(e) => setBoqNumber(e.target.value)}
//                     required
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="Date" req />
//                   <input
//                     type="date"
//                     className={fi}
//                     value={boqDate}
//                     onChange={(e) => setBoqDate(e.target.value)}
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div>
//                   <Lbl text="Contractor" />
//                   <Select
//                     options={supplierOptions}
//                     value={selectedContractor}
//                     onChange={(s) => setSelectedContractor(s)}
//                     placeholder="Select Contractor (optional)..."
//                     className="text-sm"
//                     isClearable
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="Customer" /> {/* ✅ NEW */}
//                   <Select
//                     options={customerOptions}
//                     value={selectedCustomer}
//                     onChange={(s) => setSelectedCustomer(s)}
//                     placeholder="Select Customer (optional)..."
//                     className="text-sm"
//                     isClearable
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="Status" />
//                   <select
//                     className={fi}
//                     value={status}
//                     onChange={(e) => setStatus(e.target.value)}
//                   >
//                     <option value="draft">Draft</option>
//                     <option value="submitted">Submitted</option>
//                     <option value="approved">Approved</option>
//                     <option value="rejected">Rejected</option>
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <Lbl text="Remarks" />
//                 <input
//                   type="text"
//                   className={fi}
//                   value={remarks}
//                   onChange={(e) => setRemarks(e.target.value)}
//                   placeholder="General notes..."
//                 />
//               </div>

//               {/* ── Sections ── */}
//               <div className="border-t border-gray-200 pt-4">
//                 <div className="flex items-center justify-between mb-4">
//                   <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
//                     Sections & Sub-Sections
//                   </p>
//                   <button
//                     type="button"
//                     onClick={() => dispatch({ type: "ADD_SECTION" })}
//                     className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
//                   >
//                     <FaPlus size={10} /> Add Section
//                   </button>
//                 </div>

//                 <div className="space-y-4">
//                   {sections.map((section, idx) => (
//                     <SectionContainer
//                       key={section.id}
//                       section={section}
//                       sectionIndex={idx + 1}
//                       dispatch={dispatch}
//                     />
//                   ))}
//                 </div>

//                 {/* ── Grand Total ── */}
//                 {sections.length > 0 && (
//                   <div className="mt-6 pt-4 border-t-2 border-indigo-300 flex justify-end items-center">
//                     <span className="text-sm font-bold text-gray-600 uppercase tracking-wider mr-4">
//                       Grand Total
//                     </span>
//                     <span className="text-xl font-extrabold text-indigo-700">
//                       {formatCurrency(totalBOQAmount)}
//                     </span>
//                   </div>
//                 )}
//               </div>

//               <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4 shrink-0">
//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
//                 >
//                   <FaCheck size={12} /> {editBOQ ? "Update BOQ" : "Create BOQ"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ── Import Modal ── */}
//       {isImportModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
//                 <FaFileExcel className="text-emerald-600" /> Import BOQ from Excel
//               </h2>
//               <button
//                 onClick={() => setIsImportModalOpen(false)}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <FaTimes size={20} />
//               </button>
//             </div>

//             <div className="space-y-4">
//               <div>
//                 <Lbl text="Select Project" req />
//                 <Select
//                   options={projects.map((p) => ({ value: p._id, label: p.name }))}
//                   value={selectedProjectImport}
//                   onChange={setSelectedProjectImport}
//                   placeholder="Choose project..."
//                 />
//               </div>

//               <div>
//                 <Lbl text="Upload Excel File" req />
//                 <input
//                   type="file"
//                   accept=".xlsx,.xls"
//                   onChange={(e) => setImportFile(e.target.files[0])}
//                   className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
//                 />
//                 <p className="text-xs text-gray-400 mt-2">
//                   Sheet should have: SR. NO., PARTICULARS, UNIT, RATE, TOTAL QUANTITY, AMOUNT
//                   <br />
//                   <span className="text-emerald-600">
//                     ✓ Auto-detects Phase I/II • Auto-detects sections • Extracts taxes
//                   </span>
//                 </p>
//               </div>

//               <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
//                 <button
//                   onClick={() => setIsImportModalOpen(false)}
//                   className="text-sm font-bold text-gray-400 hover:text-gray-600"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleImport}
//                   disabled={importing}
//                   className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
//                 >
//                   {importing ? (
//                     <>
//                       <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                       Importing...
//                     </>
//                   ) : (
//                     <>
//                       <FaFileExcel size={12} /> Import
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useEffect, useReducer, useCallback, useMemo, memo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaPlus,
  FaCheck,
  FaFileInvoice,
  FaFileExcel,
  FaTimes,
  FaTrash,
  FaEdit,
  FaTrashAlt,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast, ToastContainer } from "react-toastify";

// ─── Utility: generate unique ID ────────────────────────────────────────────
let idCounter = 0;
const generateId = () => ++idCounter;

// ─── Default factories ──────────────────────────────────────────────────────
const createDefaultDescriptionLine = () => ({
  id: generateId(),
  srNo: "",
  description: "",
  qty: 1,
  unit: "nos",
  unitRateSupply: 0,
  unitRateInstallation: 0,
});

const createDefaultItem = () => ({
  id: generateId(),
  itemId: null,
  serialNo: "",
  itemName: "",
  sectionSpecification: "",
  descriptions: [createDefaultDescriptionLine()],
});

const createDefaultSubSection = (sectionIndex, subIndex) => ({
  id: generateId(),
  name: `Sub-Section ${sectionIndex}.${subIndex}`,
  items: [createDefaultItem()],
});

const createDefaultSection = (index) => ({
  id: generateId(),
  name: `Section ${index}`,
  subSections: [createDefaultSubSection(index, 1)],
});

// ─── Formatters & Calculations ──────────────────────────────────────────────
const formatCurrency = (num) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num || 0);
};

const calcLine = (desc) => {
  const qty = parseFloat(desc.qty) || 0;
  const rateSupply = parseFloat(desc.unitRateSupply) || 0;
  const rateInstall = parseFloat(desc.unitRateInstallation) || 0;
  const amountSupply = qty * rateSupply;
  const amountInstallation = qty * rateInstall;
  return { amountSupply, amountInstallation, totalAmount: amountSupply + amountInstallation };
};

const itemTotals = (item) =>
  (item.descriptions || []).reduce(
    (acc, d) => {
      const c = calcLine(d);
      acc.supply += c.amountSupply;
      acc.install += c.amountInstallation;
      acc.total += c.totalAmount;
      return acc;
    },
    { supply: 0, install: 0, total: 0 }
  );

const subSectionTotals = (sub) =>
  (sub.items || []).reduce(
    (acc, it) => {
      const t = itemTotals(it);
      acc.supply += t.supply;
      acc.install += t.install;
      acc.total += t.total;
      return acc;
    },
    { supply: 0, install: 0, total: 0 }
  );

const sectionTotals = (sec) =>
  (sec.subSections || []).reduce(
    (acc, sub) => {
      const t = subSectionTotals(sub);
      acc.supply += t.supply;
      acc.install += t.install;
      acc.total += t.total;
      return acc;
    },
    { supply: 0, install: 0, total: 0 }
  );

function useAutosizeTextarea(value) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

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
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
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

// ─── Reducer ────────────────────────────────────────────────────────────────
const initialState = {
  sections: [createDefaultSection(1)],
};

function boqReducer(state, action) {
  switch (action.type) {
    case "SET_SECTIONS":
      return { ...state, sections: action.payload };

    case "ADD_SECTION": {
      const newIndex = state.sections.length + 1;
      return {
        ...state,
        sections: [...state.sections, createDefaultSection(newIndex)],
      };
    }
    case "REMOVE_SECTION": {
      if (state.sections.length === 1) {
        toast.warning("Cannot remove the last section.");
        return state;
      }
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== action.payload),
      };
    }
    case "UPDATE_SECTION_NAME": {
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload.sectionId ? { ...s, name: action.payload.newName } : s
        ),
      };
    }
    case "ADD_SUB_SECTION": {
      const section = state.sections.find((s) => s.id === action.payload);
      if (!section) return state;
      const secIndex = state.sections.findIndex((s) => s.id === action.payload) + 1;
      const newSubIndex = section.subSections.length + 1;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload
            ? {
              ...s,
              subSections: [
                ...s.subSections,
                createDefaultSubSection(secIndex, newSubIndex),
              ],
            }
            : s
        ),
      };
    }
    case "REMOVE_SUB_SECTION": {
      const { sectionId, subSectionId } = action.payload;
      const section = state.sections.find((s) => s.id === sectionId);
      if (!section || section.subSections.length === 1) {
        toast.warning("Cannot remove the last sub-section. Remove the section instead.");
        return state;
      }
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? { ...s, subSections: s.subSections.filter((sub) => sub.id !== subSectionId) }
            : s
        ),
      };
    }
    case "UPDATE_SUB_SECTION_NAME": {
      const { sectionId, subSectionId, newName } = action.payload;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId ? { ...sub, name: newName } : sub
              ),
            }
            : s
        ),
      };
    }
    case "ADD_ITEM": {
      const { sectionId, subSectionId } = action.payload;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId
                  ? { ...sub, items: [...sub.items, createDefaultItem()] }
                  : sub
              ),
            }
            : s
        ),
      };
    }
    case "REMOVE_ITEM": {
      const { sectionId, subSectionId, itemId } = action.payload;
      const section = state.sections.find((s) => s.id === sectionId);
      if (!section) return state;
      const subSection = section.subSections.find((sub) => sub.id === subSectionId);
      if (!subSection || subSection.items.length === 1) {
        toast.warning("Cannot remove the last item. Delete the sub-section instead.");
        return state;
      }
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId
                  ? { ...sub, items: sub.items.filter((it) => it.id !== itemId) }
                  : sub
              ),
            }
            : s
        ),
      };
    }
    case "UPDATE_ITEM_NAME": {
      const { sectionId, subSectionId, itemId, name, masterItem } = action.payload;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId
                  ? {
                    ...sub,
                    items: sub.items.map((it) => {
                      if (it.id !== itemId) return it;
                      if (masterItem) {
                        return {
                          ...it,
                          itemName: name,
                          itemId: masterItem._id,
                          serialNo: masterItem.itemCode || it.serialNo,
                        };
                      }
                      return { ...it, itemName: name, itemId: null };
                    }),
                  }
                  : sub
              ),
            }
            : s
        ),
      };
    }
    case "UPDATE_ITEM_SERIAL_NO": {
      const { sectionId, subSectionId, itemId, serialNo } = action.payload;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId
                  ? {
                    ...sub,
                    items: sub.items.map((it) =>
                      it.id === itemId ? { ...it, serialNo } : it
                    ),
                  }
                  : sub
              ),
            }
            : s
        ),
      };
    }
    case "UPDATE_ITEM_SPECIFICATION": {
      const { sectionId, subSectionId, itemId, specification } = action.payload;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId
                  ? {
                    ...sub,
                    items: sub.items.map((it) =>
                      it.id === itemId ? { ...it, sectionSpecification: specification } : it
                    ),
                  }
                  : sub
              ),
            }
            : s
        ),
      };
    }
    case "ADD_DESCRIPTION": {
      const { sectionId, subSectionId, itemId } = action.payload;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId
                  ? {
                    ...sub,
                    items: sub.items.map((it) =>
                      it.id === itemId
                        ? {
                          ...it,
                          descriptions: [
                            ...it.descriptions,
                            createDefaultDescriptionLine(),
                          ],
                        }
                        : it
                    ),
                  }
                  : sub
              ),
            }
            : s
        ),
      };
    }
    case "REMOVE_DESCRIPTION": {
      const { sectionId, subSectionId, itemId, descId } = action.payload;
      let blocked = false;
      const newSections = state.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          subSections: s.subSections.map((sub) => {
            if (sub.id !== subSectionId) return sub;
            return {
              ...sub,
              items: sub.items.map((it) => {
                if (it.id !== itemId) return it;
                if (it.descriptions.length === 1) {
                  blocked = true;
                  return it;
                }
                return {
                  ...it,
                  descriptions: it.descriptions.filter((d) => d.id !== descId),
                };
              }),
            };
          }),
        };
      });
      if (blocked) {
        toast.warning("Cannot remove the last line. Delete the item instead.");
        return state;
      }
      return { ...state, sections: newSections };
    }
    case "UPDATE_DESCRIPTION_FIELD": {
      const { sectionId, subSectionId, itemId, descId, field, value } = action.payload;
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              subSections: s.subSections.map((sub) =>
                sub.id === subSectionId
                  ? {
                    ...sub,
                    items: sub.items.map((it) =>
                      it.id === itemId
                        ? {
                          ...it,
                          descriptions: it.descriptions.map((d) =>
                            d.id === descId ? { ...d, [field]: value } : d
                          ),
                        }
                        : it
                    ),
                  }
                  : sub
              ),
            }
            : s
        ),
      };
    }
    default:
      return state;
  }
}

// ─── Sub-Components ─────────────────────────────────────────────────────────
const ItemHeaderRow = memo(function ItemHeaderRow({
  item,
  sectionId,
  subSectionId,
  isLastItemInSubSection,
  onUpdateItemName,
  onUpdateItemSerialNo,
  onUpdateItemSpecification,
  onAddDescription,
  onRemoveItem,
}) {
  const [showSpec, setShowSpec] = useState(!!item.sectionSpecification);

  return (
    <>
      <tr className="bg-indigo-50/70 border-t border-indigo-100">
        <td className="px-2 py-1.5 text-center">
          <input
            type="text"
            className="w-16 px-1 py-1 border border-indigo-200 rounded text-[10px] font-black text-center text-indigo-900 bg-white focus:border-indigo-400 outline-none"
            value={item.serialNo}
            onChange={(e) => onUpdateItemSerialNo(sectionId, subSectionId, item.id, e.target.value)}
            placeholder="Item Sr"
          />
        </td>
        <td colSpan={9} className="px-2 py-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
              Parent Item
            </span>
            <input
              type="text"
              list="item-master-names"
              className="flex-1 min-w-[200px] max-w-md px-2 py-1 border border-indigo-200 rounded text-xs font-bold text-gray-800 bg-white focus:border-indigo-400 outline-none"
              value={item.itemName}
              onChange={(e) => onUpdateItemName(sectionId, subSectionId, item.id, e.target.value)}
              placeholder="Type Item Name to match Item Master..."
            />
            {item.itemId && (
              <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                Master Linked
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSpec((prev) => !prev)}
              className="text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
            >
              {showSpec ? "Hide Spec" : "Add/Edit Spec"}
            </button>
            <button
              type="button"
              onClick={() => onAddDescription(sectionId, subSectionId, item.id)}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 ml-auto"
            >
              <FaPlus size={8} /> Add Line
            </button>
            <button
              type="button"
              onClick={() => onRemoveItem(sectionId, subSectionId, item.id)}
              className="text-[10px] text-gray-400 hover:text-red-500 font-bold flex items-center gap-1 disabled:opacity-30"
              disabled={isLastItemInSubSection}
            >
              <FaTrash size={8} /> Delete Item
            </button>
          </div>
        </td>
      </tr>

      {showSpec && (
        <tr className="bg-amber-50/50 border-t border-amber-200/40">
          <td className="px-2 py-1.5 text-center text-[10px] font-bold text-amber-600">
            SPEC
          </td>
          <td colSpan={9} className="px-2 py-1.5">
            <textarea
              rows={2}
              className="w-full p-2 border border-amber-200 rounded text-xs text-amber-950 bg-white focus:border-amber-400 outline-none leading-relaxed"
              value={item.sectionSpecification || ""}
              onChange={(e) =>
                onUpdateItemSpecification(sectionId, subSectionId, item.id, e.target.value)
              }
              placeholder="Enter technical scope or general specifications for all items under this parent (optional)..."
            />
          </td>
        </tr>
      )}
    </>
  );
});

const DescriptionRow = memo(function DescriptionRow({
  desc,
  sectionId,
  subSectionId,
  itemId,
  isLastDescLine,
  onUpdateDescription,
  onRemoveDescription,
}) {
  const { amountSupply, amountInstallation, totalAmount } = calcLine(desc);
  const isZeroQty = !desc.qty || Number(desc.qty) === 0;

  return (
    <tr className={`hover:bg-gray-50/80 transition-colors ${isZeroQty ? "bg-slate-50/50" : ""}`}>
      <td className="px-2 py-1 text-center">
        <input
          type="text"
          className="w-16 px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none text-center font-mono text-gray-500"
          value={desc.srNo}
          onChange={(e) =>
            onUpdateDescription(sectionId, subSectionId, itemId, desc.id, "srNo", e.target.value)
          }
          placeholder="Line Sr"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="text"
          className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-gray-800"
          value={desc.description}
          onChange={(e) =>
            onUpdateDescription(
              sectionId,
              subSectionId,
              itemId,
              desc.id,
              "description",
              e.target.value
            )
          }
          placeholder="Item Line Description"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          step="any"
          className="w-14 px-1 py-0.5 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center font-medium"
          value={desc.qty}
          onChange={(e) =>
            onUpdateDescription(
              sectionId,
              subSectionId,
              itemId,
              desc.id,
              "qty",
              parseFloat(e.target.value) || 0
            )
          }
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="text"
          className="w-12 px-1 py-0.5 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
          value={desc.unit}
          onChange={(e) =>
            onUpdateDescription(sectionId, subSectionId, itemId, desc.id, "unit", e.target.value)
          }
          placeholder="nos"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          step="any"
          className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
          value={desc.unitRateSupply}
          onChange={(e) =>
            onUpdateDescription(
              sectionId,
              subSectionId,
              itemId,
              desc.id,
              "unitRateSupply",
              parseFloat(e.target.value) || 0
            )
          }
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          step="any"
          className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs bg-white focus:border-indigo-300 outline-none text-center"
          value={desc.unitRateInstallation}
          onChange={(e) =>
            onUpdateDescription(
              sectionId,
              subSectionId,
              itemId,
              desc.id,
              "unitRateInstallation",
              parseFloat(e.target.value) || 0
            )
          }
        />
      </td>
      <td className="px-2 py-1 text-right text-xs font-semibold text-gray-600">
        {amountSupply === 0 ? "—" : formatCurrency(amountSupply)}
      </td>
      <td className="px-2 py-1 text-right text-xs font-semibold text-gray-600">
        {amountInstallation === 0 ? "—" : formatCurrency(amountInstallation)}
      </td>
      <td className="px-2 py-1 text-right font-bold text-gray-800 text-xs">
        {totalAmount === 0 ? "—" : formatCurrency(totalAmount)}
      </td>
      <td className="px-2 py-1 text-center">
        <button
          type="button"
          onClick={() => onRemoveDescription(sectionId, subSectionId, itemId, desc.id)}
          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
          disabled={isLastDescLine}
        >
          <FaTimes size={12} />
        </button>
      </td>
    </tr>
  );
});

const ItemBlock = memo(function ItemBlock({
  item,
  sectionId,
  subSectionId,
  isLastItemInSubSection,
  onUpdateDescription,
  onRemoveDescription,
  onUpdateItemName,
  onUpdateItemSerialNo,
  onUpdateItemSpecification,
  onAddDescription,
  onRemoveItem,
}) {
  return [
    <ItemHeaderRow
      key={`${item.id}-header`}
      item={item}
      sectionId={sectionId}
      subSectionId={subSectionId}
      isLastItemInSubSection={isLastItemInSubSection}
      onUpdateItemName={onUpdateItemName}
      onUpdateItemSerialNo={onUpdateItemSerialNo}
      onUpdateItemSpecification={onUpdateItemSpecification}
      onAddDescription={onAddDescription}
      onRemoveItem={onRemoveItem}
    />,
    ...(item.descriptions || []).map((desc) => (
      <DescriptionRow
        key={desc.id}
        desc={desc}
        sectionId={sectionId}
        subSectionId={subSectionId}
        itemId={item.id}
        isLastDescLine={item.descriptions.length === 1}
        onUpdateDescription={onUpdateDescription}
        onRemoveDescription={onRemoveDescription}
      />
    )),
  ];
});

const SubSectionTable = memo(function SubSectionTable({
  sectionId,
  subSection,
  subSectionNumber,
  onAddItem,
  onRemoveItem,
  onUpdateName,
  onRemoveSubSection,
  onUpdateItemName,
  onUpdateItemSerialNo,
  onUpdateItemSpecification,
  onAddDescription,
  onRemoveDescription,
  onUpdateDescription,
}) {
  const nameRef = useAutosizeTextarea(subSection.name);
  const totals = useMemo(() => subSectionTotals(subSection), [subSection]);
  const lineCount = useMemo(
    () => (subSection.items || []).reduce((c, it) => c + (it.descriptions?.length || 0), 0),
    [subSection.items]
  );

  return (
    <div className="ml-4 mt-2 border-l-2 border-indigo-200 pl-4">
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="font-bold text-indigo-500 text-xs bg-indigo-100 px-2 py-0.5 rounded shrink-0 mt-0.5">
            {subSectionNumber}
          </span>
          <textarea
            ref={nameRef}
            rows={1}
            className="font-semibold text-gray-700 text-xs border border-transparent bg-transparent focus:border-indigo-300 focus:bg-white px-2 py-0.5 rounded outline-none resize-none overflow-hidden flex-1 min-w-[180px] leading-snug"
            value={subSection.name}
            onChange={(e) => onUpdateName(sectionId, subSection.id, e.target.value)}
            placeholder="Sub-Section Name"
          />
          <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">
            {subSection.items.length} items · {lineCount} lines
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onAddItem(sectionId, subSection.id)}
            className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-bold"
          >
            <FaPlus size={10} /> Add Item
          </button>
          <button
            type="button"
            onClick={() => onRemoveSubSection(sectionId, subSection.id)}
            className="text-gray-400 hover:text-red-500 text-xs ml-1"
          >
            <FaTrash size={10} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-lg">
          <thead className="bg-gray-50 text-[9px] font-black uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-2 py-1 text-center w-[60px]">Sr. No.</th>
              <th className="px-2 py-1 text-left min-w-[140px]">Description</th>
              <th className="px-2 py-1 text-center w-[50px]">Qty</th>
              <th className="px-2 py-1 text-center w-[50px]">Unit</th>
              <th className="px-2 py-1 text-center w-[60px]">Rate (Supply)</th>
              <th className="px-2 py-1 text-center w-[60px]">Rate (Install)</th>
              <th className="px-2 py-1 text-right w-[75px]">Amt (Supply)</th>
              <th className="px-2 py-1 text-right w-[75px]">Amt (Install)</th>
              <th className="px-2 py-1 text-right w-[80px]">Total (₹)</th>
              <th className="px-2 py-1 text-center w-[25px]">#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subSection.items.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-2 py-2 text-center text-gray-400 text-[10px]">
                  No items. Click &quot;Add Item&quot;.
                </td>
              </tr>
            ) : (
              subSection.items.map((item) => (
                <ItemBlock
                  key={item.id}
                  item={item}
                  sectionId={sectionId}
                  subSectionId={subSection.id}
                  isLastItemInSubSection={subSection.items.length === 1}
                  onUpdateDescription={onUpdateDescription}
                  onRemoveDescription={onRemoveDescription}
                  onUpdateItemName={onUpdateItemName}
                  onUpdateItemSerialNo={onUpdateItemSerialNo}
                  onUpdateItemSpecification={onUpdateItemSpecification}
                  onAddDescription={onAddDescription}
                  onRemoveItem={onRemoveItem}
                />
              ))
            )}
          </tbody>
          {subSection.items.length > 0 && (
            <tfoot className="bg-gray-50/80 border-t border-gray-200">
              <tr>
                <td colSpan="6" className="px-2 py-1 text-right text-[9px] font-bold text-gray-600">
                  Sub-Total
                </td>
                <td className="px-2 py-1 text-right text-[10px] font-bold text-gray-600">
                  {formatCurrency(totals.supply)}
                </td>
                <td className="px-2 py-1 text-right text-[10px] font-bold text-gray-600">
                  {formatCurrency(totals.install)}
                </td>
                <td className="px-2 py-1 text-right text-[11px] font-extrabold text-indigo-600">
                  {formatCurrency(totals.total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
});

const SectionContainer = memo(function SectionContainer({
  section,
  sectionIndex,
  dispatch,
  itemMaster,
}) {
  const onUpdateSectionName = useCallback(
    (id, name) =>
      dispatch({ type: "UPDATE_SECTION_NAME", payload: { sectionId: id, newName: name } }),
    [dispatch]
  );
  const onRemoveSection = useCallback(
    (id) => dispatch({ type: "REMOVE_SECTION", payload: id }),
    [dispatch]
  );
  const onAddSubSection = useCallback(
    (id) => dispatch({ type: "ADD_SUB_SECTION", payload: id }),
    [dispatch]
  );
  const onRemoveSubSection = useCallback(
    (sectionId, subSectionId) =>
      dispatch({ type: "REMOVE_SUB_SECTION", payload: { sectionId, subSectionId } }),
    [dispatch]
  );
  const onUpdateSubSectionName = useCallback(
    (sectionId, subSectionId, newName) =>
      dispatch({ type: "UPDATE_SUB_SECTION_NAME", payload: { sectionId, subSectionId, newName } }),
    [dispatch]
  );
  const onAddItem = useCallback(
    (sectionId, subSectionId) =>
      dispatch({ type: "ADD_ITEM", payload: { sectionId, subSectionId } }),
    [dispatch]
  );
  const onRemoveItem = useCallback(
    (sectionId, subSectionId, itemId) =>
      dispatch({ type: "REMOVE_ITEM", payload: { sectionId, subSectionId, itemId } }),
    [dispatch]
  );

  const onUpdateItemName = useCallback(
    (sectionId, subSectionId, itemId, name) => {
      const normalized = (name || "").trim().toLowerCase();
      const matched = itemMaster.find(
        (m) => (m.itemName || "").trim().toLowerCase() === normalized
      );

      dispatch({
        type: "UPDATE_ITEM_NAME",
        payload: {
          sectionId,
          subSectionId,
          itemId,
          name,
          masterItem: matched || null,
        },
      });
    },
    [dispatch, itemMaster]
  );

  const onUpdateItemSerialNo = useCallback(
    (sectionId, subSectionId, itemId, serialNo) => {
      dispatch({
        type: "UPDATE_ITEM_SERIAL_NO",
        payload: { sectionId, subSectionId, itemId, serialNo },
      });
    },
    [dispatch]
  );
  const onUpdateItemSpecification = useCallback(
    (sectionId, subSectionId, itemId, specification) => {
      dispatch({
        type: "UPDATE_ITEM_SPECIFICATION",
        payload: { sectionId, subSectionId, itemId, specification },
      });
    },
    [dispatch]
  );
  const onAddDescription = useCallback(
    (sectionId, subSectionId, itemId) =>
      dispatch({ type: "ADD_DESCRIPTION", payload: { sectionId, subSectionId, itemId } }),
    [dispatch]
  );
  const onRemoveDescription = useCallback(
    (sectionId, subSectionId, itemId, descId) =>
      dispatch({
        type: "REMOVE_DESCRIPTION",
        payload: { sectionId, subSectionId, itemId, descId },
      }),
    [dispatch]
  );
  const onUpdateDescription = useCallback(
    (sectionId, subSectionId, itemId, descId, field, value) =>
      dispatch({
        type: "UPDATE_DESCRIPTION_FIELD",
        payload: { sectionId, subSectionId, itemId, descId, field, value },
      }),
    [dispatch]
  );

  const nameRef = useAutosizeTextarea(section.name);
  const totals = useMemo(() => sectionTotals(section), [section]);
  const totalLines = useMemo(
    () =>
      (section.subSections || []).reduce(
        (count, sub) =>
          count + (sub.items || []).reduce((c, it) => c + (it.descriptions?.length || 0), 0),
        0
      ),
    [section.subSections]
  );

  return (
    <div className="border border-gray-300 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="font-bold text-indigo-700 text-sm bg-indigo-100 px-2 py-0.5 rounded shrink-0 mt-1">
            {sectionIndex}
          </span>
          <textarea
            ref={nameRef}
            rows={1}
            className="font-bold text-gray-800 text-sm border border-transparent bg-transparent focus:border-indigo-300 focus:bg-white px-2 py-1 rounded outline-none resize-none overflow-hidden flex-1 min-w-[150px] leading-snug"
            value={section.name}
            onChange={(e) => onUpdateSectionName(section.id, e.target.value)}
            placeholder="Section Name"
          />
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full shrink-0 mt-1">
            {section.subSections.length} sub-sections
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onAddSubSection(section.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <FaPlus size={10} /> Add Sub-Section
          </button>
          <button
            type="button"
            onClick={() => onRemoveSection(section.id)}
            className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 cursor-pointer"
          >
            <FaTrash size={12} /> Remove Section
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {section.subSections.map((sub, subIdx) => {
          const subNumber = `${sectionIndex}.${subIdx + 1}`;
          return (
            <SubSectionTable
              key={sub.id}
              sectionId={section.id}
              subSection={sub}
              subSectionNumber={subNumber}
              onAddItem={onAddItem}
              onRemoveItem={onRemoveItem}
              onUpdateName={onUpdateSubSectionName}
              onRemoveSubSection={onRemoveSubSection}
              onUpdateItemName={onUpdateItemName}
              onUpdateItemSerialNo={onUpdateItemSerialNo}
              onUpdateItemSpecification={onUpdateItemSpecification}
              onAddDescription={onAddDescription}
              onRemoveDescription={onRemoveDescription}
              onUpdateDescription={onUpdateDescription}
            />
          );
        })}
      </div>

      {totalLines > 0 && (
        <div className="flex justify-end items-center mt-3 pt-2 border-t-2 border-indigo-200 gap-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Section Total ({totalLines} lines)
          </span>
          <span className="text-[11px] text-gray-500">
            Supply {formatCurrency(totals.supply)} · Install {formatCurrency(totals.install)}
          </span>
          <span className="text-sm font-extrabold text-indigo-700">
            {formatCurrency(totals.total)}
          </span>
        </div>
      )}
    </div>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────
export default function ConstructionBOQPage() {
  const [boqs, setBoqs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [itemMaster, setItemMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editBOQ, setEditBOQ] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProjectImport, setSelectedProjectImport] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [boqNumber, setBoqNumber] = useState("");
  const [boqDate, setBoqDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [state, dispatch] = useReducer(boqReducer, initialState);
  const [openMenuId, setOpenMenuId] = useState(null);
  const { sections } = state;
  const [remarks, setRemarks] = useState("");
  const router = useRouter();

  const [analysisData, setAnalysisData] = useState(null);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("Initializing AI analysis...");

  const [finalLoadProgress, setFinalLoadProgress] = useState(0);
  const [finalLoadMessage, setFinalLoadMessage] = useState("Preparing to load...");

  const toggleRowExpand = (id) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchBOQData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const [boqRes, projRes, supRes, custRes, itemRes] = await Promise.allSettled([
        api.get("/construction/boq", headers),
        api.get("/construction/projects", headers),
        api.get("/suppliers", headers),
        api.get("/customers", headers),
        api.get("/items", headers),
      ]);

      if (boqRes.status === "fulfilled") {
        setBoqs(boqRes.value.data?.data || boqRes.value.data || []);
      } else {
        setBoqs([]);
      }

      if (projRes.status === "fulfilled") {
        setProjects(projRes.value.data?.data || projRes.value.data || []);
      }
      if (supRes.status === "fulfilled") {
        setSuppliers(supRes.value.data?.data || supRes.value.data || []);
      }
      if (custRes.status === "fulfilled") {
        setCustomers(custRes.value.data?.data || custRes.value.data || []);
      }
      if (itemRes.status === "fulfilled") {
        setItemMaster(itemRes.value.data?.data || itemRes.value.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBOQData();
  }, [fetchBOQData]);

  const totalBOQAmount = useMemo(() => {
    return sections.reduce((sum, sec) => sum + sectionTotals(sec).total, 0);
  }, [sections]);

  const openModal = (boqDoc = null) => {
    setEditBOQ(boqDoc);
    if (boqDoc) {
      setSelectedProject(
        boqDoc.project ? { value: boqDoc.project._id, label: boqDoc.project.name } : null
      );
      setSelectedContractor(
        boqDoc.contractor
          ? {
            value: boqDoc.contractor._id,
            label:
              boqDoc.contractor.supplierName ||
              boqDoc.contractor.name ||
              boqDoc.contractor.contactPersonName,
          }
          : null
      );
      setSelectedCustomer(
        boqDoc.customer
          ? {
            value: boqDoc.customer._id,
            label:
              boqDoc.customer.customerName ||
              boqDoc.customer.name ||
              boqDoc.customer.contactPersonName,
          }
          : null
      );
      setBoqNumber(boqDoc.boqNumber || "");
      setBoqDate(boqDoc.date ? boqDoc.date.split("T")[0] : "");
      setStatus(boqDoc.status || "draft");
      setRemarks(boqDoc.remarks || "");

      const sectionsMap = new Map();
      (boqDoc.items || []).forEach((parentItem) => {
        const sectionName = parentItem.section || "Other Work";
        const subSectionName = parentItem.subSection || "Main";

        if (!sectionsMap.has(sectionName)) sectionsMap.set(sectionName, new Map());
        const subMap = sectionsMap.get(sectionName);

        if (!subMap.has(subSectionName)) subMap.set(subSectionName, []);
        const itemsList = subMap.get(subSectionName);

        const descriptionLines = (parentItem.descriptions || []).map((desc) => ({
          id: desc._id || generateId(),
          srNo: desc.srNo || "",
          description: desc.description || "",
          qty: desc.isRateOnly ? 0 : desc.quantity ?? 0,
          unit: desc.unit || "nos",
          unitRateSupply: desc.unitRateSupply || 0,
          unitRateInstallation: desc.unitRateInstallation || 0,
        }));

        itemsList.push({
          id: parentItem._id || generateId(),
          itemId: parentItem.itemId || null,
          serialNo: parentItem.itemSerialNo || "",
          itemName: parentItem.itemName || "",
          sectionSpecification: parentItem.sectionSpecification || "",
          descriptions: descriptionLines.length
            ? descriptionLines
            : [createDefaultDescriptionLine()],
        });
      });

      const sectionsFromBOQ = Array.from(sectionsMap.entries()).map(([secName, subMap]) => ({
        id: generateId(),
        name: secName,
        subSections: Array.from(subMap.entries()).map(([subName, itemsList]) => ({
          id: generateId(),
          name: subName,
          items: itemsList,
        })),
      }));

      dispatch({
        type: "SET_SECTIONS",
        payload: sectionsFromBOQ.length ? sectionsFromBOQ : [createDefaultSection(1)],
      });
    } else {
      setSelectedProject(null);
      setSelectedContractor(null);
      setSelectedCustomer(null);
      setBoqNumber(`BOQ-${Date.now().toString().slice(-6)}`);
      setBoqDate(new Date().toISOString().split("T")[0]);
      setStatus("draft");
      setRemarks("");
      dispatch({ type: "SET_SECTIONS", payload: [createDefaultSection(1)] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditBOQ(null);
  };

  const handleDelete = async (boqId) => {
    if (!confirm("Are you sure you want to delete this BOQ?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/boq/${boqId}`, headers);
      toast.success("BOQ deleted successfully.");
      fetchBOQData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete BOQ.");
    }
    setOpenMenuId(null);
  };

  const handleEdit = (boqDoc) => {
    openModal(boqDoc);
    setOpenMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // if (!selectedProject) {
    //   toast.error("Please select a project.");
    //   return;
    // }

    const structuredItems = [];
    sections.forEach((sec) => {
      sec.subSections.forEach((sub, subIdx) => {
        sub.items.forEach((item) => {
          const validDescriptions = (item.descriptions || [])
            .filter((d) => d.description && d.description.trim() !== "")
            .map((d) => ({
              srNo: (d.srNo || "").trim(),
              description: d.description.trim(),
              unit: (d.unit || "nos").trim(),
              quantity: parseFloat(d.qty) || 0,
              unitRateSupply: parseFloat(d.unitRateSupply) || 0,
              unitRateInstallation: parseFloat(d.unitRateInstallation) || 0,
              isRateOnly: false,
            }));

          if (validDescriptions.length > 0) {
            structuredItems.push({
              itemId: item.itemId || null,
              itemSerialNo: (item.serialNo || "").trim(),
              itemName: (item.itemName || "Item").trim(),
              section: sec.name.trim(),
              sectionSpecification: (item.sectionSpecification || "").trim(),
              subSection: sub.name.trim(),
              subSectionIndex: subIdx + 1,
              descriptions: validDescriptions,
            });
          }
        });
      });
    });

    if (structuredItems.length === 0) {
      toast.error("Please add at least one item with a valid description.");
      return;
    }

    const payload = {
      project: selectedProject?.value || null,
      contractor: selectedContractor?.value || null,
      customer: selectedCustomer?.value || null,
      boqNumber,
      date: boqDate,
      status,
      remarks,
      items: structuredItems,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editBOQ) {
        await api.put(`/construction/boq/${editBOQ._id}`, payload, headers);
        toast.success("BOQ updated successfully!");
      } else {
        await api.post("/construction/boq", payload, headers);
        toast.success("BOQ created successfully!");
      }
      closeModal();
      fetchBOQData();
    } catch (err) {
      console.error("❌ BOQ save failed:", err);
      toast.error(err.response?.data?.message || "Failed to save BOQ.");
    }
  };

  // Step 1: Send file for Analysis
  const handleImport = async () => {
    if (!importFile)
    // !selectedProjectImport || ) 
    {
      toast.error("Please select a project and choose an Excel file.");
      return;
    }

    setImporting(true);
    setAnalysisProgress(10);
    setProgressMessage("Parsing Excel rows & checking Item Master...");

    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 90) return prev;
        const next = prev + Math.floor(Math.random() * 8) + 3;
        if (next > 35 && next < 70) setProgressMessage("Running AI typo correction & fuzzy matching...");
        if (next >= 70) setProgressMessage("Preparing review preview...");
        return next > 90 ? 90 : next;
      });
    }, 450);

    const formData = new FormData();
    // formData.append("projectId", selectedProjectImport.value);
    formData.append("file", importFile);

    try {
      const token = localStorage.getItem("token");
      const res = await api.post("/construction/boq/import", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setProgressMessage("Analysis complete!");

      if (res.data.success) {
        setTimeout(() => {
          setAnalysisData(res.data.data);
          setImporting(false);
          setAnalysisProgress(0);
          toast.info("Excel analyzed. Review item matches below before loading.");
        }, 300);
      } else {
        throw new Error(res.data.message || "Failed to analyze Excel.");
      }
    } catch (err) {
      clearInterval(progressInterval);
      setImporting(false);
      setAnalysisProgress(0);
      toast.error(err.response?.data?.message || err.message || "Import analysis failed.");
    }
  };

  // Step 2: Commit verified items to DB
  const handleFinalLoad = async () => {
    if (!analysisData || !analysisData.items?.length) return;
    setLoadingFinal(true);
    setFinalLoadProgress(8);
    setFinalLoadMessage("Validating items & linking Item Master...");

    const progressInterval = setInterval(() => {
      setFinalLoadProgress((prev) => {
        if (prev >= 90) return prev;
        const next = prev + Math.floor(Math.random() * 7) + 3;
        if (next > 30 && next < 60) setFinalLoadMessage("Creating raw materials & products...");
        if (next >= 60 && next < 85) setFinalLoadMessage("Building BOQ structure...");
        if (next >= 85) setFinalLoadMessage("Finalizing & saving...");
        return next > 90 ? 90 : next;
      });
    }, 400);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        projectId: selectedProjectImport?.value || null,
        mappedParents: analysisData.items,
      };

      const res = await api.post("/construction/boq/import", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      clearInterval(progressInterval);
      setFinalLoadProgress(100);
      setFinalLoadMessage("BOQ loaded successfully!");

      if (res.data.success) {
        setTimeout(() => {
          setIsImportModalOpen(false);
          setAnalysisData(null);
          setImportFile(null);
          setSelectedProjectImport(null);
          setLoadingFinal(false);
          setFinalLoadProgress(0);
          fetchBOQData();
          setTimeout(() => {
            toast.success(res.data.message || "BOQ data loaded successfully!");
          }, 100)
        }, 400);
      } else {
        toast.error(res.data.message || "Failed to load data.");
        setLoadingFinal(false);
        setFinalLoadProgress(0);
      }
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(err.response?.data?.message || "Failed to load BOQ.");
      setLoadingFinal(false);
      setFinalLoadProgress(0);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.supplierName || s.name || s.contactPersonName || s._id,
  }));

  const customerOptions = customers.map((c) => ({
    value: c._id,
    label: c.customerName || c.name || c.contactPersonName || c._id,
  }));

  // ─── Initial Page Loader ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex flex-col items-center justify-center p-6">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FaFileInvoice className="text-indigo-600 animate-pulse text-lg" />
          </div>
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-700">
          Loading BOQs...
        </p>
        <span className="text-[11px] text-slate-400 mt-1">
          Fetching projects, contractor details, and Item Master records
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer
        position="top-right"
        style={{
          top: "env(safe-area-inset-top, 0px)",
        }}
      />
      <datalist id="item-master-names">
        {itemMaster.map((im) => (
          <option key={im._id} value={im.itemName}>
            {im.itemCode ? `(${im.itemCode})` : ""}
          </option>
        ))}
      </datalist>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> Construction BOQ
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Project estimates with nested sections, sub-sections & description lines
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all cursor-pointer"
            >
              <FaFileExcel size={12} /> Import Excel
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
            >
              <FaPlus size={12} /> New BOQ
            </button>
          </div>
        </div>

        {/* BOQ Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Sr. No.</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">BOQ #</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Contractor</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Phase</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Total Amount</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {boqs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">
                      No BOQs found. Import from Excel or create manually.
                    </td>
                  </tr>
                ) : (
                  boqs.map((b, index) => (
                    <tr key={b._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 text-gray-500 text-sm">{index + 1}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/admin/construction/boq/${b._id}`)}
                          className="font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {b.boqNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">{b.project?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-600">{b.contractor?.supplierName || b.contractor?.name || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{b.customer?.customerName || b.customer?.name || "—"}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-500">{b.phase || "I"}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {b.date ? new Date(b.date).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(b.totalAmount || b.grandTotal || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === b._id ? null : b._id)}
                          className="p-2 text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <HiDotsVertical size={18} />
                        </button>
                        {openMenuId === b._id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                            <button
                              onClick={() => handleEdit(b)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <FaEdit size={14} className="text-indigo-500" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(b._id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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

      {/* ── BOQ Edit/Create Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaFileInvoice size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editBOQ ? "Edit BOQ" : "Create Bill of Quantities"}
              </h2>
              <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
                <span className="font-bold text-gray-400">Total:</span>
                <span className="font-black text-indigo-600">{formatCurrency(totalBOQAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* <div className="md:col-span-2">
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map((p) => ({ value: p._id, label: p.name }))}
                    value={selectedProject}
                    onChange={(s) => setSelectedProject(s)}
                    placeholder="Select Project..."
                    className="text-sm"
                    required
                  />
                </div> */}
                <div>
                  <Lbl text="BOQ Number" req />
                  <input
                    type="text"
                    className={fi}
                    value={boqNumber}
                    onChange={(e) => setBoqNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Lbl text="Date" req />
                  <input
                    type="date"
                    className={fi}
                    value={boqDate}
                    onChange={(e) => setBoqDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="Contractor" />
                  <Select
                    options={supplierOptions}
                    value={selectedContractor}
                    onChange={(s) => setSelectedContractor(s)}
                    placeholder="Select Contractor (optional)..."
                    className="text-sm"
                    isClearable
                  />
                </div>
                <div>
                  <Lbl text="Customer" />
                  <Select
                    options={customerOptions}
                    value={selectedCustomer}
                    onChange={(s) => setSelectedCustomer(s)}
                    placeholder="Select Customer (optional)..."
                    className="text-sm"
                    isClearable
                  />
                </div>
                <div>
                  <Lbl text="Status" />
                  <select
                    className={fi}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <Lbl text="Remarks" />
                <input
                  type="text"
                  className={fi}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="General notes..."
                />
              </div>

              {/* Sections */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                    Sections & Sub-Sections
                  </p>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "ADD_SECTION" })}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <FaPlus size={10} /> Add Section
                  </button>
                </div>

                <div className="space-y-4">
                  {sections.map((section, idx) => (
                    <SectionContainer
                      key={section.id}
                      section={section}
                      sectionIndex={idx + 1}
                      dispatch={dispatch}
                      itemMaster={itemMaster}
                    />
                  ))}
                </div>

                {sections.length > 0 && (
                  <div className="mt-6 pt-4 border-t-2 border-indigo-300 flex justify-end items-center">
                    <span className="text-sm font-bold text-gray-600 uppercase tracking-wider mr-4">
                      Grand Total
                    </span>
                    <span className="text-xl font-extrabold text-indigo-700">
                      {formatCurrency(totalBOQAmount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
                >
                  <FaCheck size={12} /> {editBOQ ? "Update BOQ" : "Create BOQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl p-6 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                  <FaFileExcel className="text-emerald-600" />
                  {analysisData ? "Review Items & AI Suggestions" : "Import BOQ from Excel"}
                </h2>
                {analysisData && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review AI-cleaned item names and descriptions before committing them to your BOQ.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setAnalysisData(null);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {!analysisData ? (
                <div className="space-y-4 max-w-md mx-auto py-8">
                  {/* <div>
                    <Lbl text="Select Project" req />
                    <Select
                      options={projects.map((p) => ({ value: p._id, label: p.name }))}
                      value={selectedProjectImport}
                      onChange={setSelectedProjectImport}
                      placeholder="Choose project..."
                    />
                  </div> */}
                  <div>
                    <Lbl text="Upload Excel File" req />
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Metric Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Existing in Master: {analysisData.itemsInMaster}
                      </span>
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        New Line Item: {analysisData.itemsNew}
                      </span>
                      {analysisData.itemsSuggested > 0 && (
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-bold border border-purple-200 flex items-center gap-1.5">
                          ✨ AI Cleaned: {analysisData.itemsSuggested}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAnalysisData((prev) => ({
                            ...prev,
                            items: prev.items.map((it) => ({
                              ...it,
                              itemName: it.suggestedItemName,
                              useAiSuggestion: true,
                              descriptions: (it.descriptions || []).map((d) => ({
                                ...d,
                                description: d.suggestedDescription || d.description,
                                useAiSuggestion: true,
                              })),
                            })),
                          }));
                        }}
                        className="text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-200 transition-colors cursor-pointer"
                      >
                        ✨ Accept All AI Names
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnalysisData((prev) => ({
                            ...prev,
                            items: prev.items.map((it) => ({
                              ...it,
                              itemName: it.originalItemName,
                              useAiSuggestion: false,
                              descriptions: (it.descriptions || []).map((d) => ({
                                ...d,
                                description: d.originalDescription || d.description,
                                useAiSuggestion: false,
                              })),
                            })),
                          }));
                        }}
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Revert to Original
                      </button>
                    </div>
                  </div>

                  {/* Review Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 uppercase text-gray-500 font-bold border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 w-12 text-center">Sr.</th>
                          <th className="px-3 py-2 w-1/4">Excel Raw Name</th>
                          <th className="px-3 py-2 w-1/3 bg-violet-50/50 text-violet-800">
                            ✨ Final Item Name (AI Suggested)
                          </th>
                          <th className="px-3 py-2">Master Match</th>
                          <th className="px-3 py-2 text-center">Score</th>
                          <th className="px-3 py-2 text-center w-36">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analysisData.items.map((row) => {
                          const isExpanded = !!expandedRowIds[row.id];
                          const descCount = row.descriptions?.length || 0;

                          return (
                            <React.Fragment key={row.id}>
                              {/* Parent Header Row */}
                              <tr
                                className={`hover:bg-gray-50/70 transition-colors ${isExpanded ? "bg-indigo-50/20" : ""
                                  }`}
                              >
                                <td className="px-3 py-2 text-center font-mono text-gray-500">
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpand(row.id)}
                                    className="flex items-center gap-1 mx-auto hover:text-indigo-600 font-bold cursor-pointer"
                                    title="Click to toggle description lines"
                                  >
                                    <span className="text-[10px] text-gray-400">
                                      {isExpanded ? "▼" : "▶"}
                                    </span>
                                    {row.itemSerialNo}
                                  </button>
                                </td>

                                <td className="px-3 py-2">
                                  <p className="font-semibold text-gray-700">{row.originalItemName}</p>
                                  {descCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleRowExpand(row.id)}
                                      className="text-[10px] font-bold text-indigo-600 hover:underline mt-0.5 cursor-pointer"
                                    >
                                      {descCount} detailed line{descCount > 1 ? "s" : ""}
                                    </button>
                                  )}
                                </td>

                                <td className="px-3 py-2 bg-violet-50/20">
                                  <input
                                    type="text"
                                    value={row.itemName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAnalysisData((prev) => ({
                                        ...prev,
                                        items: prev.items.map((i) =>
                                          i.id === row.id ? { ...i, itemName: val } : i
                                        ),
                                      }));
                                    }}
                                    className="w-full px-2 py-1 rounded border border-gray-200 text-xs font-bold bg-white focus:ring-1 focus:ring-indigo-300 outline-none"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  {row.matchedMasterItem ? (
                                    <div>
                                      <span className="font-semibold text-xs text-gray-800 block truncate max-w-[180px]">
                                        {row.matchedMasterItem.itemName}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-mono ml-1 block">
                                        ({row.matchedMasterItem.itemCode || "NO-CODE"})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic text-[11px]">No match</span>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-center font-bold text-xs">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] ${row.matchScore >= 90
                                      ? "bg-emerald-100 text-emerald-800"
                                      : row.matchScore >= 50
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-gray-100 text-gray-500"
                                      }`}
                                  >
                                    {row.matchScore}%
                                  </span>
                                </td>

                                <td className="px-3 py-2 text-center">
                                  {row.status === "in_master" || row.matchedMasterItem ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                                      <FaCheck size={9} className="text-emerald-600" />
                                      Already Available
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[11px]">
                                      New Item
                                    </span>
                                  )}
                                </td>
                              </tr>

                              {/* ── EXPANDED DESCRIPTION SUB-TABLE WITH ITEM MASTER CHECK ── */}
                              {isExpanded && (
                                <tr className="bg-slate-50 border-b border-gray-200">
                                  <td colSpan={6} className="px-6 py-4">
                                    {row.sectionSpecification && (
                                      <div className="mb-2 p-2 bg-amber-50 rounded border border-amber-200/60 text-[11px] text-amber-900">
                                        <span className="font-bold uppercase tracking-wider text-[9px] text-amber-700 block mb-0.5">
                                          Scope / Spec Note:
                                        </span>
                                        {row.sectionSpecification}
                                      </div>
                                    )}

                                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                      <table className="w-full text-xs">
                                        <thead className="bg-gray-100/80 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-200">
                                          <tr>
                                            <th className="px-3 py-2 w-14 text-center">Sr.</th>
                                            <th className="px-3 py-2 text-left">Detailed Description</th>
                                            <th className="px-3 py-2 text-left w-56">Item Master Match</th>
                                            <th className="px-2 py-2 text-center w-16">Score</th>
                                            <th className="px-2 py-2 text-center w-14">Qty</th>
                                            <th className="px-2 py-2 text-center w-14">Unit</th>
                                            <th className="px-3 py-2 text-right w-24">Supply Rate</th>
                                            <th className="px-3 py-2 text-center w-36">Item Master Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {(row.descriptions || []).map((desc, dIdx) => {
                                            const isChanged = desc.hasAiSuggestion;
                                            const displayMatchText =
                                              desc.matchedDescriptionText || desc.matchedMasterItem?.itemName || "";

                                            return (
                                              <tr key={dIdx} className="hover:bg-indigo-50/20 transition-colors">
                                                <td className="px-3 py-2 text-center font-mono text-gray-400 align-top">
                                                  {desc.srNo || `${row.itemSerialNo}.${dIdx + 1}`}
                                                </td>

                                                <td className="px-3 py-2 align-top">
                                                  {isChanged ? (
                                                    <div className="space-y-1">
                                                      <div className="flex items-start gap-1.5 bg-red-50 border border-red-200/80 rounded px-2 py-1 text-red-900 text-xs">
                                                        <span className="font-mono text-red-500 font-bold select-none text-[11px]">-</span>
                                                        <span className="line-through opacity-75 leading-relaxed flex-1">
                                                          {desc.originalDescription}
                                                        </span>
                                                        <span className="text-[9px] font-bold uppercase text-red-600 bg-red-100 px-1 rounded shrink-0">
                                                          RAW
                                                        </span>
                                                      </div>
                                                      <div className="flex items-start gap-1.5 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-emerald-950 text-xs">
                                                        <span className="font-mono text-emerald-600 font-bold select-none text-[11px]">+</span>
                                                        <input
                                                          type="text"
                                                          value={desc.description}
                                                          onChange={(e) => {
                                                            const val = e.target.value;
                                                            setAnalysisData((prev) => ({
                                                              ...prev,
                                                              items: prev.items.map((it) =>
                                                                it.id === row.id
                                                                  ? {
                                                                    ...it,
                                                                    descriptions: it.descriptions.map((d, i) =>
                                                                      i === dIdx ? { ...d, description: val } : d
                                                                    ),
                                                                  }
                                                                  : it
                                                              ),
                                                            }));
                                                          }}
                                                          className="bg-transparent border-0 outline-none w-full font-medium text-emerald-950 p-0 text-xs focus:ring-0"
                                                        />
                                                        <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded shrink-0">
                                                          ✨ AI
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-800 font-medium text-xs leading-relaxed">
                                                      {desc.description}
                                                    </span>
                                                  )}
                                                </td>

                                                <td className="px-3 py-2 align-top">
                                                  {desc.matchedMasterItem ? (
                                                    <div className="leading-tight">
                                                      <span
                                                        className="font-semibold text-xs text-gray-800 block truncate max-w-[210px]"
                                                        title={displayMatchText}
                                                      >
                                                        {displayMatchText}
                                                      </span>
                                                      <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                                                        ({desc.matchedMasterItem.itemCode || "NO-CODE"})
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400 italic text-[11px]">No match</span>
                                                  )}
                                                </td>

                                                <td className="px-2 py-2 text-center align-top">
                                                  <span
                                                    className={`font-black px-1.5 py-0.5 rounded text-[10px] ${desc.matchScore >= 85
                                                      ? "bg-emerald-100 text-emerald-800"
                                                      : desc.matchScore >= 50
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-gray-100 text-gray-400"
                                                      }`}
                                                  >
                                                    {desc.matchScore}%
                                                  </span>
                                                </td>

                                                <td className="px-2 py-2 text-center font-bold text-gray-700 text-xs align-top">
                                                  {desc.isRateOnly ? "—" : (desc.quantity ?? desc.qty ?? 0)}
                                                </td>

                                                <td className="px-2 py-2 text-center text-gray-500 uppercase text-xs align-top">
                                                  {desc.unit || "nos"}
                                                </td>

                                                <td className="px-3 py-2 text-right font-mono text-gray-600 text-xs align-top">
                                                  {desc.unitRateSupply ? `₹${desc.unitRateSupply.toLocaleString("en-IN")}` : "—"}
                                                </td>

                                                <td className="px-3 py-2 text-center align-top">
                                                  {desc.matchedMasterItem ? (
                                                    <span
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]"
                                                      title={`Linked to: ${desc.matchedMasterItem.itemName} (${desc.matchedMasterItem.itemCode || "NO-CODE"})`}
                                                    >
                                                      <FaCheck size={8} className="text-emerald-600" />
                                                      Already in Master
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px]">
                                                      New BOQ Item
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 shrink-0">
              {importing ? (
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span className="text-xs font-bold text-gray-700">{progressMessage}</span>
                  </div>

                  <div className="relative w-32 h-9 border border-gray-300 rounded-xl overflow-hidden flex items-center shrink-0 bg-white shadow-sm">
                    <div className="absolute inset-0 flex items-center justify-center z-0">
                      <span className="text-xs font-mono font-bold text-slate-700">{analysisProgress}%</span>
                    </div>
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out z-10 overflow-hidden"
                      style={{ width: `${analysisProgress}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center" style={{ width: "128px" }}>
                        <span className="text-xs font-mono font-bold text-white">{analysisProgress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : loadingFinal ? (
                <div className="flex-1 bg-indigo-50/50 border border-indigo-200 rounded-xl px-4 py-2 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse inline-block" />
                    <span className="text-xs font-bold text-indigo-700">{finalLoadMessage}</span>
                  </div>

                  <div className="relative w-32 h-9 border border-indigo-300 rounded-xl overflow-hidden flex items-center shrink-0 bg-white shadow-sm">
                    <div className="absolute inset-0 flex items-center justify-center z-0">
                      <span className="text-xs font-mono font-bold text-slate-700">{finalLoadProgress}%</span>
                    </div>
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-300 ease-out z-10 overflow-hidden"
                      style={{ width: `${finalLoadProgress}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center" style={{ width: "128px" }}>
                        <span className="text-xs font-mono font-bold text-white">{finalLoadProgress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setAnalysisData(null);
                    }}
                    className="text-sm font-bold text-gray-400 hover:text-gray-600 px-4 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>

                  {!analysisData ? (
                    <button
                      onClick={handleImport}
                      disabled={!importFile}
                      // !selectedProjectImport}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-100 cursor-pointer"
                    >
                      Analyze Excel
                    </button>
                  ) : (
                    <button
                      onClick={handleFinalLoad}
                      className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 cursor-pointer"
                    >
                      <FaCheck size={12} />
                      <span>Load Data into BOQ</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// "use client";

// import { useEffect, useState } from "react";
// import api from "@/lib/api";
// import Select from "react-select";
// import {
//   FaPlus,
//   FaCheck,
//   FaFileInvoice,
//   FaFileExcel,
//   FaTimes,
//   FaLayerGroup,
// } from "react-icons/fa";
// import { HiDotsVertical } from "react-icons/hi";
// import { toast } from "react-toastify";

// export default function ConstructionBOQPage() {
//   const [boqs, setBoqs] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [inventoryItems, setInventoryItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isImportModalOpen, setIsImportModalOpen] = useState(false);
//   const [editBOQ, setEditBOQ] = useState(null);

//   // ── Form State ──
//   const [selectedProject, setSelectedProject] = useState(null);
//   const [selectedProjectImport, setSelectedProjectImport] = useState(null);
//   const [importFile, setImportFile] = useState(null);
//   const [importing, setImporting] = useState(false);
//   const [boqNumber, setBoqNumber] = useState("");
//   const [boqDate, setBoqDate] = useState("");
//   const [status, setStatus] = useState("draft");
//   const [items, setItems] = useState([]);
//   const [remarks, setRemarks] = useState("");

//   // ── Fetch BOQs, Projects, Inventory ──
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           setLoading(false);
//           return;
//         }
//         const headers = { headers: { Authorization: `Bearer ${token}` } };

//         const [boqRes, projRes, invRes] = await Promise.allSettled([
//           api.get("/construction/boq", headers),
//           api.get("/construction/projects", headers),
//           api.get("/items", headers),
//         ]);

//         if (boqRes.status === "fulfilled") {
//           setBoqs(boqRes.value.data?.data || boqRes.value.data || []);
//         } else {
//           console.warn("BOQ API failed:", boqRes.reason);
//           setBoqs([]);
//         }

//         if (projRes.status === "fulfilled") {
//           setProjects(projRes.value.data?.data || projRes.value.data || []);
//         } else {
//           console.warn("Projects API failed:", projRes.reason);
//           setProjects([]);
//         }

//         if (invRes.status === "fulfilled") {
//           setInventoryItems(invRes.value.data?.data || invRes.value.data || []);
//         } else {
//           console.warn("Inventory API failed:", invRes.reason);
//           setInventoryItems([]);
//         }
//       } catch (err) {
//         console.error("Fetch error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   const formatCurrency = (num) => {
//     return new Intl.NumberFormat("en-IN", {
//       style: "currency",
//       currency: "INR",
//       maximumFractionDigits: 0,
//     }).format(num);
//   };

//   // ── Build options with variants ──
//   const buildItemOptions = () => {
//     const options = [];
//     inventoryItems.forEach((item) => {
//       if (item.variants && item.variants.length > 0) {
//         // Add each variant as a separate option
//         item.variants.forEach((variant) => {
//           let label = item.itemName;
//           if (variant.attributes) {
//             const attrStr = Object.entries(variant.attributes)
//               .map(([k, v]) => `${k}: ${v}`)
//               .join(", ");
//             label += ` (${attrStr})`;
//           } else {
//             label += ` (${variant.sku || "variant"})`;
//           }
//           options.push({
//             value: variant._id,
//             label: label,
//             isVariant: true,
//             parentId: item._id,
//             parentName: item.itemName,
//             variantData: variant,
//             unit: variant.uom || item.uom || "nos",
//             rate: variant.price || item.unitPrice || 0,
//             imageUrl: variant.imageUrl || item.imageUrl || "",
//           });
//         });
//       } else {
//         // No variants
//         options.push({
//           value: item._id,
//           label: item.itemName,
//           isVariant: false,
//           parentId: null,
//           parentName: item.itemName,
//           variantData: null,
//           unit: item.uom || "nos",
//           rate: item.unitPrice || 0,
//           imageUrl: item.imageUrl || "",
//         });
//       }
//     });
//     return options;
//   };

//   // ── Add variant rows (multiple) ──
//   const addVariantRows = (selectedOption) => {
//     if (!selectedOption) return;

//     // If it's a variant, add only that variant
//     // If it's a parent item with variants, add ALL variants
//     let rowsToAdd = [];

//     if (selectedOption.isVariant) {
//       // Single variant
//       rowsToAdd = [{
//         itemId: selectedOption.parentId,
//         variantId: selectedOption.value,
//         itemName: selectedOption.parentName,
//         variantName: selectedOption.label,
//         description: selectedOption.label,
//         unit: selectedOption.unit,
//         quantity: 1,
//         rate: selectedOption.rate,
//         amount: selectedOption.rate,
//         imageUrl: selectedOption.imageUrl,
//         isVariant: true,
//         variantData: selectedOption.variantData,
//         isCustom: false,
//       }];
//     } else {
//       // Check if this item has variants
//       const parentItem = inventoryItems.find(i => i._id === selectedOption.value);
//       if (parentItem && parentItem.variants && parentItem.variants.length > 0) {
//         // Add ALL variants of this item
//         parentItem.variants.forEach(v => {
//           let label = parentItem.itemName;
//           if (v.attributes) {
//             const attrStr = Object.entries(v.attributes)
//               .map(([k, val]) => `${k}: ${val}`)
//               .join(", ");
//             label += ` (${attrStr})`;
//           } else {
//             label += ` (${v.sku || "variant"})`;
//           }
//           rowsToAdd.push({
//             itemId: parentItem._id,
//             variantId: v._id,
//             itemName: parentItem.itemName,
//             variantName: label,
//             description: label,
//             unit: v.uom || parentItem.uom || "nos",
//             quantity: 1,
//             rate: v.price || parentItem.unitPrice || 0,
//             amount: v.price || parentItem.unitPrice || 0,
//             imageUrl: v.imageUrl || parentItem.imageUrl || "",
//             isVariant: true,
//             variantData: v,
//             isCustom: false,
//           });
//         });
//       } else {
//         // No variants – add single row
//         rowsToAdd = [{
//           itemId: selectedOption.value,
//           variantId: null,
//           itemName: selectedOption.label,
//           variantName: null,
//           description: selectedOption.label,
//           unit: selectedOption.unit,
//           quantity: 1,
//           rate: selectedOption.rate,
//           amount: selectedOption.rate,
//           imageUrl: selectedOption.imageUrl,
//           isVariant: false,
//           variantData: null,
//           isCustom: false,
//         }];
//       }
//     }

//     setItems([...items, ...rowsToAdd]);
//   };

//   // ── Open Modal ──
//   const openModal = (boq = null) => {
//     setEditBOQ(boq);
//     if (boq) {
//       setSelectedProject({ value: boq.project._id, label: boq.project.name });
//       setBoqNumber(boq.boqNumber);
//       setBoqDate(boq.date.split("T")[0]);
//       setStatus(boq.status);
//       setRemarks(boq.remarks || "");
//       setItems(
//         boq.items.map((item) => ({
//           ...item,
//           itemId: item.itemId?._id || item.itemId || null,
//           itemName: item.itemName || "",
//           description: item.description || "",
//           unit: item.unit || "nos",
//           quantity: item.quantity || 0,
//           rate: item.rate || 0,
//           amount: item.amount || 0,
//           imageUrl: item.imageUrl || "",
//           isCustom: !item.itemId,
//           isVariant: false,
//           variantId: null,
//         }))
//       );
//     } else {
//       setSelectedProject(null);
//       setBoqNumber(`BOQ-${Date.now().toString().slice(-6)}`);
//       setBoqDate(new Date().toISOString().split("T")[0]);
//       setStatus("draft");
//       setRemarks("");
//       setItems([]);
//     }
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setEditBOQ(null);
//   };

//   // ── BOQ Item Handlers ──
// const handleItemChange = (index, field, value) => {
//   setItems((prev) => {
//     const newItems = [...prev];
//     const item = { ...newItems[index] };
//     item[field] = value;
//     // Recalculate amount whenever quantity or rate changes
//     if (field === "quantity" || field === "rate") {
//       const qty = field === "quantity" ? value : item.quantity;
//       const rate = field === "rate" ? value : item.rate;
//       item.amount = (parseFloat(qty) || 0) * (parseFloat(rate) || 0);
//     }
//     newItems[index] = item;
//     return newItems;
//   });
// };

//   const handleAddItem = () => {
//     setItems([
//       ...items,
//       {
//         itemId: null,
//         variantId: null,
//         itemName: "",
//         variantName: null,
//         description: "",
//         unit: "nos",
//         quantity: 1,
//         rate: 0,
//         amount: 0,
//         imageUrl: "",
//         isCustom: true,
//         isVariant: false,
//         variantData: null,
//       },
//     ]);
//   };

//   const handleRemoveItem = (index) => {
//     if (items.length === 1) return;
//     const newItems = [...items];
//     newItems.splice(index, 1);
//     setItems(newItems);
//   };

//   const totalBOQAmount = items.reduce(
//     (sum, item) => sum + (parseFloat(item.amount) || 0),
//     0
//   );

//   // ── Submit BOQ ──
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const validItems = items
//       .filter((item) => item.itemName && item.itemName.trim() !== "")
//       .map((item) => ({
//         itemId: item.isCustom ? null : item.itemId,
//         itemName: item.itemName,
//         description: item.description,
//         unit: item.unit,
//         quantity: parseFloat(item.quantity) || 0,
//         rate: parseFloat(item.rate) || 0,
//         amount: parseFloat(item.amount) || 0,
//       }));

//     if (validItems.length === 0) {
//       toast.error("Please add at least one BOQ item.");
//       return;
//     }

//     const payload = {
//       project: selectedProject.value,
//       boqNumber,
//       date: boqDate,
//       status,
//       remarks,
//       items: validItems,
//     };

//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       if (editBOQ) {
//         const res = await api.put(
//           `/construction/boq/${editBOQ._id}`,
//           payload,
//           headers
//         );
//         setBoqs(
//           boqs.map((b) => (b._id === editBOQ._id ? res.data.data || res.data : b))
//         );
//         toast.success("BOQ updated successfully!");
//       } else {
//         const res = await api.post("/construction/boq", payload, headers);
//         setBoqs([res.data.data || res.data, ...boqs]);
//         toast.success("BOQ created successfully!");
//       }
//       closeModal();
//     } catch (err) {
//       console.error("❌ BOQ save failed:", err);
//       toast.error("Failed to save BOQ. Check console.");
//     }
//   };

//   // ── Import BOQ from Excel ──
//   const handleImport = async () => {
//     if (!selectedProjectImport || !importFile) {
//       toast.error("Please select project and upload file.");
//       return;
//     }

//     setImporting(true);
//     const formData = new FormData();
//     formData.append("projectId", selectedProjectImport.value);
//     formData.append("file", importFile);

//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/construction/boq/import", {
//         method: "POST",
//         headers: { Authorization: `Bearer ${token}` },
//         body: formData,
//       });
//       const data = await res.json();

//       if (data.success) {
//         toast.success(data.message);
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const refreshRes = await api.get("/construction/boq", headers);
//         setBoqs(refreshRes.data.data || []);
//         setIsImportModalOpen(false);
//         setImportFile(null);
//         setSelectedProjectImport(null);
//       } else {
//         toast.error(data.message);
//       }
//     } catch (err) {
//       console.error("Import error:", err);
//       toast.error("Import failed. Check console.");
//     } finally {
//       setImporting(false);
//     }
//   };

//   // ── UI Helpers ──
//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
//       {text}
//       {req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );
//   const fi =
//     "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

//   const StatusBadge = ({ status }) => {
//     const colors = {
//       draft: "bg-gray-100 text-gray-600",
//       submitted: "bg-blue-100 text-blue-700",
//       approved: "bg-emerald-100 text-emerald-700",
//       rejected: "bg-red-100 text-red-700",
//     };
//     return (
//       <span
//         className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}
//       >
//         {status}
//       </span>
//     );
//   };

//   // ── Render ──
//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//               <FaFileInvoice className="text-indigo-600" /> Construction BOQ
//             </h1>
//             <p className="text-sm text-gray-400 mt-0.5">
//               Project estimates with multi-row variant support
//             </p>
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={() => setIsImportModalOpen(true)}
//               className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
//             >
//               <FaFileExcel size={12} /> Import Excel
//             </button>
//             <button
//               onClick={() => openModal()}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
//             >
//               <FaPlus size={12} /> New BOQ
//             </button>
//           </div>
//         </div>

//         {/* BOQ Table */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
//                     BOQ #
//                   </th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
//                     Project
//                   </th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
//                     Phase
//                   </th>
//                   <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
//                     Date
//                   </th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
//                     Total Amount
//                   </th>
//                   <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
//                     Status
//                   </th>
//                   <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-50">
//                 {loading ? (
//                   <tr>
//                     <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
//                       Loading BOQs...
//                     </td>
//                   </tr>
//                 ) : boqs.length === 0 ? (
//                   <tr>
//                     <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
//                       No BOQs found. Import from Excel or create manually.
//                     </td>
//                   </tr>
//                 ) : (
//                   boqs.map((b) => (
//                     <tr key={b._id} className="hover:bg-indigo-50/20 transition-colors">
//                       <td className="px-6 py-4 font-bold text-indigo-600">
//                         {b.boqNumber}
//                       </td>
//                       <td className="px-6 py-4 font-medium text-gray-700">
//                         {b.project?.name || "N/A"}
//                       </td>
//                       <td className="px-6 py-4 text-center font-bold text-indigo-500">
//                         {b.phase || "I"}
//                       </td>
//                       <td className="px-6 py-4 text-gray-500 text-xs">
//                         {new Date(b.date).toLocaleDateString("en-GB")}
//                       </td>
//                       <td className="px-6 py-4 text-right font-bold text-gray-800">
//                         {formatCurrency(
//                           b.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
//                         )}
//                       </td>
//                       <td className="px-6 py-4 text-center">
//                         <StatusBadge status={b.status} />
//                       </td>
//                       <td className="px-6 py-4 text-right">
//                         <button
//                           onClick={() => openModal(b)}
//                           className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"
//                         >
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

//       {/* ── BOQ Modal ── */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
//             <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
//               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
//                 <FaFileInvoice size={20} />
//               </div>
//               <h2 className="text-xl font-black text-gray-900 tracking-tight">
//                 {editBOQ ? "Edit BOQ" : "Create Bill of Quantities"}
//               </h2>
//               <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
//                 <span className="font-bold text-gray-400">Total:</span>
//                 <span className="font-black text-indigo-600">
//                   {formatCurrency(totalBOQAmount)}
//                 </span>
//               </div>
//             </div>

//             <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <div className="md:col-span-2">
//                   <Lbl text="Project" req />
//                   <Select
//                     options={projects.map((p) => ({ value: p._id, label: p.name }))}
//                     value={selectedProject}
//                     onChange={(s) => setSelectedProject(s)}
//                     placeholder="Select Project..."
//                     className="text-sm"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="BOQ Number" req />
//                   <input
//                     type="text"
//                     className={fi}
//                     value={boqNumber}
//                     onChange={(e) => setBoqNumber(e.target.value)}
//                     required
//                   />
//                 </div>
//                 <div>
//                   <Lbl text="Date" req />
//                   <input
//                     type="date"
//                     className={fi}
//                     value={boqDate}
//                     onChange={(e) => setBoqDate(e.target.value)}
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="Status" />
//                   <select
//                     className={fi}
//                     value={status}
//                     onChange={(e) => setStatus(e.target.value)}
//                   >
//                     <option value="draft">Draft</option>
//                     <option value="submitted">Submitted</option>
//                     <option value="approved">Approved</option>
//                     <option value="rejected">Rejected</option>
//                   </select>
//                 </div>
//                 <div>
//                   <Lbl text="Remarks" />
//                   <input
//                     type="text"
//                     className={fi}
//                     value={remarks}
//                     onChange={(e) => setRemarks(e.target.value)}
//                     placeholder="General notes..."
//                   />
//                 </div>
//               </div>

//               {/* ── BOQ Items with Multi-Row Support ── */}
//               <div className="border-t border-gray-200 pt-4">
//                 <div className="flex items-center justify-between mb-3">
//                   <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
//                     BOQ Line Items
//                   </p>
//                   <div className="flex gap-2">
//                     <button
//                       type="button"
//                       onClick={handleAddItem}
//                       className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
//                     >
//                       <FaPlus size={10} /> Add Custom
//                     </button>
//                   </div>
//                 </div>

//                 {/* ── Dropdown to Add Item / Variants ── */}
//                 <div className="mb-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
//                   <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
//                     <FaLayerGroup className="inline mr-1" /> Add from Inventory
//                   </p>
//                   <div className="flex gap-2">
//                     <Select
//                       className="flex-1 text-sm"
//                       options={buildItemOptions()}
//                       placeholder="Search item or variant..."
//                       onChange={(opt) => {
//                         if (opt) {
//                           addVariantRows(opt);
//                           // Reset selection
//                         }
//                       }}
//                       isClearable
//                     />
//                   </div>
//                   <p className="text-[9px] text-gray-400 mt-1.5">
//                     💡 Select an item with variants → all variants will be added as separate rows
//                   </p>
//                 </div>

//                 {/* ── Items Table ── */}
//                 <div className="overflow-x-auto border border-gray-100 rounded-xl">
//                   <table className="w-full text-sm">
//                     <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400">
//                       <tr>
//                         <th className="px-3 py-2 text-left min-w-[200px]">Item</th>
//                         <th className="px-3 py-2 text-left min-w-[150px]">Description</th>
//                         <th className="px-3 py-2 text-center w-[80px]">Unit</th>
//                         <th className="px-3 py-2 text-center w-[80px]">Qty</th>
//                         <th className="px-3 py-2 text-center w-[100px]">Rate (₹)</th>
//                         <th className="px-3 py-2 text-right w-[120px]">Amount (₹)</th>
//                         <th className="px-3 py-2 text-center w-[50px]">#</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-50">
//                       {items.length === 0 ? (
//                         <tr>
//                           <td colSpan="7" className="px-3 py-8 text-center text-gray-400 text-sm">
//                             No items added. Use the dropdown above to add items with variants.
//                           </td>
//                         </tr>
//                       ) : (
//                         items.map((item, index) => (
//                           <tr key={index}>
//                             <td className="px-3 py-1.5">
//                               <input
//                                 type="text"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
//                                 value={item.itemName || ""}
//                                 onChange={(e) =>
//                                   handleItemChange(index, {
//                                     target: { name: "itemName", value: e.target.value },
//                                   })
//                                 }
//                                 placeholder="Item name"
//                               />
//                               {item.isVariant && (
//                                 <p className="text-[8px] text-indigo-500 mt-0.5 truncate">
//                                   Variant: {item.variantName}
//                                 </p>
//                               )}
//                             </td>
//                             <td className="px-3 py-1.5">
//                               <input
//                                 type="text"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
//                                 value={item.description || ""}
//                                 onChange={(e) =>
//                                   handleItemChange(index, {
//                                     target: { name: "description", value: e.target.value },
//                                   })
//                                 }
//                                 placeholder="Description"
//                               />
//                             </td>
//                             <td className="px-3 py-1.5">
//                               <input
//                                 type="text"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.unit || ""}
//                                 onChange={(e) =>
//                                   handleItemChange(index, {
//                                     target: { name: "unit", value: e.target.value },
//                                   })
//                                 }
//                                 placeholder="nos"
//                               />
//                             </td>
//                             <td className="px-3 py-1.5">
//                               <input
//                                 type="number"
//                                 step="0.01"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.quantity || 0}
//                                 onChange={(e) =>
//   handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)
// }
//                               />
//                             </td>
//                             <td className="px-3 py-1.5">
//                               <input
//                                 type="number"
//                                 step="0.01"
//                                 className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
//                                 value={item.rate || 0}
//                                 onChange={(e) => {
//                                   const rate = parseFloat(e.target.value) || 0;
//                                   const qty = parseFloat(items[index]?.quantity) || 0;
//                                   handleItemChange(index, {
//                                     target: { name: "rate", value: rate },
//                                   });
//                                   handleItemChange(index, {
//                                     target: { name: "amount", value: qty * rate },
//                                   });
//                                 }}
//                               />
//                             </td>
//                             <td className="px-3 py-1.5 text-right font-bold text-gray-700">
//                               {formatCurrency(item.amount || 0)}
//                             </td>
//                             <td className="px-3 py-1.5 text-center">
//                               <button
//                                 type="button"
//                                 onClick={() => handleRemoveItem(index)}
//                                 className="text-gray-300 hover:text-red-500 transition-colors"
//                                 disabled={items.length === 1}
//                               >
//                                 <FaTimes size={12} />
//                               </button>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                     {items.length > 0 && (
//                       <tfoot className="bg-gray-50/80 border-t border-gray-200">
//                         <tr>
//                           <td colSpan="5" className="px-3 py-2 text-right font-bold text-gray-600 text-xs uppercase tracking-wider">
//                             Grand Total
//                           </td>
//                           <td className="px-3 py-2 text-right font-extrabold text-indigo-600 text-sm">
//                             {formatCurrency(totalBOQAmount)}
//                           </td>
//                           <td></td>
//                         </tr>
//                       </tfoot>
//                     )}
//                   </table>
//                 </div>
//               </div>

//               <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4 shrink-0">
//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
//                 >
//                   <FaCheck size={12} /> {editBOQ ? "Update BOQ" : "Create BOQ"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ── Import Modal ── */}
//       {isImportModalOpen && (
//         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
//                 <FaFileExcel className="text-emerald-600" /> Import BOQ from Excel
//               </h2>
//               <button
//                 onClick={() => setIsImportModalOpen(false)}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <FaTimes size={20} />
//               </button>
//             </div>

//             <div className="space-y-4">
//               <div>
//                 <Lbl text="Select Project" req />
//                 <Select
//                   options={projects.map((p) => ({ value: p._id, label: p.name }))}
//                   value={selectedProjectImport}
//                   onChange={setSelectedProjectImport}
//                   placeholder="Choose project..."
//                 />
//               </div>

//               <div>
//                 <Lbl text="Upload Excel File" req />
//                 <input
//                   type="file"
//                   accept=".xlsx,.xls"
//                   onChange={(e) => setImportFile(e.target.files[0])}
//                   className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
//                 />
//                 <p className="text-xs text-gray-400 mt-2">
//                   Sheet should have: SR. NO., PARTICULARS, UNIT, RATE, TOTAL QUANTITY, AMOUNT
//                   <br />
//                   <span className="text-emerald-600">
//                     ✓ Auto-detects Phase I/II • Auto-detects sections • Extracts taxes
//                   </span>
//                 </p>
//               </div>

//               <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
//                 <button
//                   onClick={() => setIsImportModalOpen(false)}
//                   className="text-sm font-bold text-gray-400 hover:text-gray-600"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleImport}
//                   disabled={importing}
//                   className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
//                 >
//                   {importing ? (
//                     <>
//                       <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                       Importing...
//                     </>
//                   ) : (
//                     <>
//                       <FaFileExcel size={12} /> Import
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
