import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LabourWork from "@/models/contruction/LabourWork";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "project manager", "site engineer", "site supervisor", "labour supervisor"];
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

// ─── GET: Single Labour Work ──────────────────────────────────────────────
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    // ✅ FIX: Await params before accessing its properties
    const { id } = await params;
    const work = await LabourWork.findOne({ _id: id, companyId: user.companyId })
      .populate("labour", "name skill dailyRate phone")
      .populate("project", "name")
      .lean();
    if (!work) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: work });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── PUT: Update Labour Work ──────────────────────────────────────────────
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    // ✅ FIX: Await params before accessing its properties
    const { id } = await params;

    const updated = await LabourWork.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...body, updatedBy: user.id },
      { new: true, runValidators: true }
    ).populate("labour", "name skill")
     .populate("project", "name");

    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

// ─── DELETE: Delete Labour Work ────────────────────────────────────────────
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    // ✅ FIX: Await params before accessing its properties
    const { id } = await params;
    const deleted = await LabourWork.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}