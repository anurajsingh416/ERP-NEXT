import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
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

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const tender = await Tender.findOne({ _id: id, companyId: user.companyId })
      .populate("project", "name")
      .populate("boq", "boqNumber")
      .populate("createdBy", "name")
      .populate("interestedVendors.vendor", "name")
      .lean();
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: tender });
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
    const body = await req.json();
    const tender = await Tender.findOne({ _id: id, companyId: user.companyId });
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }

    if (tender.status === "awarded" || tender.status === "cancelled") {
      return NextResponse.json({ success: false, message: "Cannot update awarded or cancelled tender" }, { status: 400 });
    }

    const updatable = ["title", "description", "preQualification", "submissionDeadline", "evaluationCriteria"];
    for (const field of updatable) {
      if (body[field] !== undefined) tender[field] = body[field];
    }

    await tender.save();
    return NextResponse.json({ success: true, data: tender });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const tender = await Tender.findOne({ _id: id, companyId: user.companyId });
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }
    if (tender.status !== "draft") {
      return NextResponse.json({ success: false, message: "Can only delete draft tenders" }, { status: 400 });
    }
    await Tender.deleteOne({ _id: id });
    return NextResponse.json({ success: true, message: "Tender deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}