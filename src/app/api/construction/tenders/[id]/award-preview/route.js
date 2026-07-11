import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
import TenderBid from "@/models/contruction/TenderBid";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";


// ─── Auth ──────────────────────────────────────────────────────────────────
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
      .populate("project boq")
      .lean();
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }

    // Find highest scored bid
    const bestBid = await TenderBid.findOne({ tender: id, companyId: user.companyId })
      .sort({ overallScore: -1 })
      .populate("vendor")
      .lean();

    if (!bestBid) {
      return NextResponse.json({ success: false, message: "No bid found to award" }, { status: 404 });
    }

    const workOrderPreview = {
      workOrderNumber: `WO-${Date.now().toString().slice(-6)}`,
      project: tender.project,
      boq: tender.boq,
      contractor: bestBid.vendor,
      items: bestBid.items,
      total: bestBid.totalAmount,
      remarks: `Awarded from tender ${tender.tenderNumber}`,
    };

    return NextResponse.json({ success: true, data: workOrderPreview });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}