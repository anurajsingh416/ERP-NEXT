"use client";

import { useEffect, useReducer, useCallback, useMemo, memo, useRef } from "react";
import { useState } from "react";
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
  FaFolderOpen,
  FaEdit,
  FaTrashAlt,
  FaUserTie,
  FaUserFriends,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

// ─── Utility: generate unique ID ────────────────────────────────────────────
let idCounter = 0;
const generateId = () => ++idCounter;

// ─── Default section ────────────────────────────────────────────────────────
const createDefaultSection = (index) => ({
  id: generateId(),
  name: `Section ${index}`,
  subSections: [createDefaultSubSection(index, 1)],
});

const createDefaultSubSection = (sectionIndex, subIndex) => ({
  id: generateId(),
  name: `Sub-Section ${sectionIndex}.${subIndex}`,
  items: [],
});

const createDefaultItem = () => ({
  id: generateId(),
  itemName: "",
  description: "",
  unit: "nos",
  quantity: 1,
  rate: 0,
  amount: 0,
});

// ─── Shared formatter ──────────────────────────────────────────────────────
const formatCurrency = (num) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

// ─── Hook: auto‑grow textarea ─────────────────────────────────────────────
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

// ─── UI Helpers ─────────────────────────────────────────────────────────────
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
      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}
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
          s.id === action.payload.sectionId
            ? { ...s, name: action.payload.newName }
            : s
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
            ? {
                ...s,
                subSections: s.subSections.filter((sub) => sub.id !== subSectionId),
              }
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
                    ? {
                        ...sub,
                        items: sub.items.filter((it) => it.id !== itemId),
                      }
                    : sub
                ),
              }
            : s
        ),
      };
    }
    case "UPDATE_ITEM_FIELD": {
      const { sectionId, subSectionId, itemId, field, value } = action.payload;
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
                          const updated = { ...it, [field]: value };
                          if (field === "quantity" || field === "rate") {
                            const qty =
                              field === "quantity"
                                ? parseFloat(value) || 0
                                : parseFloat(it.quantity) || 0;
                            const rate =
                              field === "rate"
                                ? parseFloat(value) || 0
                                : parseFloat(it.rate) || 0;
                            updated.amount = qty * rate;
                          }
                          return updated;
                        }),
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

// ─── ItemRow Component ──────────────────────────────────────────────────────
const ItemRow = memo(function ItemRow({
  item,
  itemNumber,
  sectionId,
  subSectionId,
  onUpdateItem,
  onRemoveItem,
  isLastItem,
}) {
  const handleItemNameChange = useCallback(
    (e) => onUpdateItem(sectionId, subSectionId, item.id, "itemName", e.target.value),
    [sectionId, subSectionId, item.id, onUpdateItem]
  );

  const handleDescriptionChange = useCallback(
    (e) => onUpdateItem(sectionId, subSectionId, item.id, "description", e.target.value),
    [sectionId, subSectionId, item.id, onUpdateItem]
  );

  const handleUnitChange = useCallback(
    (e) => onUpdateItem(sectionId, subSectionId, item.id, "unit", e.target.value),
    [sectionId, subSectionId, item.id, onUpdateItem]
  );

  const handleQuantityChange = useCallback(
    (e) => {
      const val = e.target.value ? parseFloat(e.target.value) : 0;
      onUpdateItem(sectionId, subSectionId, item.id, "quantity", val);
    },
    [sectionId, subSectionId, item.id, onUpdateItem]
  );

  const handleRateChange = useCallback(
    (e) => {
      const val = e.target.value ? parseFloat(e.target.value) : 0;
      onUpdateItem(sectionId, subSectionId, item.id, "rate", val);
    },
    [sectionId, subSectionId, item.id, onUpdateItem]
  );

  const handleRemove = useCallback(
    () => onRemoveItem(sectionId, subSectionId, item.id),
    [sectionId, subSectionId, item.id, onRemoveItem]
  );

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-2 py-0.5 text-center text-gray-500 text-[10px] font-bold">
        {itemNumber}
      </td>
      <td className="px-2 py-0.5">
        <input
          type="text"
          className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none"
          value={item.itemName || ""}
          onChange={handleItemNameChange}
          placeholder="Item name"
        />
      </td>
      <td className="px-2 py-0.5">
        <input
          type="text"
          className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none"
          value={item.description || ""}
          onChange={handleDescriptionChange}
          placeholder="Description"
        />
      </td>
      <td className="px-2 py-0.5">
        <input
          type="text"
          className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none text-center"
          value={item.unit || ""}
          onChange={handleUnitChange}
          placeholder="nos"
        />
      </td>
      <td className="px-2 py-0.5">
        <input
          type="number"
          step="0.01"
          className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none text-center"
          value={item.rate || 0}
          onChange={handleRateChange}
        />
      </td>
      <td className="px-2 py-0.5">
        <input
          type="number"
          step="0.01"
          className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[10px] bg-white focus:border-indigo-300 outline-none text-center"
          value={item.quantity || 0}
          onChange={handleQuantityChange}
        />
      </td>
      <td className="px-2 py-0.5 text-right font-bold text-gray-700 text-[10px]">
        {formatCurrency(item.amount || 0)}
      </td>
      <td className="px-2 py-0.5 text-center">
        <button
          type="button"
          onClick={handleRemove}
          className="text-gray-300 hover:text-red-500 transition-colors"
          disabled={isLastItem}
        >
          <FaTimes size={10} />
        </button>
      </td>
    </tr>
  );
});

// ─── Sub-Section Table ──────────────────────────────────────────────────────
const SubSectionTable = memo(function SubSectionTable({
  sectionId,
  subSection,
  subSectionNumber,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onUpdateName,
  onRemoveSubSection,
}) {
  const handleAddItem = useCallback(
    () => onAddItem(sectionId, subSection.id),
    [sectionId, subSection.id, onAddItem]
  );

  const handleRemoveSubSection = useCallback(
    () => onRemoveSubSection(sectionId, subSection.id),
    [sectionId, subSection.id, onRemoveSubSection]
  );

  const handleUpdateName = useCallback(
    (e) => onUpdateName(sectionId, subSection.id, e.target.value),
    [sectionId, subSection.id, onUpdateName]
  );

  const nameRef = useAutosizeTextarea(subSection.name);

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
            onChange={handleUpdateName}
            placeholder="Sub-Section Name"
          />
          <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">
            {subSection.items.length} items
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleAddItem}
            className="text-indigo-600 hover:text-indigo-800 text-xs"
          >
            <FaPlus size={10} /> Add Item
          </button>
          <button
            type="button"
            onClick={handleRemoveSubSection}
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
              <th className="px-2 py-1 text-center w-[30px]">Sr.No.</th>
              <th className="px-2 py-1 text-left min-w-[120px]">Item</th>
              <th className="px-2 py-1 text-left min-w-[100px]">Description</th>
              <th className="px-2 py-1 text-center w-[50px]">Unit</th>
              <th className="px-2 py-1 text-center w-[60px]">Rate (₹)</th>
              <th className="px-2 py-1 text-center w-[50px]">Qty</th>
              <th className="px-2 py-1 text-right w-[80px]">Amount (₹)</th>
              <th className="px-2 py-1 text-center w-[25px]">#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subSection.items.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-2 py-2 text-center text-gray-400 text-[10px]">
                  No items. Click "Add Item".
                </td>
              </tr>
            ) : (
              subSection.items.map((item, idx) => {
                const itemNumber = `${subSectionNumber}.${idx + 1}`;
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    itemNumber={itemNumber}
                    sectionId={sectionId}
                    subSectionId={subSection.id}
                    onUpdateItem={onUpdateItem}
                    onRemoveItem={onRemoveItem}
                    isLastItem={subSection.items.length === 1}
                  />
                );
              })
            )}
          </tbody>
          {subSection.items.length > 0 && (
            <tfoot className="bg-gray-50/80 border-t border-gray-200">
              <tr>
                <td colSpan="6" className="px-2 py-1 text-right text-[9px] font-bold text-gray-600">
                  Sub-Total
                </td>
                <td className="px-2 py-1 text-right text-[11px] font-extrabold text-indigo-600">
                  {formatCurrency(
                    subSection.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
                  )}
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

// ─── Section Table ──────────────────────────────────────────────────────────
const SectionTable = memo(function SectionTable({
  section,
  sectionIndex,
  onUpdateSectionName,
  onRemoveSection,
  onAddSubSection,
  onRemoveSubSection,
  onUpdateSubSectionName,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}) {
  const handleUpdateSectionName = useCallback(
    (e) => onUpdateSectionName(section.id, e.target.value),
    [section.id, onUpdateSectionName]
  );

  const handleRemoveSection = useCallback(
    () => onRemoveSection(section.id),
    [section.id, onRemoveSection]
  );

  const handleAddSubSection = useCallback(
    () => onAddSubSection(section.id),
    [section.id, onAddSubSection]
  );

  const nameRef = useAutosizeTextarea(section.name);

  const sectionTotal = useMemo(() => {
    return section.subSections.reduce(
      (total, sub) =>
        total + sub.items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0),
      0
    );
  }, [section.subSections]);

  const totalItems = useMemo(() => {
    return section.subSections.reduce((count, sub) => count + sub.items.length, 0);
  }, [section.subSections]);

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
            onChange={handleUpdateSectionName}
            placeholder="Section Name"
          />
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full shrink-0 mt-1">
            {section.subSections.length} sub-sections
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddSubSection}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            <FaPlus size={10} /> Add Sub-Section
          </button>
          <button
            type="button"
            onClick={handleRemoveSection}
            className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1"
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
              onUpdateItem={onUpdateItem}
              onUpdateName={onUpdateSubSectionName}
              onRemoveSubSection={onRemoveSubSection}
            />
          );
        })}
      </div>

      {totalItems > 0 && (
        <div className="flex justify-end items-center mt-3 pt-2 border-t-2 border-indigo-200">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
            Section Total ({totalItems} items)
          </span>
          <span className="text-sm font-extrabold text-indigo-700">
            {formatCurrency(sectionTotal)}
          </span>
        </div>
      )}
    </div>
  );
});

// ─── SectionContainer ──────────────────────────────────────────────────────
const SectionContainer = memo(function SectionContainer({ section, sectionIndex, dispatch }) {
  const onUpdateSectionName = useCallback(
    (id, name) => dispatch({ type: "UPDATE_SECTION_NAME", payload: { sectionId: id, newName: name } }),
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
      dispatch({
        type: "UPDATE_SUB_SECTION_NAME",
        payload: { sectionId, subSectionId, newName },
      }),
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

  const onUpdateItem = useCallback(
    (sectionId, subSectionId, itemId, field, value) =>
      dispatch({
        type: "UPDATE_ITEM_FIELD",
        payload: { sectionId, subSectionId, itemId, field, value },
      }),
    [dispatch]
  );

  return (
    <SectionTable
      section={section}
      sectionIndex={sectionIndex}
      onUpdateSectionName={onUpdateSectionName}
      onRemoveSection={onRemoveSection}
      onAddSubSection={onAddSubSection}
      onRemoveSubSection={onRemoveSubSection}
      onUpdateSubSectionName={onUpdateSubSectionName}
      onAddItem={onAddItem}
      onRemoveItem={onRemoveItem}
      onUpdateItem={onUpdateItem}
    />
  );
});

// ─── Main Component ────────────────────────────────────────────────────────
export default function ConstructionBOQPage() {
  const [boqs, setBoqs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]); // ✅ NEW
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editBOQ, setEditBOQ] = useState(null);

  // ── Form State ──
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // ✅ NEW
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

  // ── Fetch BOQs, Projects, Suppliers, Customers ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [boqRes, projRes, supRes, custRes] = await Promise.allSettled([
          api.get("/construction/boq", headers),
          api.get("/construction/projects", headers),
          api.get("/suppliers", headers),
          api.get("/customers", headers), // ✅ fetch customers
        ]);

        if (boqRes.status === "fulfilled") {
          setBoqs(boqRes.value.data?.data || boqRes.value.data || []);
        } else {
          console.warn("BOQ API failed:", boqRes.reason);
          setBoqs([]);
        }

        if (projRes.status === "fulfilled") {
          setProjects(projRes.value.data?.data || projRes.value.data || []);
        } else {
          console.warn("Projects API failed:", projRes.reason);
          setProjects([]);
        }

        if (supRes.status === "fulfilled") {
          setSuppliers(supRes.value.data?.data || supRes.value.data || []);
        } else {
          console.warn("Suppliers API failed:", supRes.reason);
          setSuppliers([]);
        }

        if (custRes.status === "fulfilled") {
          setCustomers(custRes.value.data?.data || custRes.value.data || []);
        } else {
          console.warn("Customers API failed:", custRes.reason);
          setCustomers([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Calculate total across all sections ──
  const totalBOQAmount = useMemo(() => {
    return sections.reduce(
      (sum, sec) =>
        sum +
        sec.subSections.reduce(
          (subSum, sub) =>
            subSum + sub.items.reduce((itemSum, it) => itemSum + (parseFloat(it.amount) || 0), 0),
          0
        ),
      0
    );
  }, [sections]);

  // ── Open Modal ──
  const openModal = (boq = null) => {
    setEditBOQ(boq);
    if (boq) {
      setSelectedProject({ value: boq.project._id, label: boq.project.name });
      setSelectedContractor(
        boq.contractor
          ? { value: boq.contractor._id, label: boq.contractor.supplierName || boq.contractor.name || boq.contractor.contactPersonName || boq.contractor._id }
          : null
      );
      setSelectedCustomer(
        boq.customer
          ? { value: boq.customer._id, label: boq.customer.customerName || boq.customer.name || boq.customer.contactPersonName || boq.customer._id }
          : null
      );
      setBoqNumber(boq.boqNumber);
      setBoqDate(boq.date.split("T")[0]);
      setStatus(boq.status);
      setRemarks(boq.remarks || "");

      // ── Group by section, then by subSection ──
      const sectionsMap = new Map();
      boq.items.forEach((item) => {
        const sectionName = item.section || "Other Work";
        const subSectionName = item.subSection || "Main";
        if (!sectionsMap.has(sectionName)) {
          sectionsMap.set(sectionName, new Map());
        }
        const subMap = sectionsMap.get(sectionName);
        if (!subMap.has(subSectionName)) {
          subMap.set(subSectionName, []);
        }
        subMap.get(subSectionName).push({
          id: generateId(),
          itemName: item.itemName || "",
          description: item.description || "",
          unit: item.unit || "nos",
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
        });
      });

      // ── Convert to sections array with subSections ──
      const sectionsFromBOQ = Array.from(sectionsMap.entries()).map(([sectionName, subMap]) => ({
        id: generateId(),
        name: sectionName,
        subSections: Array.from(subMap.entries()).map(([subName, items]) => ({
          id: generateId(),
          name: subName,
          items: items,
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

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this BOQ? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/construction/boq/${id}`, headers);
      // refresh list
      const boqRes = await api.get("/construction/boq", headers);
      setBoqs(boqRes.data?.data || boqRes.data || []);
      toast.success("BOQ deleted successfully.");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete BOQ.");
    }
    setOpenMenuId(null);
  };

  const handleEdit = (boq) => {
    openModal(boq);
    setOpenMenuId(null);
  };

  // ── Submit BOQ ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProject) {
      toast.error("Please select a project.");
      return;
    }

    const validItems = [];
    sections.forEach((sec) => {
      sec.subSections.forEach((sub) => {
        sub.items.forEach((item) => {
          if (item.itemName && item.itemName.trim() !== "") {
            validItems.push({
              itemId: null,
              itemName: item.itemName,
              description: item.description,
              unit: item.unit,
              quantity: parseFloat(item.quantity) || 0,
              rate: parseFloat(item.rate) || 0,
              amount: parseFloat(item.amount) || 0,
              section: sec.name,
              subSection: sub.name,
              subSectionIndex: sub.id,
            });
          }
        });
      });
    });

    if (validItems.length === 0) {
      toast.error("Please add at least one BOQ item.");
      return;
    }

    const payload = {
      project: selectedProject.value,
      contractor: selectedContractor?.value || null,
      customer: selectedCustomer?.value || null, // ✅ include customer
      boqNumber,
      date: boqDate,
      status,
      remarks,
      items: validItems,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editBOQ) {
        const res = await api.put(`/construction/boq/${editBOQ._id}`, payload, headers);
        setBoqs(
          boqs.map((b) => (b._id === editBOQ._id ? res.data.data || res.data : b))
        );
        toast.success("BOQ updated successfully!");
      } else {
        const res = await api.post("/construction/boq", payload, headers);
        setBoqs([res.data.data || res.data, ...boqs]);
        toast.success("BOQ created successfully!");
      }
      closeModal();
    } catch (err) {
      console.error("❌ BOQ save failed:", err);
      toast.error(err.response?.data?.message || "Failed to save BOQ. Check console.");
    }
  };

  // ── Import BOQ from Excel ──
  const handleImport = async () => {
    if (!selectedProjectImport || !importFile) {
      toast.error("Please select project and upload file.");
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("projectId", selectedProjectImport.value);
    formData.append("file", importFile);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/construction/boq/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const refreshRes = await api.get("/construction/boq", headers);
        setBoqs(refreshRes.data.data || refreshRes.data || []);
        setIsImportModalOpen(false);
        setImportFile(null);
        setSelectedProjectImport(null);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Import failed. Check console.");
    } finally {
      setImporting(false);
    }
  };

  // ── Build options ──
  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id,
  }));

  const customerOptions = customers.map((c) => ({
    value: c._id,
    label: c.customerName || c.name || c.contactPersonName || c._id,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> Construction BOQ
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Project estimates with nested sections & manual item entry
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
            >
              <FaFileExcel size={12} /> Import Excel
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
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

                {loading ? (
                  
                  <tr>
                    <td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">Loading BOQs...</td>
                  </tr>
                ) : boqs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-10 text-center text-gray-400 italic">No BOQs found. Import from Excel or create manually.</td>
                  </tr>
                ) : (
                  boqs.map((b) => (
                    <tr key={b._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 text-gray-500 text-sm">{boqs.indexOf(b) + 1}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/admin/construction/boq/${b._id}`)}
                          className="font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {b.boqNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {b.project?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {b.contractor?.supplierName || b.contractor?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {b.customer?.customerName || b.customer?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-500">
                        {b.phase || "I"}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(b.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(
                          b.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === b._id ? null : b._id)}
                          className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"
                        >
                          <HiDotsVertical size={18} />
                        </button>
                        {openMenuId === b._id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                            <button
                              onClick={() => handleEdit(b)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                            >
                              <FaEdit size={14} className="text-indigo-500" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(b._id)}
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

      {/* ── BOQ Modal ── */}
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
                <span className="font-black text-indigo-600">
                  {formatCurrency(totalBOQAmount)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map((p) => ({ value: p._id, label: p.name }))}
                    value={selectedProject}
                    onChange={(s) => setSelectedProject(s)}
                    placeholder="Select Project..."
                    className="text-sm"
                    required
                  />
                </div>
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
                  <Lbl text="Customer" /> {/* ✅ NEW */}
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

              {/* ── Sections ── */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                    Sections & Sub-Sections
                  </p>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "ADD_SECTION" })}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
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
                    />
                  ))}
                </div>

                {/* ── Grand Total ── */}
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
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <FaFileExcel className="text-emerald-600" /> Import BOQ from Excel
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Lbl text="Select Project" req />
                <Select
                  options={projects.map((p) => ({ value: p._id, label: p.name }))}
                  value={selectedProjectImport}
                  onChange={setSelectedProjectImport}
                  placeholder="Choose project..."
                />
              </div>

              <div>
                <Lbl text="Upload Excel File" req />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Sheet should have: SR. NO., PARTICULARS, UNIT, RATE, TOTAL QUANTITY, AMOUNT
                  <br />
                  <span className="text-emerald-600">
                    ✓ Auto-detects Phase I/II • Auto-detects sections • Extracts taxes
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FaFileExcel size={12} /> Import
                    </>
                  )}
                </button>
              </div>
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
