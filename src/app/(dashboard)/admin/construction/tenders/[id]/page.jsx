"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaFileContract,
  FaEye,
  FaEdit,
  FaTrash,
  FaPrint,
  FaFileExport,
  FaPlus,
  FaUsers,
  FaCheckCircle,
  FaClock,
  FaUserCheck,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function TenderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [bids, setBids] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [interestedVendors, setInterestedVendors] = useState([]);
  const [awardPreview, setAwardPreview] = useState(null);

  // ─── Helper: Get vendor display name ──────────────────────────────
  const getVendorName = (vendor) => {
    if (!vendor) return "—";
    return vendor.supplierName || vendor.name || vendor.contactPersonName || "—";
  };

  // ─── Fetch Data ──────────────────────────────────────────────────────
  const fetchTender = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/construction/tenders/${id}`, headers);
      setTender(res.data.data);
      setInterestedVendors(res.data.data.interestedVendors || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tender");
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/construction/tenders/${id}/bids`, headers);
      setBids(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTimeline = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/construction/tenders/${id}/timeline`, headers);
      setTimeline(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAwardPreview = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/construction/tenders/${id}/award-preview`, headers);
      setAwardPreview(res.data.data);
      toast.info("Work order preview loaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load award preview");
    }
  };

  useEffect(() => {
    fetchTender();
    fetchBids();
    fetchTimeline();
  }, [id]);

  // ─── Re‑fetch when tab changes to award ──────────────────────────
  useEffect(() => {
    if (activeTab === "award") {
      fetchAwardPreview();
    }
  }, [activeTab]);

  // ─── Actions ────────────────────────────────────────────────────────
  const handlePublish = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const action = tender.status === "published" ? "unpublish" : "publish";
      await api.post(`/construction/tenders/${id}/publish`, { action }, headers);
      toast.success(`Tender ${action === "publish" ? "published" : "unpublished"}`);
      fetchTender();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  const handleExport = () => {
    window.open(`/api/construction/tenders/${id}/export?format=csv`, "_blank");
  };

  // ─── Helpers ─────────────────────────────────────────────────────────
  const getStatusColor = (status) => {
    const map = {
      draft: "bg-gray-100 text-gray-600",
      published: "bg-blue-100 text-blue-700",
      closed: "bg-amber-100 text-amber-700",
      awarded: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  // ─── Bid status checks for UI messages ─────────────────────────────
  const hasBids = bids.length > 0;
  const submittedBids = bids.filter((b) => b.status === "submitted");
  const evaluatedBids = bids.filter((b) => b.status === "evaluated");
  const hasSubmittedBids = submittedBids.length > 0;
  const hasEvaluatedBids = evaluatedBids.length > 0;
  const awardedBid = bids.find((b) => b.status === "awarded");

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileContract className="text-indigo-600" /> {tender.tenderNumber}
            </h1>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(
                tender.status
              )}`}
            >
              {tender.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tender.status === "draft" && (
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md"
              >
                <FaCheckCircle size={14} /> Publish
              </button>
            )}
            {tender.status === "published" && (
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl text-sm font-bold hover:bg-gray-700 shadow-md"
              >
                <FaClock size={14} /> Unpublish
              </button>
            )}
            <button
              onClick={() => router.push(`/admin/construction/tenders/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md"
            >
              <FaEdit size={14} /> Edit
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md"
            >
              <FaFileExport size={14} /> Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {["overview", "bids", "evaluation", "award", "timeline"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* ─── Tab: Overview ─────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold">{tender.title}</h3>
                <p className="text-gray-600 mt-2">{tender.description || "No description"}</p>
                <div className="mt-4 space-y-1 text-sm">
                  <p>
                    <span className="font-bold">Project:</span> {tender.project?.name}
                  </p>
                  <p>
                    <span className="font-bold">BOQ:</span> {tender.boq?.boqNumber}
                  </p>
                  <p>
                    <span className="font-bold">Submission Deadline:</span>{" "}
                    {new Date(tender.submissionDeadline).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-bold">Evaluation:</span> Technical{" "}
                    {tender.evaluationCriteria?.technicalWeight || 40}% / Commercial{" "}
                    {tender.evaluationCriteria?.commercialWeight || 60}%
                  </p>
                </div>
                <div className="mt-4">
                  <h4 className="font-bold text-sm uppercase text-gray-400">
                    Pre-Qualification Criteria
                  </h4>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-600">
                    {tender.preQualification?.length ? (
                      tender.preQualification.map((c, i) => <li key={i}>{c}</li>)
                    ) : (
                      <li>None specified</li>
                    )}
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase text-gray-400 mb-2">
                  Interested Vendors
                </h4>
                {interestedVendors.length === 0 ? (
                  <p className="text-gray-400 text-sm">No vendors registered interest yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {interestedVendors.map((v) => (
                      <li key={v._id} className="flex items-center gap-2 text-sm">
                        {getVendorName(v.vendor)}
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full ${
                            v.status === "qualified"
                              ? "bg-emerald-100 text-emerald-700"
                              : v.status === "disqualified"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {v.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab: Bids ──────────────────────────────────────────────── */}
        {activeTab === "bids" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Bids ({bids.length})</h3>
              {tender.status === "published" && (
                <button
                  onClick={() => router.push(`/admin/construction/tenders/${id}/bids/new`)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                >
                  <FaPlus size={10} /> New Bid
                </button>
              )}
            </div>

            {!hasBids ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUsers className="text-4xl text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No bids submitted yet.</p>
                <p className="text-xs text-gray-400 mt-1">Vendors will submit their bids here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Vendor</th>
                      <th className="px-4 py-2 text-right">Total Amount</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((b) => (
                      <tr key={b._id} className="border-b border-gray-100">
                        <td className="px-4 py-2">{getVendorName(b.vendor)}</td>
                        <td className="px-4 py-2 text-right font-bold">
                          ₹{b.totalAmount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              b.status === "submitted"
                                ? "bg-blue-100 text-blue-700"
                                : b.status === "evaluated"
                                ? "bg-amber-100 text-amber-700"
                                : b.status === "awarded"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() =>
                              router.push(`/admin/construction/tenders/${id}/bids/${b._id}`)
                            }
                            className="text-indigo-600 hover:underline text-xs"
                          >
                            <FaEye className="inline mr-1" size={12} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Evaluation ────────────────────────────────────────── */}
        {activeTab === "evaluation" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-lg mb-4">Evaluate Bids</h3>

            {!hasBids ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaClock className="text-4xl text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No bids to evaluate.</p>
                <p className="text-xs text-gray-400 mt-1">Wait for vendors to submit bids.</p>
              </div>
            ) : !hasSubmittedBids ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCheckCircle className="text-4xl text-amber-300" />
                </div>
                <p className="text-gray-400 text-sm font-medium">All bids have been evaluated.</p>
                <p className="text-xs text-gray-400 mt-1">Move to the "Award" tab to finalize.</p>
              </div>
            ) : (
              <div>
                {bids
                  .filter((b) => b.status === "submitted")
                  .map((b) => (
                    <div
                      key={b._id}
                      className="border border-gray-200 rounded-xl p-4 mb-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">{getVendorName(b.vendor)}</p>
                          <p className="text-sm text-gray-500">
                            Total: ₹{b.totalAmount?.toLocaleString()}
                          </p>
                          {b.evaluation && b.evaluation.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500">
                              {b.evaluation.map((ev, idx) => (
                                <span key={idx} className="inline-block mr-2">
                                  {ev.criterion}: {ev.score}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            Overall: {b.overallScore?.toFixed(2) || "—"}
                          </span>
                          <button
                            onClick={() =>
                              router.push(`/admin/construction/tenders/${id}/evaluate/${b._id}`)
                            }
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                          >
                            Evaluate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Award ──────────────────────────────────────────────── */}
        {activeTab === "award" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-lg mb-4">Award Tender</h3>

            {tender.status === "awarded" ? (
              <div className="p-4 bg-emerald-50 rounded-xl text-emerald-700 font-bold">
                Tender awarded to {getVendorName(awardedBid?.vendor)}.
                <button
                  onClick={() => router.push(`/admin/construction/work-orders`)}
                  className="ml-4 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                >
                  View Work Order
                </button>
              </div>
            ) : tender.status !== "published" && tender.status !== "closed" ? (
              <p className="text-gray-500">Tender must be published or closed to award.</p>
            ) : !hasEvaluatedBids ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUserCheck className="text-4xl text-red-300" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No eligible bids for award.</p>
                <p className="text-xs text-gray-400 mt-1">
                  {hasBids
                    ? "Evaluate bids first, then award the best one."
                    : "No bids have been submitted yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bids
                  .filter((b) => b.status === "evaluated")
                  .map((b) => (
                    <div
                      key={b._id}
                      className="flex justify-between items-center border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                    >
                      <div>
                        <p className="font-bold">{getVendorName(b.vendor)}</p>
                        <p className="text-sm">Total: ₹{b.totalAmount?.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          Overall Score: {b.overallScore?.toFixed(2) || "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (!confirm(`Award tender to ${getVendorName(b.vendor)}?`)) return;
                          (async () => {
                            try {
                              const token = localStorage.getItem("token");
                              const headers = { headers: { Authorization: `Bearer ${token}` } };
                              await api.post(
                                `/construction/tenders/${id}/award`,
                                { bidId: b._id },
                                headers
                              );
                              toast.success("Tender awarded and work order created!");
                              fetchTender();
                              fetchBids();
                            } catch (err) {
                              console.error(err);
                              toast.error(err.response?.data?.message || "Award failed");
                            }
                          })();
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700"
                      >
                        Award
                      </button>
                    </div>
                  ))}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      fetchAwardPreview();
                      toast.info("Work order preview refreshed");
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                  >
                    Preview Work Order
                  </button>
                  {awardPreview && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <h4 className="font-bold">Work Order Preview</h4>
                      <p className="text-sm">WO: {awardPreview.workOrderNumber}</p>
                      <p className="text-sm">Total: ₹{awardPreview.total?.toLocaleString()}</p>
                      <p className="text-sm">Vendor: {getVendorName(awardPreview.contractor)}</p>
                      <p className="text-xs text-gray-500 mt-2">{awardPreview.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Timeline ───────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-lg mb-4">Activity Timeline</h3>
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <p className="text-gray-400">No activity yet.</p>
              ) : (
                timeline.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 border-b border-gray-100 pb-3"
                  >
                    <div className="w-24 text-xs text-gray-400 pt-0.5">
                      {new Date(event.date).toLocaleString()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase">
                        {event.event}
                      </span>
                      <p className="text-sm text-gray-700">{event.description}</p>
                      <p className="text-xs text-gray-400">{event.user?.name || "System"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}