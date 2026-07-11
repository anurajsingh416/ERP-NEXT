import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "project coordinator",
    "site supervisor", "accounts manager", "purchase manager",
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

// ─── GET (list) ──────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

    const query = { companyId: user.companyId };
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;
    if (projectId) query.project = projectId;

    const skip = (page - 1) * limit;
    const [tenders, total] = await Promise.all([
      Tender.find(query)
        .populate("project", "name")
        .populate("boq", "boqNumber")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Tender.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: tenders,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /tenders error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST (create) ──────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    console.log("📥 Received tender payload:", JSON.stringify(body, null, 2));

    const {
      title,
      description,
      boq,
      project,
      preQualification,
      submissionDeadline,
      evaluationCriteria,
      tenderNumber,
    } = body;

    // ─── Validate required fields ──────────────────────────────────
    if (!title || !boq || !project || !submissionDeadline) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: title, boq, project, submissionDeadline" },
        { status: 400 }
      );
    }

    // ─── Validate BOQ ──────────────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(boq)) {
      return NextResponse.json(
        { success: false, message: "Invalid BOQ ID format" },
        { status: 400 }
      );
    }

    // Try both `company` and `companyId` (your BOQ schema may use either)
    let boqDoc = await BOQ.findOne({ _id: boq, company: user.companyId });
    if (!boqDoc) {
      boqDoc = await BOQ.findOne({ _id: boq, companyId: user.companyId });
    }

    if (!boqDoc) {
      // Check if BOQ exists at all (ignoring company) for a better error message
      const anyBoq = await BOQ.findById(boq).lean();
      if (!anyBoq) {
        return NextResponse.json(
          {
            success: false,
            message: `BOQ with ID "${boq}" not found. Please check the ID.`,
          },
          { status: 404 }
        );
      } else {
        // BOQ exists but belongs to another company
        return NextResponse.json(
          {
            success: false,
            message: `BOQ "${anyBoq.boqNumber || boq}" belongs to another company. Access denied.`,
          },
          { status: 403 }
        );
      }
    }

    console.log(`✅ Found BOQ: ${boqDoc.boqNumber} (${boqDoc._id})`);

    // ─── Validate Project ──────────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(project)) {
      return NextResponse.json(
        { success: false, message: "Invalid Project ID format" },
        { status: 400 }
      );
    }

    let projectDoc = await Project.findOne({ _id: project, company: user.companyId });
    if (!projectDoc) {
      projectDoc = await Project.findOne({ _id: project, companyId: user.companyId });
    }

    if (!projectDoc) {
      const anyProject = await Project.findById(project).lean();
      if (!anyProject) {
        return NextResponse.json(
          {
            success: false,
            message: `Project with ID "${project}" not found.`,
          },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            message: `Project "${anyProject.name}" belongs to another company.`,
          },
          { status: 403 }
        );
      }
    }

    console.log(`✅ Found Project: ${projectDoc.name} (${projectDoc._id})`);

    // ─── Generate tender number ────────────────────────────────────
    const count = await Tender.countDocuments({ companyId: user.companyId });
    const tenderNumberFinal = tenderNumber || `TENDER-${String(count + 1).padStart(6, "0")}`;

    // ─── Create Tender ─────────────────────────────────────────────
    const tender = new Tender({
      tenderNumber: tenderNumberFinal,
      title,
      description: description || "",
      boq: boqDoc._id,
      project: projectDoc._id,
      preQualification: preQualification || [],
      submissionDeadline: new Date(submissionDeadline),
      evaluationCriteria: evaluationCriteria || { technicalWeight: 40, commercialWeight: 60 },
      timeline: [{ event: "created", description: "Tender created", user: user.id || user._id }],
      createdBy: user.id || user._id,
      companyId: user.companyId,
    });

    await tender.save();

    // Populate for response
    await tender.populate([
      { path: "project", select: "name" },
      { path: "boq", select: "boqNumber" },
    ]);

    return NextResponse.json({
      success: true,
      data: tender,
      message: "Tender created successfully",
    });
  } catch (err) {
    console.error("❌ POST /tenders error:", err);

    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Tender number already exists" },
        { status: 409 }
      );
    }

    // Handle validation errors (e.g., invalid date)
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return NextResponse.json(
        { success: false, message: `Validation error: ${messages.join(", ")}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: err.message || "Failed to create tender" },
      { status: 500 }
    );
  }
}