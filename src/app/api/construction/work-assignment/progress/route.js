import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";

import Labour from "@/models/contruction/Labour";
import LabourWork from "@/models/contruction/LabourWork";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "site supervisor",
    "labour supervisor"
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


export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { workId, labourId, description, hoursWorked, status: logStatus } = body;

    // Validate work exists
    const work = await LabourWork.findOne({ _id: workId, companyId: user.companyId });
    if (!work) return NextResponse.json({ success: false, message: "Work not found" }, { status: 404 });

    // Validate labour is assigned to this work
    if (labourId && !work.assignedLabours.includes(labourId)) {
      return NextResponse.json({ success: false, message: "Labour is not assigned to this work" }, { status: 400 });
    }

    const progressLog = {
      date: new Date(),
      labourId: labourId || null,
      description,
      hoursWorked: parseFloat(hoursWorked) || 0,
      status: logStatus || "in-progress",
      createdBy: user.id,
    };

    work.progressLogs.push(progressLog);
    await work.save();

    return NextResponse.json({
      success: true,
      data: progressLog,
      message: "Progress log added successfully",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to add progress" }, { status: 500 });
  }
}