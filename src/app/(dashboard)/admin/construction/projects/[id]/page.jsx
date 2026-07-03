"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaProjectDiagram,
  FaCalendarAlt,
  FaUserTie,
  FaMapMarkerAlt,
  FaFileInvoice,
  FaBoxes,
  FaFileContract,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [boqs, setBoqs] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [consumption, setConsumption] = useState([]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Fetch project details
        const projRes = await api.get(`/construction/projects/${id}`, headers);
        setProject(projRes.data.data || projRes.data);

        // Fetch BOQs for this project
        const boqRes = await api.get(`/construction/boq?projectId=${id}`, headers);
        setBoqs(boqRes.data.data || boqRes.data || []);

        // Fetch Work Orders for this project
        const woRes = await api.get(`/construction/work-orders?projectId=${id}`, headers);
        setWorkOrders(woRes.data.data || woRes.data || []);

        // Fetch Material Consumption for this project
        const consRes = await api.get(`/construction/material-consumption?projectId=${id}`, headers);
        setConsumption(consRes.data.data || consRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, router]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <FaProjectDiagram className="text-indigo-600" /> {project.name}
          </h1>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
            <p className="text-lg font-bold text-gray-800 capitalize">{project.status}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project Type</p>
            <p className="text-lg font-bold text-gray-800 capitalize">{project.projectType || "—"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Priority</p>
            <p className="text-lg font-bold text-gray-800 capitalize">{project.priority}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date</p>
            <p className="text-lg font-bold text-gray-800">
              {project.dueDate ? new Date(project.dueDate).toLocaleDateString("en-GB") : "—"}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Site Address</p>
            <p className="text-sm text-gray-700">{project.siteAddress || "Not specified"}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total BOQ Amount</p>
            <p className="text-lg font-bold text-indigo-600">
              {formatCurrency(boqs.reduce((sum, b) => sum + (b.totalAmount || 0), 0))}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{boqs.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">BOQs</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{workOrders.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Work Orders</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{consumption.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Consumption Records</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push(`/admin/construction/boq?projectId=${id}`)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all text-left"
          >
            <FaFileInvoice className="text-indigo-600 text-xl mb-2" />
            <p className="font-bold text-gray-800">View BOQs</p>
            <p className="text-xs text-gray-400">{boqs.length} BOQs for this project</p>
          </button>
          <button
            onClick={() => router.push(`/admin/construction/work-orders?projectId=${id}`)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all text-left"
          >
            <FaFileContract className="text-indigo-600 text-xl mb-2" />
            <p className="font-bold text-gray-800">View Work Orders</p>
            <p className="text-xs text-gray-400">{workOrders.length} work orders</p>
          </button>
          <button
            onClick={() => router.push(`/admin/construction/material-consumption?projectId=${id}`)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all text-left"
          >
            <FaBoxes className="text-indigo-600 text-xl mb-2" />
            <p className="font-bold text-gray-800">View Consumption</p>
            <p className="text-xs text-gray-400">{consumption.length} consumption records</p>
          </button>
        </div>
      </div>
    </div>
  );
}