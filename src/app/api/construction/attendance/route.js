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

// GET: List attendance with filters
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const labourId = searchParams.get("labourId");
    const projectId = searchParams.get("projectId");
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100);

    const query = { companyId: user.companyId };

    if (labourId) query.labour = labourId;
    if (projectId) query.project = projectId;

    // Date filter: single day
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Month filter: full month
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const skip = (page - 1) * limit;
    const [attendances, total] = await Promise.all([
      LabourAttendance.find(query)
        .populate("labour", "name skill dailyRate phone")
        .populate("project", "name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LabourAttendance.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: attendances,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST: Mark attendance (single or bulk)
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { labourId, projectId, date, status, checkInTime, checkOutTime, remarks } = body;

    // Validate labour belongs to company
    const labour = await Labour.findOne({ _id: labourId, companyId: user.companyId });
    if (!labour) return NextResponse.json({ success: false, message: "Invalid labour" }, { status: 400 });

    // Validate project belongs to company
    const project = await Project.findOne({ _id: projectId, company: user.companyId });
    if (!project) return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });

    // Check if attendance already exists for this labour on this date
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const existing = await LabourAttendance.findOne({
      labour: labourId,
      project: projectId,
      date: { $gte: start, $lte: end },
      companyId: user.companyId,
    });

    let attendance;
    if (existing) {
      // Update existing
      attendance = await LabourAttendance.findOneAndUpdate(
        { _id: existing._id },
        { status, checkInTime, checkOutTime, remarks, updatedBy: user.id },
        { new: true, runValidators: true }
      );
    } else {
      // Create new
      attendance = new LabourAttendance({
        companyId: user.companyId,
        project: projectId,
        labour: labourId,
        date,
        status,
        checkInTime,
        checkOutTime,
        remarks,
        createdBy: user.id,
      });
      await attendance.save();
    }

    return NextResponse.json({ success: true, data: attendance }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to mark attendance" }, { status: 500 });
  }
}
