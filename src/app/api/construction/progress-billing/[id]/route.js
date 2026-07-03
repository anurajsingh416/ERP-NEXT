import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ProgressBill from "@/models/contruction/ProgressBilling";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import Supplier from "@/models/SupplierModels";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";



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

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }
 const bill = await ProgressBill.findOne({ _id: id, companyId: user.companyId })
  .populate("project", "name")
  .populate("boq", "boqNumber")
  .populate("workOrder", "workOrderNumber orderType")
  .populate("contractor", "name supplierName")
  .populate("customer", "name customerName")
  .populate("createdBy", "name")
  .populate("payments.receivedBy", "name")
  .lean();
    if (!bill) {
      return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: bill });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const bill = await ProgressBill.findOne({ _id: id, companyId: user.companyId });
    if (!bill) {
      return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
    }

    // Allowed fields to update
    const updatable = ["status", "billDate", "dueDate", "remarks", "items", "taxVAT", "taxService"];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        if (field === "items" && Array.isArray(body.items)) {
          bill.items = body.items.map(item => {
            const amount = (parseFloat(item.billedQuantity) || 0) * (parseFloat(item.rate) || 0);
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
          bill.total = bill.items.reduce((sum, i) => sum + (i.amount || 0), 0);
          bill.grandTotal = bill.total + (bill.taxVAT || 0) + (bill.taxService || 0);
        } else if (field === "taxVAT" || field === "taxService") {
          bill[field] = parseFloat(body[field]) || 0;
          bill.grandTotal = bill.total + (bill.taxVAT || 0) + (bill.taxService || 0);
        } else {
          bill[field] = body[field];
        }
      }
    }

    await bill.save();
    await bill.populate([
      { path: "project", select: "name" },
      { path: "boq", select: "boqNumber" },
      { path: "contractor", select: "name supplierName" },
      { path: "customer", select: "name customerName" },
      { path: "workOrder", select: "workOrderNumber" },
      { path: "createdBy", select: "name" },
    ]);

    return NextResponse.json({ success: true, data: bill });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const bill = await ProgressBill.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!bill) {
      return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Bill deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}