import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LabourWorkAssignment from "@/models/contruction/LabourWorkAssignment";
import Labour from "@/models/contruction/Labour";
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
    const { assignmentId, workDoneToday, remarks } = body;

    const assignment = await LabourWorkAssignment.findOne({
      _id: assignmentId,
      companyId: user.companyId,
    });
    if (!assignment) return NextResponse.json({ success: false, message: "Assignment not found" }, { status: 404 });

    // Update work done and add daily update log
    assignment.workDone += parseFloat(workDoneToday) || 0;
    assignment.dailyUpdates.push({
      date: new Date(),
      workDoneToday: parseFloat(workDoneToday) || 0,
      remarks,
      updatedBy: user.id,
    });
    // Save triggers pre-save hook to update status/progress
    await assignment.save();

    return NextResponse.json({
      success: true,
      data: assignment,
      message: `Progress updated. Total: ${assignment.workDone} / ${assignment.targetQuantity}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Update failed" }, { status: 500 });
  }
}