import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import WorkOrder from "@/models/contruction/workOrder";
import WorkspaceModel from "@/models/project/WorkspaceModel";
import CustomerModel from "@/models/CustomerModel";
import Boq from "@/models/contruction/BOQ";


import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "project coordinator",
    "sales manager", "accounts manager"
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
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
    const project = await Project.findOne({ _id: params.id, company: user.companyId })
      .populate("workspace", "name")
      .populate("customer", "customerName")
      .populate("members", "name email")
      // contractor removed
      .lean();
    if (!project) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: project });
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
    const data = await req.json();

    // Prevent updating owner and company – they are set by the server
    delete data.owner;
    delete data.company;

    const updated = await Project.findOneAndUpdate(
      { _id: params.id, company: user.companyId },
      { ...data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    // Populate for response
    await updated.populate([
      { path: "workspace", select: "name" },
      { path: "customer", select: "customerName" },
      { path: "members", select: "name email" },
    ]);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const deleted = await Project.findOneAndDelete({ _id: params.id, company: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}
