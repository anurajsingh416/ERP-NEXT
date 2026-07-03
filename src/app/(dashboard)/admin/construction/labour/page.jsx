"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Select from "react-select";
import { FaPlus, FaTrash, FaEdit, FaSave, FaUsers, FaUserPlus } from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";

export default function LabourPage() {
  const [labours, setLabours] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editLabour, setEditLabour] = useState(null);

  // Form state
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [skill, setSkill] = useState("helper");
  const [dailyRate, setDailyRate] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [status, setStatus] = useState("active");
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split("T")[0]);

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

        const [pRes, lRes, sRes] = await Promise.all([
          api.get("/construction/projects", headers),
          api.get("/construction/labour", headers),
          api.get("/suppliers", headers),
        ]);

        // ✅ Extract arrays
        const projectsData = pRes.data?.data || pRes.data || [];
        const laboursData = lRes.data?.data || lRes.data || [];
        const suppliersData = sRes.data?.data || sRes.data || [];

        setProjects(projectsData);
        setLabours(laboursData);
        setSuppliers(suppliersData);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openModal = (labour = null) => {
    setEditLabour(labour);
    if (labour) {
      setSelectedProject({ value: labour.project._id, label: labour.project.name });
      setSelectedSupplier(
        labour.contractor 
          ? { value: labour.contractor, label: suppliers.find(s => s._id === labour.contractor)?.name || labour.contractor }
          : null
      );
      setName(labour.name || "");
      setPhone(labour.phone || "");
      setAddress(labour.address || "");
      setSkill(labour.skill || "helper");
      setDailyRate(labour.dailyRate || "");
      setAadhaar(labour.aadhaar || "");
      setStatus(labour.status || "active");
      setJoinedDate(labour.joinedDate ? labour.joinedDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    } else {
      setSelectedProject(null);
      setSelectedSupplier(null);
      setName("");
      setPhone("");
      setAddress("");
      setSkill("helper");
      setDailyRate("");
      setAadhaar("");
      setStatus("active");
      setJoinedDate(new Date().toISOString().split("T")[0]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditLabour(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      alert("Please select a project.");
      return;
    }

    const payload = {
      project: selectedProject.value,
      contractor: selectedSupplier?.value || null,
      name,
      phone,
      address,
      skill,
      dailyRate: parseFloat(dailyRate) || 0,
      aadhaar,
      status,
      joinedDate,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editLabour) {
        const res = await api.put(`/construction/labour/${editLabour._id}`, payload, headers);
        setLabours(labours.map(l => l._id === editLabour._id ? res.data.data || res.data : l));
      } else {
        const res = await api.post("/construction/labour", payload, headers);
        setLabours([res.data.data || res.data, ...labours]);
      }
      closeModal();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save. Check console.");
    }
  };

  // UI Helpers
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      active: "bg-emerald-100 text-emerald-700",
      inactive: "bg-gray-100 text-gray-600",
      "on-leave": "bg-amber-100 text-amber-700",
    };
    return <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.active}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaUsers className="text-indigo-600" /> Labour Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage workers, skills, and daily rates</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            <FaUserPlus size={12} /> Add Labour
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Name</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Skill</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Daily Rate</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
                ) : labours.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">No labour records found.</td></tr>
                ) : (
                  labours.map(l => (
                    <tr key={l._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800">{l.name}</td>
                      <td className="px-6 py-4 font-medium text-indigo-600">{l.project?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-500 uppercase text-[11px]">{l.skill || "helper"}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-700">₹{l.dailyRate || 0}</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={l.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openModal(l)} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm"><FaUsers size={20} /></div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{editLabour ? "Edit Labour" : "Add New Labour"}</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Full Name" req />
                  <input type="text" className={fi} value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <Lbl text="Phone" />
                  <input type="text" className={fi} value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <Lbl text="Address" />
                <input type="text" className={fi} value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Skill" />
                  <select className={fi} value={skill} onChange={e => setSkill(e.target.value)}>
                    <option value="carpenter">Carpenter</option>
                    <option value="fitter">Fitter</option>
                    <option value="mason">Mason</option>
                    <option value="helper">Helper</option>
                    <option value="electrician">Electrician</option>
                    <option value="plumber">Plumber</option>
                    <option value="welder">Welder</option>
                    <option value="operator">Operator</option>
                    <option value="foreman">Foreman</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Daily Rate (₹)" req />
                  <input type="number" className={fi} value={dailyRate} onChange={e => setDailyRate(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map(p => ({ value: p._id, label: p.name }))}
                    value={selectedProject}
                    onChange={setSelectedProject}
                    placeholder="Select Project..."
                    className="text-sm"
                    required
                  />
                </div>
                <div>
                  <Lbl text="Contractor (Supplier)" />
                  <Select
                    options={suppliers.map(s => ({ value: s._id, label: s.supplierName || s.name || s.contactPersonName || s.contactPerson || s._id }))}
                    value={selectedSupplier}
                    onChange={setSelectedSupplier}
                    placeholder="Select contractor..."
                    className="text-sm"
                    isClearable
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="Aadhaar" />
                  <input type="text" className={fi} value={aadhaar} onChange={e => setAadhaar(e.target.value)} />
                </div>
                <div>
                  <Lbl text="Status" />
                  <select className={fi} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Joined Date" />
                  <input type="date" className={fi} value={joinedDate} onChange={e => setJoinedDate(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                  <FaSave size={12} /> {editLabour ? "Update Labour" : "Add Labour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
