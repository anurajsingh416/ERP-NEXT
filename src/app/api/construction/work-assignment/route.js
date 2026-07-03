import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LabourWork from "@/models/contruction/LabourWork";
import Labour from "@/models/contruction/Labour";
import Project from "@/models/project/ProjectModel";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";


function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "site supervisor",
    "labour supervisor"
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

// GET: List work assignments
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const labourId = searchParams.get("labourId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100);

    const query = { companyId: user.companyId };
    if (projectId) query.project = projectId;
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;
    if (labourId) query.assignedLabours = { $in: [labourId] };

    const skip = (page - 1) * limit;
    const [works, total] = await Promise.all([
      LabourWork.find(query)
        .populate("project", "name")
        .populate("assignedLabours", "name skill dailyRate phone")
        .populate("materialsUsed.materialId", "itemName uom")
        .populate("progressLogs.labourId", "name")
        .populate("createdBy", "name")
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

// POST: Create work assignment
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const {
      project,
      assignedLabours,
      workTitle,
      workDescription,
      workType,
      location,
      estimatedDays,
      estimatedHours,
      startDate,
      endDate,
      materialsUsed,
      remarks,
    } = body;

    // Validate project
    const projectDoc = await Project.findOne({ _id: project, company: user.companyId });
    if (!projectDoc) return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });

    // Validate labours
    if (assignedLabours && assignedLabours.length > 0) {
      const labourDocs = await Labour.find({
        _id: { $in: assignedLabours },
        companyId: user.companyId,
      });
      if (labourDocs.length !== assignedLabours.length) {
        return NextResponse.json({ success: false, message: "One or more labours are invalid" }, { status: 400 });
      }
    }

    const workData = {
      companyId: user.companyId,
      project,
      assignedLabours: assignedLabours || [],
      workTitle,
      workDescription,
      workType: workType || "other",
      location,
      estimatedDays: parseFloat(estimatedDays) || 0.5,
      estimatedHours: parseFloat(estimatedHours) || 0,
      startDate: startDate || new Date(),
      endDate,
      materialsUsed: materialsUsed || [],
      remarks,
      createdBy: user.id,
    };

    const work = new LabourWork(workData);
    await work.save();

    // Populate for response
    await work.populate([
      { path: "project", select: "name" },
      { path: "assignedLabours", select: "name skill" },
    ]);

    return NextResponse.json({ success: true, data: work }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to create work" }, { status: 500 });
  }
}
