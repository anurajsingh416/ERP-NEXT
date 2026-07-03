"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { HiDotsVertical } from "react-icons/hi";
import {
  FaProjectDiagram,
  FaPlus,
  FaCalendarAlt,
  FaUserFriends,
  FaRegAddressCard,
  FaMoneyBillWave,
  FaCheck,
  FaHardHat,
  FaClipboardList,
  FaPercent,
} from "react-icons/fa";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [projectedStartDate, setProjectedStartDate] = useState("");
  const [projectedEndDate, setProjectedEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("low");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("active");
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [customer, setCustomer] = useState("");
  const [salesOrder, setSalesOrder] = useState("");
  const [costingBilling, setCostingBilling] = useState("");
  const [estimatedCosting, setEstimatedCosting] = useState("");

  // ---- CONSTRUCTION FIELDS (only those we keep) ----
  const [projectType, setProjectType] = useState("residential");
  const [siteAddress, setSiteAddress] = useState("");
  const [boqReference, setBoqReference] = useState("");
  const [billingType, setBillingType] = useState("fixed");
  const [retentionPercentage, setRetentionPercentage] = useState("");
  const [progressMilestones, setProgressMilestones] = useState("");
  const [laborBudget, setLaborBudget] = useState("");

  // ---- NO SUPPLIERS / CONTRACTOR ----

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [uRes, pRes, wRes, cRes, soRes] = await Promise.all([
          api.get("/company/users", headers),
          api.get("/project/projects", headers),
          api.get("/project/workspaces", headers),
          api.get("/customers", headers),
          api.get("/sales-order", headers),
        ]);

        const employees = uRes.data.filter((user) => user.roles?.includes("Employee"));
        setUsers(employees);
        setProjects(pRes.data);
        setWorkspaces(wRes.data);
        setCustomers(cRes.data.data || []);
        setSalesOrders(soRes.data.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to fetch data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSalesOrders = customer
    ? salesOrders.filter((so) => so.customer === customer.value)
    : [];

  const openModal = (project = null) => {
    setEditProject(project);
    setName(project ? project.name : "");
    setWorkspaceId(project ? project.workspace?._id : "");
    setStatus(project ? project.status : "active");
    setDescription(project ? project.description : "");
    setDueDate(project?.dueDate ? project.dueDate.split("T")[0] : "");
    setProjectedStartDate(project?.projectedStartDate ? project.projectedStartDate.split("T")[0] : "");
    setProjectedEndDate(project?.projectedEndDate ? project.projectedEndDate.split("T")[0] : "");
    setStartDate(project?.startDate ? project.startDate.split("T")[0] : "");
    setEndDate(project?.endDate ? project.endDate.split("T")[0] : "");
    setPriority(project ? project.priority : "low");
    setAssignees(project?.members ? project.members.map((m) => m._id || m) : []);
    setCustomer(
      project?.customer
        ? { value: project.customer._id, label: project.customer.customerName }
        : ""
    );
    setSalesOrder(
      project?.salesOrder
        ? { value: project.salesOrder._id, label: project.salesOrder.documentNumberOrder }
        : ""
    );
    setCostingBilling(project ? project.costingBilling : "");
    setEstimatedCosting(project ? project.estimatedCosting : "");

    // Construction fields
    setProjectType(project?.projectType || "residential");
    setSiteAddress(project?.siteAddress || "");
    setBoqReference(project?.boqReference || "");
    setBillingType(project?.billingType || "fixed");
    setRetentionPercentage(project?.retentionPercentage || "");
    setProgressMilestones(project?.progressMilestones || "");
    setLaborBudget(project?.laborBudget || "");

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditProject(null);
    setName("");
    setDescription("");
    setDueDate("");
    setProjectedStartDate("");
    setProjectedEndDate("");
    setStartDate("");
    setEndDate("");
    setPriority("low");
    setAssignees([]);
    setCustomer("");
    setSalesOrder("");
    setCostingBilling("");
    setEstimatedCosting("");
    setProjectType("residential");
    setSiteAddress("");
    setBoqReference("");
    setBillingType("fixed");
    setRetentionPercentage("");
    setProgressMilestones("");
    setLaborBudget("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      workspace: workspaceId,
      status,
      description,
      dueDate,
      projectedStartDate,
      projectedEndDate,
      startDate,
      endDate,
      priority,
      members: assignees,
      customer: customer?.value || null,
      salesOrder: salesOrder?.value || null,
      costingBilling,
      estimatedCosting,
      projectType,
      siteAddress,
      boqReference,
      billingType,
      retentionPercentage: retentionPercentage ? parseFloat(retentionPercentage) : 0,
      progressMilestones,
      laborBudget: laborBudget ? parseFloat(laborBudget) : 0,
    };

    try {
      if (editProject) {
        const res = await api.put(`/project/projects/${editProject._id}`, payload);
        setProjects((prev) => prev.map((p) => (p._id === editProject._id ? res.data : p)));
        toast.success("✅ Project updated successfully!");
      } else {
        const res = await api.post("/project/projects", payload);
        setProjects([...projects, res.data]);
        toast.success("✅ Project created successfully!");
      }
      closeModal();
    } catch (err) {
      console.error("❌ Project save failed:", err);
      toast.error(err.response?.data?.message || "Failed to save project. Please try again.");
    }
  };

  // --- UI Helpers ---
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const fi =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const PriorityBadge = ({ level }) => {
    const colors = {
      critical: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-blue-100 text-blue-700",
      low: "bg-emerald-100 text-emerald-700",
    };
    return (
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colors[level] || colors.low}`}>
        {level}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaProjectDiagram className="text-indigo-600" /> Projects
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage deliverables, costing, and project manager assignment
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> New Project
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Project Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Environment
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Project Manager
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Timeline
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                      Syncing project data...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                      No projects found. Click "New Project" to create one.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-indigo-50/20 transition-colors"
                    >
                      <td
                        className="px-6 py-4 font-bold text-indigo-600 hover:underline cursor-pointer"
                        onClick={() => router.push(`/admin/project/projects/${p._id}`)}
                      >
                        {p.name}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-500 uppercase text-[11px] tracking-tight">
                        {p.workspace?.name || "Unassigned"}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {p.members?.length > 0
                          ? p.members.map((m) => m.name).join(", ")
                          : "Not Assigned"}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        <div className="flex flex-col">
                          <span className="font-bold">
                            {p.dueDate
                              ? new Date(p.dueDate).toLocaleDateString("en-GB")
                              : "No Deadline"}
                          </span>
                          <span className="text-[10px] text-gray-300">
                            Started:{" "}
                            {p.startDate
                              ? new Date(p.startDate).toLocaleDateString("en-GB")
                              : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <PriorityBadge level={p.priority} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            p.status === "active"
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openModal(p)}
                          className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"
                        >
                          <HiDotsVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaProjectDiagram size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editProject ? "Update Project Details" : "New Project Initiation"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Lbl text="Project Name" req />
                  <input
                    type="text"
                    className={fi}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Lbl text="Project Description" />
                  <textarea
                    className={`${fi} h-20 resize-none`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Assignment & Workspace */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
                  Organization & Project Manager
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Lbl text="Workspace" req />
                    <select
                      className={fi}
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      required
                    >
                      <option value="">Select Environment</option>
                      {workspaces.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Lbl text="Project Manager" />
                    <Select
                      isMulti
                      options={users.map((u) => ({ value: u._id, label: u.name }))}
                      value={assignees.map((id) => ({
                        value: id,
                        label: users.find((u) => u._id === id)?.name || id,
                      }))}
                      onChange={(s) => setAssignees(s.map((x) => x.value))}
                      className="text-sm"
                      placeholder="Select project manager(s)..."
                    />
                  </div>
                </div>
              </div>

              {/* CRM & Billing */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
                  Financial & Customer Linking
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Lbl text="Customer" />
                    <Select
                      options={customers.map((c) => ({
                        value: c._id,
                        label: c.customerName,
                      }))}
                      value={customer}
                      onChange={(s) => setCustomer(s)}
                      className="text-sm"
                      placeholder="Select customer..."
                    />
                  </div>
                  <div>
                    <Lbl text="Reference Sales Order" />
                    <Select
                      options={filteredSalesOrders.map((so) => ({
                        value: so._id,
                        label: so.documentNumberOrder,
                      }))}
                      value={salesOrder}
                      onChange={(s) => setSalesOrder(s)}
                      isDisabled={!customer}
                      className="text-sm"
                      placeholder="Select sales order..."
                    />
                  </div>
                  <div>
                    <Lbl text="Est. Total Cost" />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                        ₹
                      </span>
                      <input
                        type="text"
                        className={`${fi} pl-7`}
                        value={estimatedCosting}
                        onChange={(e) => setEstimatedCosting(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- CONSTRUCTION SPECIFICS (no contractor) ---- */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <FaHardHat /> Construction Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Lbl text="Project Type" />
                    <select
                      className={fi}
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="renovation">Renovation</option>
                    </select>
                  </div>
                  <div>
                    <Lbl text="Billing Type" />
                    <select
                      className={fi}
                      value={billingType}
                      onChange={(e) => setBillingType(e.target.value)}
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="time_material">Time & Material</option>
                      <option value="cost_plus">Cost Plus</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Lbl text="Site Address" />
                    <textarea
                      className={`${fi} h-16 resize-none`}
                      value={siteAddress}
                      onChange={(e) => setSiteAddress(e.target.value)}
                      placeholder="Full site location"
                    />
                  </div>
                  <div>
                    <Lbl text="BOQ Reference" />
                    <input
                      type="text"
                      className={fi}
                      value={boqReference}
                      onChange={(e) => setBoqReference(e.target.value)}
                      placeholder="BOQ-001"
                    />
                  </div>
                  <div>
                    <Lbl text="Retention %" />
                    <input
                      type="number"
                      className={fi}
                      value={retentionPercentage}
                      onChange={(e) => setRetentionPercentage(e.target.value)}
                      placeholder="e.g. 5"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Lbl text="Labor Budget (₹)" />
                    <input
                      type="number"
                      className={fi}
                      value={laborBudget}
                      onChange={(e) => setLaborBudget(e.target.value)}
                      placeholder="0"
                      step="1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Lbl text="Progress Milestones (one per line)" />
                    <textarea
                      className={`${fi} h-20 resize-none`}
                      value={progressMilestones}
                      onChange={(e) => setProgressMilestones(e.target.value)}
                      placeholder="Foundation complete&#10;Structure up to floor 3&#10;Plumbing & electrical rough-in"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
                  Deadlines & Scheduling
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <Lbl text="Priority" />
                    <select
                      className={fi}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <Lbl text="Expected Start Date" />
                    <input
                      type="date"
                      className={fi}
                      value={projectedStartDate}
                      onChange={(e) => setProjectedStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Lbl text="Expected End Date" />
                    <input
                      type="date"
                      className={fi}
                      value={projectedEndDate}
                      onChange={(e) => setProjectedEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Lbl text="Actual Start Date" />
                    <input
                      type="date"
                      className={fi}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Lbl text="Actual End Date" />
                    <input
                      type="date"
                      className={fi}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Lbl text="Final Due Date" />
                    <input
                      type="date"
                      className={fi}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Lbl text="Status" />
                    <select
                      className={fi}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
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
                  <FaCheck size={12} /> {editProject ? "Update Project" : "Initiate Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}