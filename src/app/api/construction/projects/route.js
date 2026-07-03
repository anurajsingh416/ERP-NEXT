import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "project coordinator",
    "sales manager", "accounts manager"
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

// GET: list projects with search, pagination, stats, or single by id
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const stats = searchParams.get("stats") === "true";
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const projectType = searchParams.get("projectType");
    const statusFilter = searchParams.get("status");

    // 1) Single project (full data)
    if (id) {
      const project = await Project.findOne({ _id: id, company: user.companyId })
        .populate("workspace", "name")
        .populate("customer", "customerName")
        .populate("members", "name email")
        // contractor removed
        .lean();
      if (!project) return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: project });
    }

    // 2) Stats endpoint (counts by status / projectType)
    if (stats) {
      const aggregation = await Project.aggregate([
        { $match: { company: user.companyId } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      const result = { total: 0, active: 0, "on-hold": 0, completed: 0, archived: 0 };
      aggregation.forEach(s => {
        if (s._id === "active") result.active = s.count;
        else if (s._id === "on-hold") result["on-hold"] = s.count;
        else if (s._id === "completed") result.completed = s.count;
        else if (s._id === "archived") result.archived = s.count;
        result.total += s.count;
      });
      return NextResponse.json({ success: true, data: result });
    }

    // 3) Build query
    const query = { company: user.companyId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { siteAddress: { $regex: search, $options: "i" } },
      ];
    }
    if (projectType && projectType !== "All") {
      query.projectType = projectType;
    }
    if (statusFilter && statusFilter !== "All") {
      query.status = statusFilter;
    }

    const skip = (page - 1) * limit;
    const [projects, total] = await Promise.all([
      Project.find(query)
        .select("name customer projectType siteAddress status priority dueDate startDate members estimatedCosting laborBudget billingType retentionPercentage progressMilestones boqReference")
        .populate("members", "name")
        .populate("customer", "customerName customerCode contactPersonName")
        // contractor removed
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Project.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: projects,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST: create a new construction project
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();

    // Required fields (matching frontend)
    const required = ["name", "workspace"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    // Build project object – spread data, but ensure owner and company are set from token
    const projectData = {
      ...data,
      company: user.companyId,
      owner: user.id, // user.id is the CompanyUser _id
    };

    const project = new Project(projectData);
    await project.save();

    // Populate some fields for response
    await project.populate([
      { path: "workspace", select: "name" },
      { path: "customer", select: "customerName" },
      { path: "members", select: "name email" },
    ]);

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create project" }, { status: 500 });
  }
}
