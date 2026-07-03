import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LabourWork from "@/models/contruction/LabourWork";
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

// GET: List labour works with filters
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const labourId = searchParams.get("labourId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);

    // Get single work
    if (id) {
      const work = await LabourWork.findOne({ _id: id, companyId: user.companyId })
        .populate("project", "name")
        .populate("assignedLabours", "name skill dailyRate phone")
        .populate("progressLogs.labourId", "name")
        .populate("progressLogs.createdBy", "name")
        .populate("createdBy", "name")
        .lean();
      if (!work) return NextResponse.json({ success: false, message: "Work not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: work });
    }

    // Build query
    const query = { companyId: user.companyId };
    if (projectId) query.project = projectId;
    if (labourId) query.assignedLabours = labourId;
    if (statusFilter) query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [works, total] = await Promise.all([
      LabourWork.find(query)
        .populate("project", "name")
        .populate("assignedLabours", "name skill dailyRate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LabourWork.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: works,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST: Create new labour work assignment
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // Validate project
    const project = await Project.findOne({ _id: body.project, company: user.companyId });
    if (!project) return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });

    // Validate all labours belong to company
    if (body.assignedLabours && body.assignedLabours.length > 0) {
      const labours = await Labour.find({
        _id: { $in: body.assignedLabours },
        companyId: user.companyId,
      });
      if (labours.length !== body.assignedLabours.length) {
        return NextResponse.json({ success: false, message: "Invalid labour(s) selected" }, { status: 400 });
      }
    }

    const workData = {
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
      status: body.status || "assigned",
      startDate: body.startDate || new Date(),
    };

    const work = new LabourWork(workData);
    await work.save();

    // Populate for response
    await work.populate("project", "name");
    await work.populate("assignedLabours", "name skill");

    return NextResponse.json({ success: true, data: work }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to create work" }, { status: 500 });
  }
}
