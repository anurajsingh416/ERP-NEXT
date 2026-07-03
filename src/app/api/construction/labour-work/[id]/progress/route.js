
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LabourWork from "@/models/contruction/LabourWork";

import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "site supervisor",
    "hr manager", "labour supervisor"
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

export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { labourId, description, hoursWorked, status: logStatus } = body;

    // Find work
    const work = await LabourWork.findOne({ _id: params.id, companyId: user.companyId });
    if (!work) return NextResponse.json({ success: false, message: "Work not found" }, { status: 404 });

    // Add progress log
    work.progressLogs.push({
      date: new Date(),
      labourId,
      description,
      hoursWorked: hoursWorked || 0,
      status: logStatus || "in-progress",
      createdBy: user.id,
    });

    // Update actual days/hours
    work.actualHours = (work.actualHours || 0) + (hoursWorked || 0);
    work.actualDays = Math.ceil(work.actualHours / 8); // Assuming 8 hours = 1 day

    // Update status if needed
    if (logStatus === "completed-day") {
      // Check if all work is done
      if (work.actualDays >= work.estimatedDays) {
        work.status = "completed";
        work.endDate = new Date();
      } else {
        work.status = "in-progress";
      }
    }

    await work.save();

    return NextResponse.json({ success: true, data: work });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to add progress" }, { status: 500 });
  }
}