"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { FaFileAlt, FaTrash, FaPlus } from "react-icons/fa";
import { createPortal } from "react-dom";

// ── Shared style helpers, matching Purchase Quotation's design system ──
const SectionCard = ({ icon: Icon, title, children, color = "indigo" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-${color}-100 overflow-hidden mb-6`}>
        <div className={`bg-${color}-50 px-5 py-3 border-b border-${color}-100 flex items-center gap-2`}>
            <Icon className={`text-${color}-500 text-sm`} />
            <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const ReadField = ({ label, value }) => (
    <div>
        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
        <div className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
            {value || "—"}
        </div>
    </div>
);

const fi = () => "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";


export default function NewPurchaseRequest() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("editId");

    const [company, setCompany] = useState(null);
    const [items, setItems] = useState([]);
    const [itemSearchIdx, setItemSearchIdx] = useState(null);
    const [itemSearch, setItemSearch] = useState("");
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        purpose: "Purchase",
        transactionDate: new Date().toISOString().slice(0, 10),
        requiredBy: "",
        priceList: "Standard Buying",
        remarks: "",
        status: "Draft",
    });
    const [lines, setLines] = useState([
        { itemId: "", itemCode: "", itemName: "", uom: "nos", quantity: "", weight: "", requiredBy: "" },
    ]);

    const inputRefs = useRef({});
    const fromRequestId = searchParams.get("fromRequestId");



    const pickItem = (idx, item) => {
        setLines((prev) => prev.map((l, i) =>
            i === idx
                ? { ...l, itemId: item._id, itemCode: item.itemCode, itemName: item.itemName, uom: item.uom || "nos", quantity: 1 }
                : l
        ));
        setItemSearch(""); setItemSearchIdx(null); setItems([]);
    };

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        axios.get("/api/company/profile", authHeaders)
            .then((res) => setCompany(res.data.company))
            .catch(() => toast.error("Failed to load company"));
    }, []);

    const [seriesPreview, setSeriesPreview] = useState("Loading...");

    useEffect(() => {
        axios.get("/api/purchase-request", { ...authHeaders, params: { peekSeries: true } })
            .then((res) => setSeriesPreview(res.data.preview))
            .catch(() => setSeriesPreview("PR-.YYYY.-"));
    }, []);

    useEffect(() => {
        if (!editId) return;
        axios.get("/api/purchase-request", { ...authHeaders, params: { id: editId } })
            .then((res) => {
                const d = res.data.data;
                setForm({
                    purpose: d.purpose, transactionDate: d.transactionDate?.slice(0, 10),
                    requiredBy: d.requiredBy?.slice(0, 10) || "", priceList: d.priceList,
                    remarks: d.remarks || "", status: d.status || "Draft",
                });
                setLines(d.items.map((i) => ({ ...i, requiredBy: i.requiredBy?.slice(0, 10) || "" })));
            })
            .catch(() => toast.error("Failed to load request"));
    }, [editId]);


    useEffect(() => {
        if (!fromRequestId || editId) return;
        const token = getToken();
        axios.get("/api/purchase-request", { headers: { Authorization: `Bearer ${token}` }, params: { id: fromRequestId } })
            .then((res) => {
                const pr = res.data.data;
                const mappedItems = (pr.items || []).map((it) => ({
                    ...initialState.items[0],
                    item: it.itemId,
                    itemCode: it.itemCode,
                    itemName: it.itemName,
                    unit: it.uom,
                    quantity: it.quantity,
                    unitPrice: it.estimatedRate || 0,   // just a starting point — vendor will override with a real quote
                    taxOption: "GST",
                }));
                setFormData((prev) => ({
                    ...prev,
                    purchaseRequest: pr._id,
                    refNumber: pr.requestNumber,
                    remarks: `Generated from ${pr.requestNumber} — ${pr.title}`,
                    items: mappedItems.length ? mappedItems : prev.items,
                }));
                toast.success(`Loaded items from ${pr.requestNumber}`);
            })
            .catch(() => toast.error("Failed to load purchase request"));
    }, [fromRequestId, editId]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (itemSearch.trim().length < 2) { setItems([]); return; }
            axios.get("/api/items", { ...authHeaders, params: { search: itemSearch, limit: 10 } })
                .then((res) => setItems(res.data.data || res.data.items || []))
                .catch(() => { });
        }, 300);
        return () => clearTimeout(t);
    }, [itemSearch]);

    const updateLine = (idx, field, value) =>
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));



    const addRow = () => setLines((p) => [...p, { itemId: "", itemCode: "", itemName: "", uom: "nos", quantity: "", weight: "", requiredBy: "" }]);
    const removeRow = (idx) => setLines((p) => p.filter((_, i) => i !== idx));

    const handleSave = async () => {
        const validLines = lines.filter((l) => l.itemId && l.quantity);
        if (validLines.length === 0) { toast.error("Add at least one item with a quantity"); return; }
        setSaving(true);
        try {
            const payload = {
                purpose: form.purpose, transactionDate: form.transactionDate, requiredBy: form.requiredBy || undefined,
                priceList: form.priceList, remarks: form.remarks, status: form.status,
                items: validLines.map((l) => ({
                    itemId: l.itemId, itemCode: l.itemCode, itemName: l.itemName, uom: l.uom,
                    quantity: Number(l.quantity), weight: Number(l.weight) || 0,
                    estimatedRate: Number(l.estimatedRate) || 0,
                    requiredBy: l.requiredBy || undefined,
                })),
            };
            const res = editId
                ? await axios.put(`/api/purchase-request/${editId}`, payload, authHeaders)
                : await axios.post("/api/purchase-request", payload, authHeaders);
            toast.success(editId ? "Updated" : "Purchase Request created");
            router.push(`/admin/purchase-request-view/view/${res.data.data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-6">
                    {editId ? "Edit Purchase Request" : "Create Purchase Request"}
                </h1>

                <SectionCard icon={FaFileAlt} title="Request Details" color="indigo">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReadField label="Series" value={seriesPreview} />
                        <div>
                            <Lbl text="Transaction Date" req />
                            <input type="date" className={fi()} value={form.transactionDate}
                                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} />
                        </div>
                        <div>
                            <Lbl text="Purpose" req />
                            <select className={fi()} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                                {["Purchase", "Material Transfer", "Material Issue", "Manufacture", "Customer Provided"].map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Lbl text="Status" req />
                            <select className={fi()} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                {["Draft", "Pending", "Ordered", "Partially Ordered", "Received", "Cancelled"].map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Lbl text="Required By" />
                            <input type="date" className={fi()} value={form.requiredBy}
                                onChange={(e) => setForm({ ...form, requiredBy: e.target.value })} />
                        </div>
                        <ReadField label="Company" value={company?.companyName} />
                        <div>
                            <Lbl text="Price List" />
                            <input className={fi()} value={form.priceList} onChange={(e) => setForm({ ...form, priceList: e.target.value })} />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard icon={FaFileAlt} title="Items" color="indigo">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-indigo-600">
                                    {["No.", "Item Code *", "Item Name", "UOM", "Required By", "Quantity *", "Weight", ""].map((h) => (
                                        <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-white">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, idx) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="px-3 py-2 text-xs text-gray-400 font-mono">{idx + 1}</td>
                                        <td className="px-3 py-2 text-sm text-gray-600 font-mono">
                                            {line.itemCode || "—"}
                                        </td>
                                        <td className="px-3 py-2 relative">
                                            <input
                                                ref={(el) => (inputRefs.current[idx] = el)}
                                                className={fi()}
                                                value={line.itemId ? line.itemName : itemSearch}
                                                onChange={(e) => {
                                                    setItemSearchIdx(idx);
                                                    setItemSearch(e.target.value);
                                                    updateLine(idx, "itemId", "");
                                                }}
                                                placeholder="Search by item name"
                                            />
                                            {itemSearchIdx === idx && itemSearch && items.length > 0 && !line.itemId && inputRefs.current[idx] &&
                                                createPortal(
                                                    <div
                                                        style={{
                                                            position: "fixed",
                                                            top: inputRefs.current[idx].getBoundingClientRect().bottom + 4,
                                                            left: inputRefs.current[idx].getBoundingClientRect().left,
                                                            width: Math.max(inputRefs.current[idx].getBoundingClientRect().width, 240),
                                                        }}
                                                        className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto"
                                                    >
                                                        {items.map((it) => (
                                                            <div key={it._id} onClick={() => pickItem(idx, it)}
                                                                className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm">
                                                                <span className="font-mono text-indigo-600 text-xs">{it.itemCode}</span> — {it.itemName}
                                                            </div>
                                                        ))}
                                                    </div>,
                                                    document.body
                                                )}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-500">{line.uom}</td>
                                        <td className="px-3 py-2">
                                            <input type="date" className={fi()} value={line.requiredBy} onChange={(e) => updateLine(idx, "requiredBy", e.target.value)} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min="1"
                                                disabled={!line.itemId}
                                                className={`${fi()} ${!line.itemId ? "bg-gray-50 text-gray-300 cursor-not-allowed" : ""}`}
                                                value={line.itemId ? line.quantity : ""}
                                                placeholder={line.itemId ? "" : "Select item first"}
                                                onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" className={fi()} value={line.weight} onChange={(e) => updateLine(idx, "weight", e.target.value)} />
                                        </td>
                                        <td className="px-3 py-2">
                                            {lines.length > 1 && (
                                                <button onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-600"><FaTrash size={12} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addRow} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 mt-3">
                        <FaPlus size={10} /> Add Item Row
                    </button>
                </SectionCard>

                <SectionCard icon={FaFileAlt} title="Remarks" color="indigo">
                    <textarea className={fi()} rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </SectionCard>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/purchase-request-view")}
                        className="px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? "Saving..." : editId ? "Update" : "Submit"}
                    </button>
                </div>
            </div>
        </div>
    );
}