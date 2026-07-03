import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DailyReport from "@/models/contruction/DailyReport";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "project coordinator",
    "site supervisor"
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
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Single report by ID
    if (id) {
      const report = await DailyReport.findOne({ _id: id, companyId: user.companyId })
        .populate("project", "name")
        .populate("createdBy", "name")
        .lean();
      if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: report });
    }

    // Build query
    const query = { companyId: user.companyId };
    if (projectId) query.project = projectId;
    if (fromDate || toDate) {
      query.reportDate = {};
      if (fromDate) query.reportDate.$gte = new Date(fromDate);
      if (toDate) query.reportDate.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      DailyReport.find(query)
        .populate("project", "name")
        .populate("createdBy", "name")
        .sort({ reportDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DailyReport.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: reports,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // Validate project belongs to company
    const project = await Project.findOne({ _id: body.project, company: user.companyId });
    if (!project) return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });

    // Ensure at least one section has data
    const hasData =
      (body.workInProgress && body.workInProgress.length > 0) ||
      (body.tomorrowPlan && body.tomorrowPlan.length > 0) ||
      (body.issues && body.issues.length > 0) ||
      (body.manpower && body.manpower.length > 0) ||
      (body.materialStock && body.materialStock.length > 0) ||
      (body.materialConsumption && body.materialConsumption.length > 0);
    if (!hasData) {
      return NextResponse.json({ success: false, message: "At least one section must have data" }, { status: 400 });
    }

    const reportData = {
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
    };

    const report = new DailyReport(reportData);
    await report.save();
    return NextResponse.json({ success: true, data: report }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to create report" }, { status: 500 });
  }
}
