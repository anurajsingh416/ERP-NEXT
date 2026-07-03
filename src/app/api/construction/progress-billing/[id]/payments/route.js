import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ProgressBill from "@/models/contruction/ProgressBilling";
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

export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }
    const { amount, date, method, reference, note } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: "Amount required" }, { status: 400 });
    }

    const bill = await ProgressBill.findOne({ _id: id, companyId: user.companyId });
    if (!bill) {
      return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
    }

    const payment = {
      amount,
      date: date || new Date(),
      method: method || "cash",
      reference: reference || "",
      note: note || "",
      receivedBy: user.id || user._id,
    };
    bill.payments.push(payment);
    await bill.save();

    await bill.populate([
      { path: "payments.receivedBy", select: "name" },
    ]);

    return NextResponse.json({ success: true, data: bill });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}