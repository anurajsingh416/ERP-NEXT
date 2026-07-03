import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import BOQ from "@/models/contruction/BOQ";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "accounts manager", "site engineer"
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
    const { boqId, progressPercentage } = await req.json();

    const boq = await BOQ.findOne({ _id: boqId, companyId: user.companyId })
      .populate("project", "name")
      .lean();

    if (!boq) {
      return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    }

    // Calculate items based on progress
    const items = boq.items.map((item) => ({
      boqItemId: item._id,
      description: item.description,
      unit: item.unit,
      quantity: (item.quantity * (progressPercentage || 0)) / 100,
      rate: item.rate,
      amount: (item.amount * (progressPercentage || 0)) / 100,
    }));

    // Filter items with quantity > 0
    const filteredItems = items.filter((item) => item.quantity > 0);

    return NextResponse.json({
      success: true,
      data: {
        project: boq.project,
        boq: boq,
        items: filteredItems,
        subtotal: filteredItems.reduce((sum, item) => sum + item.amount, 0),
        progressPercentage: progressPercentage || 0,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}