import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Labour from "@/models/contruction/Labour";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ---------- Authorization Helpers ----------
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin",
    "project manager",
    "site engineer",
    "site supervisor",
    "hr manager",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) =>
    allowedRoles.includes(role.trim().toLowerCase())
  );
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user))
      return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

// ---------- GET: List labours (with filters) ----------
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100);
    const search = searchParams.get("search") || "";
    const skill = searchParams.get("skill");
    const statusFilter = searchParams.get("status");

    // 1) Single labour by ID
    if (id) {
      const labour = await Labour.findOne({ _id: id, companyId: user.companyId })
        .populate("project", "name")
        .lean();
      if (!labour)
        return NextResponse.json(
          { success: false, message: "Labour not found" },
          { status: 404 }
        );
      return NextResponse.json({ success: true, data: labour });
    }

    // 2) Build query
    const query = { companyId: user.companyId };
    if (projectId) query.project = projectId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { contractor: { $regex: search, $options: "i" } },
      ];
    }
    if (skill && skill !== "All") query.skill = skill;
    if (statusFilter && statusFilter !== "All") query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [labours, total] = await Promise.all([
      Labour.find(query)
        .populate("project", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Labour.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: labours,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// ---------- POST: Create new labour ----------
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // Validate required fields
    const required = ["project", "name", "dailyRate"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate project belongs to same company
    const project = await Project.findOne({
      _id: body.project,
      companyId: user.companyId,
    });
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Invalid project" },
        { status: 400 }
      );
    }

    const labourData = {
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
    };

    const labour = new Labour(labourData);
    await labour.save();

    return NextResponse.json(
      { success: true, data: labour },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create labour" },
      { status: 500 }
    );
  }
}