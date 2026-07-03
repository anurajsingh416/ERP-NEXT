import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import WorkOrder from "@/models/contruction/workOrder";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import Supplier from "@/models/SupplierModels";
import Customer from "@/models/CustomerModel";
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
    const id = searchParams.get("id");
    const boqId = searchParams.get("boqId");
    const projectId = searchParams.get("projectId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

    // Single work order by ID
    if (id) {
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
    }

    // Build query
    const query = { companyId: user.companyId };
    if (boqId) query.boq = boqId;
    if (projectId) query.project = projectId;
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [workOrders, total] = await Promise.all([
      WorkOrder.find(query)
        .populate("project", "name")
        .populate("boq", "boqNumber")
        .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
        .populate("customer", "customerName customerCode contactPersonName mobileNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WorkOrder.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: workOrders,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /work-orders error:", err);
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
    console.log("📥 Received work order payload:", JSON.stringify(body, null, 2));

    const { project, boq, contractor, workOrderNumber, items, issuedDate, materials } = body;
    const orderType = body.orderType === "customer" ? "customer" : "contractor";
    if (!project || !boq || !workOrderNumber) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: project, boq, and workOrderNumber." },
        { status: 400 }
      );
    }

    // Validate project
    const projectDoc = await Project.findOne({ _id: project, company: user.companyId })
      .populate("customer", "customerName customerCode contactPersonName mobileNumber");
    if (!projectDoc) return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });

    // Validate BOQ
    const boqDoc = await BOQ.findOne({ _id: boq, companyId: user.companyId });
    if (!boqDoc) return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    if (String(boqDoc.project) !== String(projectDoc._id)) {
      return NextResponse.json({ success: false, message: "BOQ does not belong to selected project" }, { status: 400 });
    }

    const customerId = orderType === "customer" ? projectDoc.customer?._id || projectDoc.customer : null;
    if (orderType === "customer" && !customerId) {
      return NextResponse.json(
        { success: false, message: "Selected project has no customer linked." },
        { status: 400 }
      );
    }

    if (orderType === "contractor" && (!items || !Array.isArray(items) || items.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Please add at least one item." },
        { status: 400 }
      );
    }

    // Optional contractor validation
    let contractorId = null;
    if (orderType === "contractor" && contractor) {
      const contractorDoc = await Supplier.findOne({ _id: contractor, companyId: user.companyId });
      if (contractorDoc) {
        contractorId = contractorDoc._id;
      } else {
        console.warn(`⚠️ Contractor ${contractor} not found – will be set to null`);
      }
    }

    if (orderType === "contractor" && !contractorId) {
      return NextResponse.json({ success: false, message: "Please select a valid contractor." }, { status: 400 });
    }

    const sourceItems = orderType === "customer" ? boqDoc.items || [] : items;
    if (!sourceItems.length) {
      return NextResponse.json({ success: false, message: "Selected BOQ has no items." }, { status: 400 });
    }

    // Map items
    const mappedItems = sourceItems.map(item => ({
      boqItemId: item.boqItemId || item._id || null,
      itemName: (item.itemName || item.description || "").trim(),
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
      consumedQty: 0,
      consumedAmount: 0,
    }));

    // Map materials (if provided) – include transferFromStock
    const mappedMaterials = Array.isArray(materials)
      ? materials.map(mat => ({
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
        }))
      : [];

    // Get user ID from token (fallback chain)
    const userId = user.id || user._id || user.userId;
    if (!userId) {
      console.error("❌ No user ID found in token:", user);
      return NextResponse.json(
        { success: false, message: "Invalid user token – missing user ID" },
        { status: 401 }
      );
    }

    const workOrder = new WorkOrder({
      workOrderNumber,
      project,
      boq,
      orderType,
      customer: customerId,
      contractor: contractorId,
      materials: mappedMaterials,
      items: mappedItems,
      status: body.status || "draft",
      issuedDate: issuedDate || new Date(),
      expectedStart: body.expectedStart,
      expectedEnd: body.expectedEnd,
      remarks: body.remarks?.trim() || "",
      createdBy: userId,
      companyId: user.companyId,
    });

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
    console.error("❌ POST /work-orders error:", err);
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Work order number already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create work order" },
      { status: 500 }
    );
  }
}
