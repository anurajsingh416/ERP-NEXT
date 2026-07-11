"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

export default function TenderCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [boqs, setBoqs] = useState([]);
  const [projects, setProjects] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    tenderNumber: "",
    title: "",
    description: "",
    boq: null,
    project: null,
    preQualification: "",
    submissionDeadline: "",
    evaluationCriteria: {
      technicalWeight: 40,
      commercialWeight: 60,
    },
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [boqRes, projRes] = await Promise.all([
          api.get("/construction/boq", headers),
          api.get("/construction/projects", headers),
        ]);
        setBoqs(boqRes.data.data || boqRes.data || []);
        setProjects(projRes.data.data || projRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load options");
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "technicalWeight" || name === "commercialWeight") {
      setFormData(prev => ({
        ...prev,
        evaluationCriteria: { ...prev.evaluationCriteria, [name]: parseFloat(value) || 0 },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name, option) => {
    setFormData(prev => ({ ...prev, [name]: option }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.boq || !formData.project || !formData.submissionDeadline) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        tenderNumber: formData.tenderNumber || undefined,
        title: formData.title,
        description: formData.description,
        boq: formData.boq.value,
        project: formData.project.value,
        preQualification: formData.preQualification.split(",").map(s => s.trim()).filter(Boolean),
        submissionDeadline: formData.submissionDeadline,
        evaluationCriteria: formData.evaluationCriteria,
      };
      const res = await api.post("/construction/tenders", payload, headers);
      toast.success("Tender created!");
      router.push(`/admin/construction/tenders/${res.data.data._id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create tender");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <FaArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            Create Tender
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Tender Number <span className="text-xs text-gray-400">(optional, auto-generated)</span>
              </label>
              <input
                type="text"
                name="tenderNumber"
                value={formData.tenderNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                placeholder="Leave blank for auto"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Submission Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="submissionDeadline"
                value={formData.submissionDeadline}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              required
              placeholder="e.g. Construction of Bridge"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              placeholder="Detailed description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                BOQ <span className="text-red-500">*</span>
              </label>
              <Select
                options={boqs.map(b => ({ value: b._id, label: b.boqNumber }))}
                value={formData.boq}
                onChange={(opt) => handleSelectChange("boq", opt)}
                placeholder="Select BOQ..."
                className="text-sm"
                isClearable
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Project <span className="text-red-500">*</span>
              </label>
              <Select
                options={projects.map(p => ({ value: p._id, label: p.name }))}
                value={formData.project}
                onChange={(opt) => handleSelectChange("project", opt)}
                placeholder="Select Project..."
                className="text-sm"
                isClearable
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Pre-Qualification Criteria (comma separated)
            </label>
            <input
              type="text"
              name="preQualification"
              value={formData.preQualification}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              placeholder="e.g. ISO 9001, Past experience >5 years, Turnover >10M"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Evaluation Weights
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500">Technical Weight (%)</label>
                <input
                  type="number"
                  name="technicalWeight"
                  value={formData.evaluationCriteria.technicalWeight}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Commercial Weight (%)</label>
                <input
                  type="number"
                  name="commercialWeight"
                  value={formData.evaluationCriteria.commercialWeight}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Total should be 100%.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave size={14} />}
              {loading ? "Creating..." : "Create Tender"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}