import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Labour from "@/models/contruction/Labour";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ---------- Auth helpers (same as above) ----------
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

// ---------- GET single labour ----------
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const labour = await Labour.findOne({
      _id: params.id,
      companyId: user.companyId,
    })
      .populate("project", "name")
      .lean();
    if (!labour)
      return NextResponse.json(
        { success: false, message: "Labour not found" },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data: labour });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// ---------- PUT: Update labour ----------
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const updated = await Labour.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      { ...body },
      { new: true, runValidators: true }
    );
    if (!updated)
      return NextResponse.json(
        { success: false, message: "Labour not found" },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Update failed" },
      { status: 500 }
    );
  }
}

// ---------- DELETE: Remove labour ----------
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const deleted = await Labour.findOneAndDelete({
      _id: params.id,
      companyId: user.companyId,
    });
    if (!deleted)
      return NextResponse.json(
        { success: false, message: "Labour not found" },
        { status: 404 }
      );
    return NextResponse.json({ success: true, message: "Labour deleted" });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Delete failed" },
      { status: 500 }
    );
  }
}