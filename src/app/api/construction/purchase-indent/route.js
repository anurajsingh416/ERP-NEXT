import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseIndent from "@/models/contruction/PurchaseIndent";
import Project from "@/models/project/ProjectModel";
import BOQ from "@/models/contruction/BOQ";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin",
    "project manager",
    "purchase manager",
    "accounts manager",
    "site engineer",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
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

// ─── GET: List purchase indents ────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);

    if (id) {
      const indent = await PurchaseIndent.findOne({ _id: id, companyId: user.companyId })
        .populate("project", "name")
        .populate("boq", "boqNumber")
        .populate("items.itemId", "itemName uom")
        .populate("createdBy", "name")
        .lean();
      if (!indent) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: indent });
    }

    const query = { companyId: user.companyId };
    if (projectId) query.project = projectId;
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [indents, total] = await Promise.all([
      PurchaseIndent.find(query)
        .populate("project", "name")
        .populate("boq", "boqNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseIndent.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: indents,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST: Create purchase indent manually (optional) ──────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const {
      project,
      boq,
      indentNumber,
      requiredDate,
      items,
      priority,
      remarks,
    } = body;

    // Validate project
    const projectDoc = await Project.findOne({ _id: project, company: user.companyId });
    if (!projectDoc) return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });

    // Validate BOQ (if provided)
    if (boq) {
      const boqDoc = await BOQ.findOne({ _id: boq, companyId: user.companyId });
      if (!boqDoc) return NextResponse.json({ success: false, message: "Invalid BOQ" }, { status: 400 });
    }

    // Auto-generate indent number
    let finalIndentNumber = indentNumber;
    if (!finalIndentNumber) {
      const count = await PurchaseIndent.countDocuments({ companyId: user.companyId });
      finalIndentNumber = `PI-${String(count + 1).padStart(5, "0")}`;
    }

    const indentData = {
      companyId: user.companyId,
      project,
      boq: boq || null,
      indentNumber: finalIndentNumber,
      indentDate: new Date(),
      requiredDate: requiredDate || null,
      items,
      priority: priority || "medium",
      remarks,
      createdBy: user.id,
    };

    const indent = new PurchaseIndent(indentData);
    await indent.save();

    return NextResponse.json({ success: true, data: indent }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to create indent" }, { status: 500 });
  }
}
