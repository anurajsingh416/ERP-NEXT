import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ProgressBill from "@/models/contruction/ProgressBilling";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import WorkOrder from "@/models/contruction/workOrder";
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

// ─── GET ─────────────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const boqId = searchParams.get("boqId");
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const orderType = searchParams.get("orderType");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // ── Single bill by ID ──
    if (id) {
      const bill = await ProgressBill.findOne({ _id: id, companyId: user.companyId })
        .populate("project", "name")
        .populate("boq", "boqNumber")
        .populate("workOrder", "workOrderNumber orderType")
        .populate("contractor", "name supplierName")
        .populate("customer", "name customerName")
        .lean();
      if (!bill) {
        return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: bill });
    }

    // ── List with filters ──
    const query = { companyId: user.companyId };
    if (boqId) query.boq = boqId;
    if (projectId) query.project = projectId;
    if (orderType && orderType !== "all") query.orderType = orderType;
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;

    const [bills, total] = await Promise.all([
      ProgressBill.find(query)
        .populate("project", "name")
        .populate("boq", "boqNumber")
        .populate("contractor", "name supplierName")
        .populate("customer", "name customerName")
        .populate("workOrder", "workOrderNumber")
        .sort({ billDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProgressBill.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: bills,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /progress-billing error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    console.log("📥 Received bill payload:", JSON.stringify(body, null, 2));

    const {
      boq,
      project,
      workOrder,
      items,
      billDate,
      dueDate,
      remarks,
      status: billStatus,
      orderType,
      taxVAT,
      taxService,
      contractor: providedContractor, // 👈 new
      customer: providedCustomer,     // 👈 new
    } = body;

    if (!project || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: project, items" },
        { status: 400 }
      );
    }

    // Validate Project
    const projectDoc = await Project.findOne({ _id: project, company: user.companyId });
    if (!projectDoc) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    // ── Resolve BOQ / Work Order ──
    let boqDoc = null;
    let workOrderDoc = null;
    let contractorId = providedContractor || null;
    let customerId = providedCustomer || null;

    if (boq) {
      boqDoc = await BOQ.findOne({ _id: boq, companyId: user.companyId })
        .populate("project contractor");
      if (!boqDoc) {
        return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
      }
      // Only use BOQ's contractor/customer if not explicitly provided
      if (!providedContractor && boqDoc.contractor) contractorId = boqDoc.contractor._id;
      if (!providedCustomer && boqDoc.customer) customerId = boqDoc.customer;
    }

    if (workOrder) {
      workOrderDoc = await WorkOrder.findOne({ _id: workOrder, companyId: user.companyId });
      if (!workOrderDoc) {
        return NextResponse.json({ success: false, message: "Work order not found" }, { status: 404 });
      }
      // If no BOQ was provided, use work order's BOQ to fill missing contractor/customer
      if (!boq) {
        boqDoc = await BOQ.findOne({ _id: workOrderDoc.boq, companyId: user.companyId });
        if (boqDoc) {
          if (!providedContractor && boqDoc.contractor) contractorId = boqDoc.contractor._id;
          if (!providedCustomer && boqDoc.customer) customerId = boqDoc.customer;
        }
      }
      // Override with work order's own contractor/customer if provided explicitly
      if (!providedContractor && workOrderDoc.contractor) contractorId = workOrderDoc.contractor;
      if (!providedCustomer && workOrderDoc.customer) customerId = workOrderDoc.customer;
    }

    // ── Determine final orderType ──
    let finalOrderType = orderType;
    if (!finalOrderType) {
      // Auto-detect: if customerId is set, use "customer", else "contractor"
      finalOrderType = customerId ? "customer" : "contractor";
    }

    // ── Validate that the chosen party exists ──
    if (finalOrderType === "customer" && !customerId) {
      return NextResponse.json(
        { success: false, message: "Customer is required for orderType='customer'" },
        { status: 400 }
      );
    }
    if (finalOrderType === "contractor" && !contractorId) {
      return NextResponse.json(
        { success: false, message: "Contractor is required for orderType='contractor'" },
        { status: 400 }
      );
    }

    // ── Map items ──
    let total = 0;
    const mappedItems = items.map((item) => {
      const amount = (parseFloat(item.billedQuantity) || 0) * (parseFloat(item.rate) || 0);
      total += amount;
      return {
        boqItemId: item.boqItemId || null,
        itemId: item.itemId || null,
        description: item.description || "",
        unit: item.unit || "nos",
        rate: parseFloat(item.rate) || 0,
        billedQuantity: parseFloat(item.billedQuantity) || 0,
        amount: amount,
        source: item.source || "boq",
        isCustom: item.isCustom || false,
      };
    });

    // ── Generate bill number ──
    const lastBill = await ProgressBill.findOne({ companyId: user.companyId })
      .sort({ billNumber: -1 })
      .lean();
    let nextNumber = 1;
    if (lastBill) {
      const parts = lastBill.billNumber.match(/\d+$/);
      if (parts) nextNumber = parseInt(parts[0]) + 1;
    }
    const billNumber = `BILL-${String(nextNumber).padStart(6, "0")}`;

    // ── Create bill ──
    const bill = new ProgressBill({
      billNumber,
      boq: boq || null,
      project,
      workOrder: workOrder || null,
      orderType: finalOrderType,
      contractor: contractorId,
      customer: customerId,
      items: mappedItems,
      total,
      taxVAT: parseFloat(taxVAT) || 0,
      taxService: parseFloat(taxService) || 0,
      grandTotal: total + (parseFloat(taxVAT) || 0) + (parseFloat(taxService) || 0),
      status: billStatus || "draft",
      billDate: billDate || new Date(),
      dueDate: dueDate || null,
      remarks: remarks || "",
      createdBy: user.id || user._id,
      companyId: user.companyId,
    });

    await bill.save();
    await bill.populate([
      { path: "project", select: "name" },
      { path: "boq", select: "boqNumber" },
      { path: "contractor", select: "name supplierName" },
      { path: "customer", select: "name customerName" },
      { path: "workOrder", select: "workOrderNumber" },
  
    ]);

    return NextResponse.json({
      success: true,
      message: "Bill created successfully",
      data: bill,
    });
  } catch (err) {
    console.error("❌ POST /progress-billing error:", err);
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Bill number already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create bill" },
      { status: 500 }
    );
  }
}