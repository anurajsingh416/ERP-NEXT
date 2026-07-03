import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LabourAttendance from "@/models/contruction/LabourAttendance";
import Labour from "@/models/contruction/Labour";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "site supervisor",
    "hr manager", "labour supervisor"
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const labourId = searchParams.get("labourId");
    const projectId = searchParams.get("projectId");
    const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get("year")) || new Date().getFullYear();

    if (!labourId) {
      return NextResponse.json({ success: false, message: "labourId is required" }, { status: 400 });
    }

    const labour = await Labour.findOne({ _id: labourId, companyId: user.companyId });
    if (!labour) return NextResponse.json({ success: false, message: "Labour not found" }, { status: 404 });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const query = {
      companyId: user.companyId,
      labour: labourId,
      date: { $gte: start, $lte: end },
    };
    if (projectId) query.project = projectId;

    const attendances = await LabourAttendance.find(query)
      .populate("project", "name")
      .sort({ date: 1 })
      .lean();

    // Get all days in month
    const daysInMonth = end.getDate();
    const monthData = [];
    const statusCount = { present: 0, absent: 0, "half-day": 0, holiday: 0 };

    // Create a map for quick lookup
    const attendanceMap = {};
    attendances.forEach(a => {
      const dateKey = new Date(a.date).getDate();
      attendanceMap[dateKey] = a;
      if (statusCount[a.status] !== undefined) statusCount[a.status]++;
    });

    // Build monthly data
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday
      const attendance = attendanceMap[d];
      monthData.push({
        day: d,
        date: dateObj.toISOString().split("T")[0],
        dayName: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        status: attendance ? attendance.status : "not-marked",
        checkInTime: attendance?.checkInTime || null,
        checkOutTime: attendance?.checkOutTime || null,
        project: attendance?.project?.name || null,
        attendanceId: attendance?._id || null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        labour: labour,
        month,
        year,
        daysInMonth,
        summary: {
          totalDays: daysInMonth,
          ...statusCount,
          notMarked: daysInMonth - attendances.length,
        },
        attendances: monthData,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}