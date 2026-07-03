"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaFileAlt,
  FaProjectDiagram,
  FaFileInvoice,
  FaUsers,
  FaCalendarAlt,
  FaBoxes,
  FaClipboardList,
  FaDollarSign,
  FaDownload,
  FaChartBar,
  FaChartPie,
  FaChartLine,
  FaBuilding,
  FaUserCheck,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaThumbsUp,
  FaTrendUp,
  FaCalendarWeek,
  FaFilter,
} from "react-icons/fa";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Bar, Pie, Line, Doughnut } from "react-chartjs-2";
import { toast } from "react-toastify";
import CountUp from "react-countup";

// Register ChartJS
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
);

// ─── Chart Color Palette ──────────────────────────────────────────────────
const COLORS = {
  indigo: "#4F46E5",
  indigoLight: "rgba(79, 70, 229, 0.1)",
  blue: "#3B82F6",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#EF4444",
  purple: "#8B5CF6",
  teal: "#14B8A6",
  gray: "#6B7280",
  gradient: ["#4F46E5", "#7C3AED"],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        padding: 16,
        font: { size: 10, weight: "600" },
        color: "#6B7280",
      },
    },
    tooltip: {
      backgroundColor: "rgba(255,255,255,0.95)",
      titleColor: "#1F2937",
      bodyColor: "#4B5563",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      cornerRadius: 12,
      padding: 12,
    },
  },
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: "", // ✅ EMPTY = NO FILTER
    to: "",   // ✅ EMPTY = NO FILTER
  });

  // ─── Data States ──────────────────────────────────────────────────────────
  const [projectsData, setProjectsData] = useState([]);
  const [boqsData, setBoqsData] = useState([]);
  const [labourData, setLabourData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [workData, setWorkData] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [indentData, setIndentData] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [allProjects, setAllProjects] = useState([]);

  // ─── Fetch all data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [
          pRes,
          bRes,
          lRes,
          aRes,
          wRes,
          billRes,
          indentRes,
          dailyRes,
        ] = await Promise.all([
          api.get("/construction/projects", headers),
          api.get("/construction/boq", headers),
          api.get("/construction/labour", headers),
          api.get("/construction/attendance", headers),
          api.get("/construction/work-assignment", headers),
          api.get("/construction/progress-billing", headers),
          api.get("/construction/purchase-indent", headers),
          api.get("/construction/daily-report", headers),
        ]);

        setProjectsData(pRes.data?.data || pRes.data || []);
        setAllProjects(pRes.data?.data || pRes.data || []);
        setBoqsData(bRes.data?.data || bRes.data || []);
        setLabourData(lRes.data?.data || lRes.data || []);
        setAttendanceData(aRes.data?.data || aRes.data || []);
        setWorkData(wRes.data?.data || wRes.data || []);
        setBillingData(billRes.data?.data || billRes.data || []);
        setIndentData(indentRes.data?.data || indentRes.data || []);
        setDailyReports(dailyRes.data?.data || dailyRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load reports data.");
      } finally {
        setLoading(false);
        setTimeout(() => setAnimated(true), 300);
      }
    };
    fetchAllData();
  }, []);

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { key: "overview", label: "Overview", icon: FaChartBar, color: "indigo" },
    { key: "projects", label: "Projects", icon: FaProjectDiagram, color: "blue" },
    { key: "boq", label: "BOQ", icon: FaFileInvoice, color: "purple" },
    { key: "labour", label: "Labour", icon: FaUsers, color: "emerald" },
    { key: "work", label: "Work", icon: FaClipboardList, color: "amber" },
    { key: "financial", label: "Financial", icon: FaDollarSign, color: "rose" },
    { key: "daily", label: "Daily Reports", icon: FaCalendarAlt, color: "teal" },
  ];

  // ─── Filter helpers ──────────────────────────────────────────────────────
  const filterByDate = (items, dateField = "createdAt") => {
    if (!dateRange.from && !dateRange.to) return items;
    return items.filter((item) => {
      const d = new Date(item[dateField]);
      if (dateRange.from && d < new Date(dateRange.from)) return false;
      if (dateRange.to && d > new Date(dateRange.to)) return false;
      return true;
    });
  };

  const filterByProject = (items, projectField = "project") => {
    if (!selectedProject) return items;
    return items.filter(
      (item) =>
        item[projectField]?._id === selectedProject.value ||
        item[projectField] === selectedProject.value
    );
  };

  const applyFilters = (items, dateField = "createdAt", projectField = "project") => {
    let filtered = items;
    filtered = filterByDate(filtered, dateField);
    filtered = filterByProject(filtered, projectField);
    return filtered;
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatCurrency = (num) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // ─── Metric Cards ────────────────────────────────────────────────────────
  const metrics = {
    projects: projectsData.length,
    activeProjects: projectsData.filter((p) => p.status === "active").length,
    boqs: boqsData.length,
    labours: labourData.length,
    activeLabours: labourData.filter((l) => l.status === "active").length,
    workOrders: workData.length,
    completedWork: workData.filter((w) => w.status === "completed").length,
    invoices: billingData.length,
    totalBilled: billingData.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    pendingInvoices: billingData.filter((b) => b.status === "sent" || b.status === "draft").length,
    totalIndent: indentData.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
    dailyReportsCount: dailyReports.length,
  };

  // ─── Chart Data Builders ──────────────────────────────────────────────────
  const projectStatusData = {
    labels: ["Active", "On Hold", "Completed"],
    datasets: [{
      data: [
        projectsData.filter((p) => p.status === "active").length,
        projectsData.filter((p) => p.status === "on-hold").length,
        projectsData.filter((p) => p.status === "completed").length,
      ],
      backgroundColor: ["#4F46E5", "#F59E0B", "#10B981"],
      borderWidth: 0,
    }],
  };

  const boqStatusData = {
    labels: ["Draft", "Approved", "Rejected"],
    datasets: [{
      data: [
        boqsData.filter((b) => b.status === "draft").length,
        boqsData.filter((b) => b.status === "approved").length,
        boqsData.filter((b) => b.status === "rejected").length,
      ],
      backgroundColor: ["#9CA3AF", "#10B981", "#EF4444"],
      borderWidth: 0,
    }],
  };

  const labourStatusData = {
    labels: ["Active", "Inactive"],
    datasets: [{
      data: [
        labourData.filter((l) => l.status === "active").length,
        labourData.filter((l) => l.status === "inactive").length,
      ],
      backgroundColor: ["#10B981", "#9CA3AF"],
      borderWidth: 0,
    }],
  };

  const workStatusData = {
    labels: ["Assigned", "In Progress", "Completed"],
    datasets: [{
      data: [
        workData.filter((w) => w.status === "assigned" || w.status === "pending").length,
        workData.filter((w) => w.status === "in-progress").length,
        workData.filter((w) => w.status === "completed").length,
      ],
      backgroundColor: ["#F59E0B", "#3B82F6", "#10B981"],
      borderWidth: 0,
    }],
  };

  const invoiceStatusData = {
    labels: ["Draft", "Sent", "Approved", "Paid"],
    datasets: [{
      data: [
        billingData.filter((b) => b.status === "draft").length,
        billingData.filter((b) => b.status === "sent").length,
        billingData.filter((b) => b.status === "approved").length,
        billingData.filter((b) => b.status === "paid").length,
      ],
      backgroundColor: ["#9CA3AF", "#3B82F6", "#10B981", "#059669"],
      borderWidth: 0,
    }],
  };

  const monthlyProjects = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const counts = months.map((_, i) => {
      return projectsData.filter((p) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getMonth() === i && d.getFullYear() === currentYear;
      }).length;
    });
    return {
      labels: months,
      datasets: [{
        label: "Projects Created",
        data: counts,
        backgroundColor: "rgba(79, 70, 229, 0.7)",
        borderColor: "#4F46E5",
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.6,
      }],
    };
  };

  const dailyReportTrend = () => {
    const filtered = filterByDate(dailyReports, "reportDate");
    const sorted = filtered.sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));
    const labels = sorted.map((d) => new Date(d.reportDate).toLocaleDateString("en-GB"));
    const activities = sorted.map((d) => d.workInProgress?.length || 0);
    return {
      labels: labels.slice(0, 30),
      datasets: [{
        label: "Activities per Day",
        data: activities.slice(0, 30),
        borderColor: "#4F46E5",
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(79, 70, 229, 0.3)");
          gradient.addColorStop(1, "rgba(79, 70, 229, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#4F46E5",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 3,
      }],
    };
  };

  // ─── UI Components ────────────────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const config = {
      active: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
      "on-hold": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
      completed: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
      draft: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
      approved: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
      rejected: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
      assigned: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
      "in-progress": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
      pending: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
      purchased: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
      "partially-purchased": { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
      sent: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
      paid: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
    };
    const c = config[status] || config.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {status}
      </span>
    );
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue }) => {
    const colorMap = {
      indigo: "from-indigo-500 to-indigo-600",
      blue: "from-blue-500 to-blue-600",
      emerald: "from-emerald-500 to-emerald-600",
      amber: "from-amber-500 to-amber-600",
      rose: "from-rose-500 to-rose-600",
      purple: "from-purple-500 to-purple-600",
      teal: "from-teal-500 to-teal-600",
      gray: "from-gray-500 to-gray-600",
    };
    const lightMap = {
      indigo: "bg-indigo-50 text-indigo-600",
      blue: "bg-blue-50 text-blue-600",
      emerald: "bg-emerald-50 text-emerald-600",
      amber: "bg-amber-50 text-amber-600",
      rose: "bg-rose-50 text-rose-600",
      purple: "bg-purple-50 text-purple-600",
      teal: "bg-teal-50 text-teal-600",
      gray: "bg-gray-50 text-gray-600",
    };
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">
              {animated ? (
                <CountUp end={typeof value === "number" ? value : 0} duration={2} separator="," />
              ) : (
                value
              )}
            </p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`w-11 h-11 rounded-2xl ${lightMap[color]} flex items-center justify-center text-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3 text-xs">
            {trend === "up" ? (
              <FaArrowUp className="text-emerald-500" />
            ) : (
              <FaArrowDown className="text-rose-500" />
            )}
            <span className={trend === "up" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {trendValue}%
            </span>
            <span className="text-gray-400">vs last month</span>
          </div>
        )}
        <div className={`mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden`}>
          <div
            className={`h-full bg-gradient-to-r ${colorMap[color]} rounded-full transition-all duration-1000`}
            style={{ width: animated ? "100%" : "0%" }}
          />
        </div>
      </div>
    );
  };

  const ChartCard = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
        {title}
      </p>
      <div className="h-[200px]">{children}</div>
    </div>
  );

  const TabButton = ({ tab, active, onClick }) => {
    const colorMap = {
      indigo: "hover:bg-indigo-50 data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 data-[active=true]:border-indigo-600",
      blue: "hover:bg-blue-50 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 data-[active=true]:border-blue-600",
      purple: "hover:bg-purple-50 data-[active=true]:bg-purple-50 data-[active=true]:text-purple-700 data-[active=true]:border-purple-600",
      emerald: "hover:bg-emerald-50 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700 data-[active=true]:border-emerald-600",
      amber: "hover:bg-amber-50 data-[active=true]:bg-amber-50 data-[active=true]:text-amber-700 data-[active=true]:border-amber-600",
      rose: "hover:bg-rose-50 data-[active=true]:bg-rose-50 data-[active=true]:text-rose-700 data-[active=true]:border-rose-600",
      teal: "hover:bg-teal-50 data-[active=true]:bg-teal-50 data-[active=true]:text-teal-700 data-[active=true]:border-teal-600",
    };
    return (
      <button
        data-active={active}
        onClick={onClick}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
          border-2 border-transparent
          ${active ? colorMap[tab.color] : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}
        `}
      >
        <tab.icon size={16} className={active ? "text-current" : "text-gray-400"} />
        {tab.label}
        {active && <span className="w-1.5 h-1.5 rounded-full bg-current ml-1" />}
      </button>
    );
  };

  // ─── Tab Render Functions ────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Projects"
          value={metrics.projects}
          subtitle={`${metrics.activeProjects} Active`}
          icon={FaBuilding}
          color="indigo"
          trend="up"
          trendValue="12"
        />
        <MetricCard
          title="BOQs"
          value={metrics.boqs}
          subtitle={`${boqsData.filter(b => b.status === "approved").length} Approved`}
          icon={FaFileInvoice}
          color="purple"
          trend="up"
          trendValue="8"
        />
        <MetricCard
          title="Labours"
          value={metrics.labours}
          subtitle={`${metrics.activeLabours} Active`}
          icon={FaUsers}
          color="emerald"
          trend="up"
          trendValue="5"
        />
        <MetricCard
          title="Total Billed"
          value={formatCurrency(metrics.totalBilled)}
          subtitle={`${metrics.invoices} Invoices`}
          icon={FaDollarSign}
          color="rose"
          trend="up"
          trendValue="15"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard title="Project Status">
          <Doughnut data={projectStatusData} options={chartOptions} />
        </ChartCard>
        <ChartCard title="BOQ Status">
          <Doughnut data={boqStatusData} options={chartOptions} />
        </ChartCard>
        <ChartCard title="Work Status">
          <Doughnut data={workStatusData} options={chartOptions} />
        </ChartCard>
        <ChartCard title="Invoice Status">
          <Doughnut data={invoiceStatusData} options={chartOptions} />
        </ChartCard>
      </div>

      {/* Monthly Projects + Daily Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Monthly Projects Trend">
          <Bar
            data={monthlyProjects()}
            options={{
              ...chartOptions,
              plugins: { ...chartOptions.plugins, legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 9 } } },
                x: { ticks: { font: { size: 9 } } },
              },
            }}
          />
        </ChartCard>
        <ChartCard title="Daily Report Activities (Last 30 days)">
          <Line
            data={dailyReportTrend()}
            options={{
              ...chartOptions,
              plugins: { ...chartOptions.plugins, legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 9 } } },
                x: { ticks: { maxRotation: 45, font: { size: 7 } } },
              },
            }}
          />
        </ChartCard>
      </div>
    </div>
  );

  const renderProjects = () => {
    const filtered = applyFilters(projectsData, "createdAt", "_id");
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <FaProjectDiagram className="text-indigo-500" />
            Projects List ({filtered.length})
          </h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors">
            <FaDownload size={12} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Status</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Progress</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-gray-400">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p._id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{p.projectType || "N/A"}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${p.progress || 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-indigo-600">{p.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-700">{formatCurrency(p.estimatedCosting || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBOQ = () => {
    // ✅ No date filter by default – all BOQs show
    const filtered = applyFilters(boqsData, "createdAt", "project");
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <FaFileInvoice className="text-purple-500" />
            BOQ List ({filtered.length})
          </h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-bold hover:bg-purple-100 transition-colors">
            <FaDownload size={12} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">BOQ #</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Project</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Phase</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Items</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-gray-400">Total Amount</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((b) => (
                <tr key={b._id} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-purple-600">{b.boqNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{b.project?.name || "N/A"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{b.phase || "I"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{b.items?.length || 0}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(b.totalAmount || 0)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLabour = () => {
    const filteredLabours = applyFilters(labourData, "createdAt", "project");
    const filteredAttendance = applyFilters(attendanceData, "date", "project");
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
              <FaUsers /> Labour Summary
            </h4>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-3xl font-extrabold text-gray-900">{filteredLabours.length}</p>
                <p className="text-xs text-gray-500">Total Labours</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {filteredLabours.filter(l => l.status === "active").length}
                </p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-blue-600">
                  {filteredAttendance.filter(a => a.status === "present").length}
                </p>
                <p className="text-xs text-gray-500">Present Today</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-rose-500">
                  {filteredAttendance.filter(a => a.status === "absent").length}
                </p>
                <p className="text-xs text-gray-500">Absent Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <FaChartPie /> Attendance Distribution
            </h4>
            <div className="h-[150px]">
              <Doughnut
                data={{
                  labels: ["Present", "Absent", "Half Day"],
                  datasets: [{
                    data: [
                      filteredAttendance.filter(a => a.status === "present").length,
                      filteredAttendance.filter(a => a.status === "absent").length,
                      filteredAttendance.filter(a => a.status === "half-day").length,
                    ],
                    backgroundColor: ["#10B981", "#EF4444", "#F59E0B"],
                    borderWidth: 0,
                  }],
                }}
                options={chartOptions}
              />
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <FaUserCheck className="text-emerald-500" />
            Labour List
          </h4>
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Skill</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Daily Rate</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLabours.map(l => (
                  <tr key={l._id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{l.name}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{l.skill || "helper"}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">₹{l.dailyRate || 0}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderWork = () => {
    const filtered = applyFilters(workData, "createdAt", "project");
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <FaClipboardList className="text-amber-500" />
            Work Assignments ({filtered.length})
          </h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold hover:bg-amber-100 transition-colors">
            <FaDownload size={12} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Work Title</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Project</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Labours</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Est. Days</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Actual</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(w => (
                <tr key={w._id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{w.workTitle}</td>
                  <td className="px-4 py-3 text-gray-700">{w.project?.name || "N/A"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{w.assignedLabours?.length || 0}</td>
                  <td className="px-4 py-3 text-center">{w.estimatedDays || 0}</td>
                  <td className="px-4 py-3 text-center">{w.actualDays || 0}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFinancial = () => {
    const filteredBills = applyFilters(billingData, "createdAt", "project");
    const filteredIndents = applyFilters(indentData, "createdAt", "project");
    const totalBilled = filteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalIndent = filteredIndents.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Total Billed"
            value={formatCurrency(totalBilled)}
            icon={FaDollarSign}
            color="emerald"
            trend="up"
            trendValue="18"
          />
          <MetricCard
            title="Purchase Indent Total"
            value={formatCurrency(totalIndent)}
            icon={FaBoxes}
            color="blue"
          />
          <MetricCard
            title="Invoices"
            value={filteredBills.length}
            subtitle={`${filteredBills.filter(b => b.status === "paid").length} Paid`}
            icon={FaFileInvoice}
            color="purple"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Invoice Status">
            <Doughnut data={invoiceStatusData} options={chartOptions} />
          </ChartCard>
          <ChartCard title="Purchase Indent Status">
            <Doughnut
              data={{
                labels: ["Pending", "Approved", "Purchased", "Rejected"],
                datasets: [{
                  data: [
                    filteredIndents.filter(i => i.status === "pending").length,
                    filteredIndents.filter(i => i.status === "approved").length,
                    filteredIndents.filter(i => i.status === "purchased").length,
                    filteredIndents.filter(i => i.status === "rejected").length,
                  ],
                  backgroundColor: ["#F59E0B", "#3B82F6", "#10B981", "#EF4444"],
                  borderWidth: 0,
                }],
              }}
              options={chartOptions}
            />
          </ChartCard>
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <FaFileInvoice className="text-rose-500" />
            Recent Invoices
          </h4>
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Invoice #</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Project</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBills.slice(0, 10).map(b => (
                  <tr key={b._id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-rose-600">{b.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{b.project?.name || "N/A"}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(b.totalAmount || 0)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDaily = () => {
    const filtered = filterByDate(dailyReports, "reportDate");
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <FaCalendarAlt className="text-teal-500" />
            Daily Reports ({filtered.length})
          </h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 text-xs font-bold hover:bg-teal-100 transition-colors">
            <FaDownload size={12} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Project</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Activities</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Issues</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Manpower</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.slice(0, 50).map(r => (
                <tr key={r._id} className="hover:bg-teal-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-800">{new Date(r.reportDate).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3 text-gray-700">{r.project?.name || "N/A"}</td>
                  <td className="px-4 py-3 text-center">{r.workInProgress?.length || 0}</td>
                  <td className="px-4 py-3 text-center">{r.issues?.length || 0}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600">
                    {r.manpower?.reduce((sum, m) => sum + (m.carpenter + m.fitter + m.mason + m.machineOperator + m.foreman + m.helper), 0) || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header with glass effect */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <FaFileAlt />
              </span>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Reports & Analytics
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1 ml-1">
              Comprehensive insights across all construction modules
            </p>
          </div>
          <div className="flex items-center gap-3 bg-gray-100/80 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-200/50">
            <FaCalendarWeek className="text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {dateRange.from || "All"} — {dateRange.to || "All"}
            </span>
          </div>
        </div>

        {/* ─── Filters ────────────────────────────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                <FaFilter size={10} /> Project
              </label>
              <Select
                options={allProjects.map((p) => ({ value: p._id, label: p.name }))}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="All Projects"
                isClearable
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: "12px",
                    borderColor: "#E5E7EB",
                    boxShadow: "none",
                    "&:hover": { borderColor: "#4F46E5" },
                  }),
                }}
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">From</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/80 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">To</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/80 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setDateRange({ from: "", to: "" });
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ─── Tabs ────────────────────────────────────────────────────────── */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                tab={tab}
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </div>
        </div>

        {/* ─── Tab Content ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white/70 backdrop-blur-sm rounded-3xl border border-white/50 shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin" />
              </div>
              <p className="text-sm text-gray-400 font-medium animate-pulse">Loading reports...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-6">
            {activeTab === "overview" && renderOverview()}
            {activeTab === "projects" && renderProjects()}
            {activeTab === "boq" && renderBOQ()}
            {activeTab === "labour" && renderLabour()}
            {activeTab === "work" && renderWork()}
            {activeTab === "financial" && renderFinancial()}
            {activeTab === "daily" && renderDaily()}
          </div>
        )}
      </div>
    </div>
  );
}