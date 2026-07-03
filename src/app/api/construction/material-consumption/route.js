import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaterialConsumption from "@/models/contruction/MaterialConsumption";
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

// ─── GET: list material consumption with filters ────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const workOrderId = searchParams.get("workOrderId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

    const query = { companyId: user.companyId };
    if (projectId) query.project = projectId;
    if (workOrderId) query.workOrderId = workOrderId;
    if (startDate || endDate) {
      query.consumptionDate = {};
      if (startDate) query.consumptionDate.$gte = new Date(startDate);
      if (endDate) query.consumptionDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [consumptions, total] = await Promise.all([
      MaterialConsumption.find(query)
        .populate("project", "name")
        .populate("workOrderId", "workOrderNumber")
        .populate("createdBy", "name")
        .sort({ consumptionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MaterialConsumption.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: consumptions,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /material-consumption error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST: create a new material consumption record ────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.project) {
      return NextResponse.json({ success: false, message: "Project is required" }, { status: 400 });
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ success: false, message: "At least one item is required" }, { status: 400 });
    }

    // Ensure each item has materialName
    for (const item of body.items) {
      if (!item.materialName || item.materialName.trim() === "") {
        return NextResponse.json(
          { success: false, message: "Each item must have a material name" },
          { status: 400 }
        );
      }
    }

    const payload = {
      ...body,
      createdBy: user.id,
      companyId: user.companyId,
    };

    const consumption = new MaterialConsumption(payload);
    await consumption.save();

    // Populate for response
    await consumption.populate([
      { path: "project", select: "name" },
      { path: "workOrderId", select: "workOrderNumber" },
    ]);

    return NextResponse.json({ success: true, data: consumption }, { status: 201 });
  } catch (err) {
    console.error("POST /material-consumption error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create consumption record" },
      { status: 500 }
    );
  }
}