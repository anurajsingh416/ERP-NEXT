"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaArrowLeft,
  FaSave,
  FaTrash,
  FaPlus,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast } from "react-toastify";

let idCounter = 0;
const generateId = () => ++idCounter;

export default function NewBidPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tender, setTender] = useState(null);
  const [boqItems, setBoqItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Bid items: each has boqItemId, quotedRate
  const [bidItems, setBidItems] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // ─── Fetch Tender & BOQ & Vendors ──────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Fetch tender details
        const tenderRes = await api.get(`/construction/tenders/${id}`, headers);
        const tenderData = tenderRes.data.data || tenderRes.data;
        setTender(tenderData);

        // Fetch BOQ items
        if (tenderData.boq) {
          const boqRes = await api.get(`/construction/boq?id=${tenderData.boq._id}`, headers);
          const boqData = boqRes.data.data || boqRes.data;
          const items = boqData.items || [];
          setBoqItems(items);

          // Initialize bid items from BOQ
          const initialBidItems = items.map((item) => ({
            _id: generateId(),
            boqItemId: item._id,
            itemName: item.itemName,
            unit: item.unit,
            quantity: item.quantity || 0,
            quotedRate: 0,
            amount: 0,
          }));
          setBidItems(initialBidItems);
        }

        // Fetch vendors (suppliers)
        const vendorRes = await api.get("/suppliers", headers);
        const vendorData = vendorRes.data.data || vendorRes.data || [];
        setVendors(vendorData);

        setLoading(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data");
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ─── Handle quantity change ────────────────────────────────────────
  const handleQuotedRateChange = (itemId, value) => {
    const updated = bidItems.map((item) => {
      if (item._id !== itemId) return item;
      const rate = parseFloat(value) || 0;
      const amount = rate * item.quantity;
      return { ...item, quotedRate: rate, amount };
    });
    setBidItems(updated);

    // Clear validation error for this item
    const errors = { ...validationErrors };
    delete errors[itemId];
    setValidationErrors(errors);
  };

  // ─── Validate ──────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    let hasError = false;

    if (!selectedVendor) {
      toast.error("Please select a vendor.");
      return false;
    }

    bidItems.forEach((item) => {
      if (item.quotedRate <= 0) {
        errors[item._id] = "Quoted rate must be > 0";
        hasError = true;
      }
    });

    setValidationErrors(errors);
    return !hasError;
  };

  // ─── Submit Bid ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix validation errors.");
      return;
    }

    const payload = {
      vendor: selectedVendor.value,
      items: bidItems.map((item) => ({
        boqItemId: item.boqItemId,
        quotedRate: item.quotedRate,
      })),
      remarks: "",
    };

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.post(`/construction/tenders/${id}/bids`, payload, headers);
      toast.success("Bid submitted successfully!");
      router.push(`/admin/construction/tenders/${id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit bid.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  const totalAmount = bidItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const vendorOptions = vendors.map((v) => ({
    value: v._id,
    label: v.supplierName || v.name || v.contactPersonName || v._id,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Tender not found.</div>
      </div>
    );
  }

  // Check if tender is open for bids
  const isOpenForBids = tender.status === "published" && new Date() < new Date(tender.submissionDeadline);

  if (!isOpenForBids) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle className="text-4xl text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">Bidding is Closed</h3>
            <p className="text-sm text-gray-400 mt-2">
              {tender.status !== "published"
                ? "This tender is not open for bidding."
                : "The submission deadline has passed."}
            </p>
            <button
              onClick={() => router.push(`/admin/construction/tenders/${id}`)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
            >
              Back to Tender
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              New Bid – {tender.tenderNumber}
            </h1>
            <p className="text-sm text-gray-500">{tender.title}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">Deadline</p>
            <p className="text-sm font-bold text-red-600">
              {new Date(tender.submissionDeadline).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Vendor Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Select Vendor <span className="text-red-500">*</span>
          </label>
          <Select
            options={vendorOptions}
            value={selectedVendor}
            onChange={setSelectedVendor}
            placeholder="Search vendor..."
            className="text-sm"
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

        {/* Items Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-gray-800">BOQ Items</h2>
              <span className="text-xs text-gray-400">{bidItems.length} items</span>
            </div>
            <div className="text-sm font-bold">
              Total Bid: <span className="text-indigo-700">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          <div className="overflow-x-auto p-6">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Item</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Unit</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Quoted Rate (₹)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bidItems.map((item, idx) => {
                  const hasError = validationErrors[item._id];
                  return (
                    <tr key={item._id} className="hover:bg-indigo-50/20 transition-all">
                      <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{item.itemName}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className={`w-24 px-2 py-1 border rounded text-xs bg-white focus:outline-none text-center ${
                            hasError
                              ? "border-red-400 focus:ring-red-500"
                              : "border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                          }`}
                          value={item.quotedRate || ""}
                          onChange={(e) => handleQuotedRateChange(item._id, e.target.value)}
                          placeholder="Rate"
                        />
                        {hasError && (
                          <span className="block text-red-500 text-[9px] mt-0.5">
                            <FaExclamationTriangle className="inline mr-0.5" size={10} />
                            {validationErrors[item._id]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  );
                })}
                {bidItems.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-400 italic">
                      No items in BOQ.
                    </td>
                  </tr>
                )}
                {bidItems.length > 0 && (
                  <tr className="bg-indigo-50/50 font-bold">
                    <td colSpan="5" className="px-4 py-3 text-right text-xs text-gray-700 uppercase tracking-wider">
                      Grand Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-indigo-700">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => router.push(`/admin/construction/tenders/${id}`)}
            className="px-6 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave size={14} />}
            {saving ? "Submitting..." : "Submit Bid"}
          </button>
        </div>
      </div>
    </div>
  );
}