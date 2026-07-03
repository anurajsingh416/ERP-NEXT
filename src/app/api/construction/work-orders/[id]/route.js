import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import WorkOrder from "@/models/contruction/workOrder";
import CompanyUser from "@/models/CompanyUser";
import Supplier from "@/models/SupplierModels";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers (same as above) ──────────────────────────────────
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

// ─── GET (single) ────────────────────────────────────────────────────
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }
    const wo = await WorkOrder.findOne({ _id: id, companyId: user.companyId })
      .populate("project", "name")
      .populate("boq", "boqNumber")
      .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
      .populate("customer", "customerName customerCode contactPersonName mobileNumber")
      .populate("createdBy", "name")
      .lean();
    if (!wo) {
      return NextResponse.json({ success: false, message: "Work order not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: wo });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── PUT (update) ────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid work order ID" }, { status: 400 });
    }

    const body = await req.json();
    console.log("📥 Received work order update:", JSON.stringify(body, null, 2));

    const workOrder = await WorkOrder.findOne({ _id: id, companyId: user.companyId });
    if (!workOrder) {
      return NextResponse.json({ success: false, message: "Work order not found" }, { status: 404 });
    }

    // Update allowed fields
    const updatable = ["status", "issuedDate", "expectedStart", "expectedEnd", "remarks", "contractor"];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        workOrder[field] = body[field];
      }
    }

    // Update items if provided
    if (body.items && Array.isArray(body.items)) {
      workOrder.items = body.items.map(item => ({
        boqItemId: item.boqItemId || null,
        itemName: (item.itemName || "").trim(),
        description: (item.description || item.itemName || "No description").trim(),
        unit: (item.unit || "nos").trim(),
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || 0,
        section: (item.section || "Other Work").trim(),
        subSection: (item.subSection || "Main").trim(),
        subSectionIndex: parseInt(item.subSectionIndex) || 1,
        isRateOnly: !!item.isRateOnly,
        transferFromStock: !!item.transferFromStock,
        consumedQty: item.consumedQty ?? 0,
        consumedAmount: item.consumedAmount ?? 0,
      }));
    }

    // Update materials if provided
    if (body.materials && Array.isArray(body.materials)) {
      workOrder.materials = body.materials.map(mat => ({
        itemId: mat.itemId || null,
        itemName: mat.itemName || "",
        quantity: parseFloat(mat.quantity) || 0,
        unit: mat.unit || "nos",
        rate: parseFloat(mat.rate) || 0,
        amount: parseFloat(mat.amount) || 0,
        section: mat.section || "Other Work",
        subSection: mat.subSection || "Main",
        subSectionIndex: parseInt(mat.subSectionIndex) || 1,
        isRateOnly: !!mat.isRateOnly,
        type: mat.type || "material",
        transferFromStock: !!mat.transferFromStock,   // ✅ added
        consumedQty: mat.consumedQty ?? 0,
        consumedAmount: mat.consumedAmount ?? 0,
      }));
    }

    await workOrder.save();
    await workOrder.populate([
      { path: "project", select: "name" },
      { path: "boq", select: "boqNumber" },
      { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
      { path: "customer", select: "customerName customerCode contactPersonName mobileNumber" },
      { path: "createdBy", select: "name" },
    ]);

    return NextResponse.json({ success: true, data: workOrder });
  } catch (err) {
    console.error("❌ PUT /work-orders/:id error:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return NextResponse.json(
        { success: false, message: `Validation error: ${messages.join(", ")}` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }
    const deleted = await WorkOrder.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Work order not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Work order deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}
