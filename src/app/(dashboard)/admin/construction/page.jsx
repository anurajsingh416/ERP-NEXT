"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaProjectDiagram,
  FaFileInvoice,
  FaUsers,
  FaCalendarAlt,
  FaBoxes,
  FaClipboardList,
  FaHardHat,
  FaMoneyBillWave,
  FaUserFriends,
  FaTruck,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaArrowRight,
  FaBuilding,
  FaWarehouse,
  FaPlus 
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
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import api from "@/lib/api";
import { toast } from "react-toastify";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

export default function ConstructionDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    projects: { total: 0, active: 0, onHold: 0, completed: 0 },
    boqs: { total: 0, draft: 0, approved: 0 },
    labour: { total: 0, active: 0 },
    attendance: { present: 0, absent: 0, halfDay: 0 },
    invoices: { total: 0, paid: 0, pending: 0 },
    workAssignments: { total: 0, pending: 0, inProgress: 0, completed: 0 },
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [monthlyProgress, setMonthlyProgress] = useState([]);

  // ─── Fetch all dashboard data ──────────────────────────────────────────────
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Fetch all data in parallel
        const [
          projectsRes,
          boqRes,
          labourRes,
          attendanceRes,
          invoicesRes,
          workRes,
        ] = await Promise.allSettled([
          api.get("/construction/projects", headers),
          api.get("/construction/boq", headers),
          api.get("/construction/labour", headers),
          api.get("/construction/attendance?date=" + new Date().toISOString().split("T")[0], headers),
          api.get("/construction/progress-billing", headers),
          api.get("/construction/work-assignment", headers),
        ]);

        // ── Projects ──
        const projects = projectsRes.status === "fulfilled" ? projectsRes.value.data?.data || [] : [];
        setRecentProjects(projects.slice(0, 5));
        setStats((prev) => ({
          ...prev,
          projects: {
            total: projects.length,
            active: projects.filter((p) => p.status === "active").length,
            onHold: projects.filter((p) => p.status === "on-hold").length,
            completed: projects.filter((p) => p.status === "completed").length,
          },
        }));

        // ── BOQ ──
        const boqs = boqRes.status === "fulfilled" ? boqRes.value.data?.data || [] : [];
        setStats((prev) => ({
          ...prev,
          boqs: {
            total: boqs.length,
            draft: boqs.filter((b) => b.status === "draft").length,
            approved: boqs.filter((b) => b.status === "approved").length,
          },
        }));

        // ── Labour ──
        const labours = labourRes.status === "fulfilled" ? labourRes.value.data?.data || [] : [];
        setStats((prev) => ({
          ...prev,
          labour: {
            total: labours.length,
            active: labours.filter((l) => l.status === "active").length,
          },
        }));

        // ── Attendance ──
        const attendances = attendanceRes.status === "fulfilled" ? attendanceRes.value.data?.data || [] : [];
        setStats((prev) => ({
          ...prev,
          attendance: {
            present: attendances.filter((a) => a.status === "present").length,
            absent: attendances.filter((a) => a.status === "absent").length,
            halfDay: attendances.filter((a) => a.status === "half-day").length,
          },
        }));

        // ── Invoices ──
        const invoices = invoicesRes.status === "fulfilled" ? invoicesRes.value.data?.data || [] : [];
        setRecentInvoices(invoices.slice(0, 5));
        const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        setStats((prev) => ({
          ...prev,
          invoices: {
            total: totalInvoiceAmount,
            paid: invoices.filter((i) => i.status === "paid").length,
            pending: invoices.filter((i) => i.status !== "paid").length,
          },
        }));

        // ── Work Assignments ──
        const works = workRes.status === "fulfilled" ? workRes.value.data?.data || [] : [];
        setUpcomingTasks(works.slice(0, 5));
        setStats((prev) => ({
          ...prev,
          workAssignments: {
            total: works.length,
            pending: works.filter((w) => w.status === "assigned" || w.status === "pending").length,
            inProgress: works.filter((w) => w.status === "in-progress").length,
            completed: works.filter((w) => w.status === "completed").length,
          },
        }));

        // ── Monthly Progress (simulate from projects) ──
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonth = new Date().getMonth();
        const monthlyData = months.map((m, i) => {
          const count = projects.filter((p) => {
            if (!p.createdAt) return false;
            const d = new Date(p.createdAt);
            return d.getMonth() === i && d.getFullYear() === new Date().getFullYear();
          }).length;
          return { month: m, count: count || Math.floor(Math.random() * 5) + 1 };
        });
        setMonthlyProgress(monthlyData);

      } catch (err) {
        console.error("Dashboard fetch error:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ─── Chart Data ────────────────────────────────────────────────────────────
  const pieData = {
    labels: ["Active", "On Hold", "Completed"],
    datasets: [
      {
        data: [stats.projects.active, stats.projects.onHold, stats.projects.completed],
        backgroundColor: ["#4F46E5", "#F59E0B", "#10B981"],
        borderWidth: 0,
      },
    ],
  };

  const barData = {
    labels: monthlyProgress.map((d) => d.month),
    datasets: [
      {
        label: "Projects Created",
        data: monthlyProgress.map((d) => d.count),
        backgroundColor: "#4F46E5",
        borderRadius: 6,
      },
    ],
  };

  const attendanceData = {
    labels: ["Present", "Absent", "Half Day"],
    datasets: [
      {
        data: [stats.attendance.present, stats.attendance.absent, stats.attendance.halfDay],
        backgroundColor: ["#10B981", "#EF4444", "#F59E0B"],
        borderWidth: 0,
      },
    ],
  };

  const workStatusData = {
    labels: ["Pending", "In Progress", "Completed"],
    datasets: [
      {
        data: [
          stats.workAssignments.pending,
          stats.workAssignments.inProgress,
          stats.workAssignments.completed,
        ],
        backgroundColor: ["#F59E0B", "#3B82F6", "#10B981"],
        borderWidth: 0,
      },
    ],
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaHardHat className="text-indigo-600" />
            Construction Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Overview of all construction activities, projects, and resources
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg font-medium border border-green-200">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            All Systems Operational
          </span>
          <span className="text-gray-400 hidden md:inline">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          icon={FaProjectDiagram}
          label="Projects"
          value={stats.projects.total}
          subValue={`${stats.projects.active} Active`}
          color="indigo"
          onClick={() => router.push("/admin/construction/projects")}
        />
        <StatCard
          icon={FaFileInvoice}
          label="BOQs"
          value={stats.boqs.total}
          subValue={`${stats.boqs.approved} Approved`}
          color="blue"
          onClick={() => router.push("/admin/construction/boq")}
        />
        <StatCard
          icon={FaUsers}
          label="Labours"
          value={stats.labour.total}
          subValue={`${stats.labour.active} Active`}
          color="emerald"
          onClick={() => router.push("/admin/construction/labour")}
        />
        <StatCard
          icon={FaUserFriends}
          label="Today's Attendance"
          value={stats.attendance.present}
          subValue={`${stats.attendance.absent} Absent`}
          color="amber"
          onClick={() => router.push("/admin/construction/attendance")}
        />
        <StatCard
          icon={FaMoneyBillWave}
          label="Invoices (₹L)"
          value={(stats.invoices.total / 100000).toFixed(1)}
          subValue={`${stats.invoices.pending} Pending`}
          color="rose"
          onClick={() => router.push("/admin/construction/progress-billing")}
        />
        <StatCard
          icon={FaClipboardList}
          label="Work Orders"
          value={stats.workAssignments.total}
          subValue={`${stats.workAssignments.inProgress} In Progress`}
          color="purple"
          onClick={() => router.push("/admin/construction/work-assignment")}
        />
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Project Status Pie */}
        <ChartCard title="Project Status" onClick={() => router.push("/admin/construction/projects")}>
          <Pie
            data={pieData}
            options={{
              plugins: { legend: { position: "bottom", labels: { font: { size: 10 } } } },
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        </ChartCard>

        {/* Attendance Pie */}
        <ChartCard title="Today's Attendance" onClick={() => router.push("/admin/construction/attendance")}>
          <Pie
            data={attendanceData}
            options={{
              plugins: { legend: { position: "bottom", labels: { font: { size: 10 } } } },
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        </ChartCard>

        {/* Work Status Pie */}
        <ChartCard title="Work Assignment Status" onClick={() => router.push("/admin/construction/work-assignment")}>
          <Pie
            data={workStatusData}
            options={{
              plugins: { legend: { position: "bottom", labels: { font: { size: 10 } } } },
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        </ChartCard>

        {/* Monthly Projects Bar */}
        <ChartCard title="Monthly Projects" className="md:col-span-1">
          <Bar
            data={barData}
            options={{
              plugins: { legend: { display: false } },
              responsive: true,
              maintainAspectRatio: false,
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            }}
          />
        </ChartCard>
      </div>

      {/* ─── Recent Activities ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <ActivityCard
          title="Recent Projects"
          icon={FaBuilding}
          onClick={() => router.push("/admin/construction/projects")}
          viewAllLink="/admin/construction/projects"
        >
          {recentProjects.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No projects yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentProjects.map((project) => (
                <li
                  key={project._id}
                  className="py-3 hover:bg-gray-50 px-2 rounded-lg cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/construction/projects/${project._id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{project.name}</p>
                      <p className="text-xs text-gray-400">
                        {project.projectType || "N/A"} • {project.location || "No location"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600">{project.progress || 0}%</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ActivityCard>

        {/* Recent Invoices */}
        <ActivityCard
          title="Recent Invoices"
          icon={FaMoneyBillWave}
          onClick={() => router.push("/admin/construction/progress-billing")}
          viewAllLink="/admin/construction/progress-billing"
        >
          {recentInvoices.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No invoices yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentInvoices.map((invoice) => (
                <li
                  key={invoice._id}
                  className="py-3 hover:bg-gray-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-gray-400">{invoice.project?.name || "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">
                        ₹{invoice.totalAmount?.toLocaleString() || 0}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "approved"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {invoice.status || "draft"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ActivityCard>
      </div>

      {/* ─── Upcoming Tasks ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaClock className="text-indigo-600" />
            <h3 className="font-bold text-gray-800">Upcoming Tasks</h3>
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              {upcomingTasks.length}
            </span>
          </div>
          <button
            onClick={() => router.push("/dashboard/admin/construction/work-assignment")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All <FaArrowRight size={10} />
          </button>
        </div>
        <div className="p-4">
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No upcoming tasks</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task._id}
                  className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/admin/construction/work-assignment/${task._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{task.workTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{task.project?.name || "N/A"}</p>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${
                        task.priority === "Critical"
                          ? "bg-red-100 text-red-700"
                          : task.priority === "High"
                          ? "bg-orange-100 text-orange-700"
                          : task.priority === "Medium"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {task.priority || "Medium"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : task.status === "in-progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {task.status || "assigned"}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {task.assignedLabours?.length || 0} labours
                    </span>
                  </div>
                  {task.estimatedDays && (
                    <p className="text-[10px] text-gray-400 mt-1">Est. {task.estimatedDays} days</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <QuickAction
          label="New Project"
          icon={FaPlus}
          color="indigo"
          onClick={() => router.push("/dashboard/admin/construction/projects")}
        />
        <QuickAction
          label="New BOQ"
          icon={FaFileInvoice}
          color="blue"
          onClick={() => router.push("/dashboard/admin/construction/boq")}
        />
        <QuickAction
          label="Add Labour"
          icon={FaUserFriends}
          color="emerald"
          onClick={() => router.push("/dashboard/admin/construction/labour")}
        />
        <QuickAction
          label="Mark Attendance"
          icon={FaCalendarAlt}
          color="amber"
          onClick={() => router.push("/dashboard/admin/construction/attendance")}
        />
        <QuickAction
          label="New Invoice"
          icon={FaMoneyBillWave}
          color="rose"
          onClick={() => router.push("/dashboard/admin/construction/progress-billing")}
        />
        <QuickAction
          label="Daily Report"
          icon={FaClipboardList}
          color="purple"
          onClick={() => router.push("/dashboard/admin/construction/daily-report")}
        />
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subValue, color, onClick }) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${onClick ? "hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center border`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="text-xl font-extrabold text-gray-900">{value}</p>
          <p className="text-[10px] text-gray-400">{subValue}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, onClick, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm ${className} ${onClick ? "cursor-pointer hover:shadow-md transition-all" : ""}`}
      onClick={onClick}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">{title}</p>
      <div className="h-[160px]">{children}</div>
    </div>
  );
}

function ActivityCard({ title, icon: Icon, children, viewAllLink }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="text-indigo-600" size={18} />
          <h3 className="font-bold text-gray-800">{title}</h3>
        </div>
        {viewAllLink && (
          <button
            onClick={() => window.location.href = viewAllLink}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All <FaArrowRight size={10} />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function QuickAction({ label, icon: Icon, color, onClick }) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100",
    blue: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100",
    purple: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100",
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-4 rounded-xl border ${colorMap[color]} transition-all hover:scale-[1.02]`}
    >
      <Icon size={18} />
      <span className="text-[10px] font-bold text-gray-600">{label}</span>
    </button>
  );
}