"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaArrowLeft, FaSave, FaPlus, FaTrash, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

export default function EvaluateBidPage() {
  const { id, bidId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bid, setBid] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [newCriterion, setNewCriterion] = useState("");
  const [newScore, setNewScore] = useState("");
  const [newRemarks, setNewRemarks] = useState("");

  useEffect(() => {
    const fetchBid = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/construction/tenders/${id}/bids/${bidId}`, headers);
        const bidData = res.data.data || res.data;
        setBid(bidData);
        setEvaluations(bidData.evaluation || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load bid");
      } finally {
        setLoading(false);
      }
    };
    fetchBid();
  }, [id, bidId]);

  const addCriterion = () => {
    if (!newCriterion.trim() || !newScore) {
      toast.warning("Please enter criterion and score");
      return;
    }
    setEvaluations([
      ...evaluations,
      {
        criterion: newCriterion.trim(),
        score: parseFloat(newScore) || 0,
        remarks: newRemarks || "",
      },
    ]);
    setNewCriterion("");
    setNewScore("");
    setNewRemarks("");
  };

  const removeCriterion = (index) => {
    setEvaluations(evaluations.filter((_, i) => i !== index));
  };

  const updateCriterion = (index, field, value) => {
    const updated = [...evaluations];
    updated[index][field] = field === "score" ? parseFloat(value) || 0 : value;
    setEvaluations(updated);
  };

  const handleSubmit = async () => {
    if (evaluations.length === 0) {
      toast.error("Add at least one evaluation criterion");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { evaluations };
      const res = await api.post(
        `/construction/tenders/${id}/evaluate/${bidId}`,
        payload,
        headers
      );
      toast.success("Bid evaluated successfully!");
      router.push(`/admin/construction/tenders/${id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Evaluation failed");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Bid not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Evaluate Bid
            </h1>
            <p className="text-sm text-gray-500">
              {bid.vendor?.name} — Total: {formatCurrency(bid.totalAmount)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-lg mb-4">Evaluation Criteria</h3>

          <div className="space-y-4">
            {evaluations.map((ev, idx) => (
              <div key={idx} className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <input
                  type="text"
                  className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={ev.criterion}
                  onChange={(e) => updateCriterion(idx, "criterion", e.target.value)}
                  placeholder="Criterion name"
                />
                <input
                  type="number"
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                  value={ev.score || ""}
                  onChange={(e) => updateCriterion(idx, "score", e.target.value)}
                  placeholder="Score"
                  min="0"
                  max="100"
                />
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={ev.remarks || ""}
                  onChange={(e) => updateCriterion(idx, "remarks", e.target.value)}
                  placeholder="Remarks (optional)"
                />
                <button
                  onClick={() => removeCriterion(idx)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <FaTrash size={16} />
                </button>
              </div>
            ))}

            {/* Add new criterion */}
            <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                placeholder="New criterion"
              />
              <input
                type="number"
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="Score"
                min="0"
                max="100"
              />
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newRemarks}
                onChange={(e) => setNewRemarks(e.target.value)}
                placeholder="Remarks"
              />
              <button
                onClick={addCriterion}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
              >
                <FaPlus size={12} /> Add
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FaSave size={14} />
              )}
              {saving ? "Saving..." : "Save Evaluation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}