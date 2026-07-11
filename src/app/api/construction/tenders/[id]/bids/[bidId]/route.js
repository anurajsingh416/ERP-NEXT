import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TenderBid from "@/models/contruction/TenderBid";
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
    const { id, bidId } = await params;
    const bid = await TenderBid.findOne({ _id: bidId, tender: id, companyId: user.companyId })
      .populate("vendor", "name supplierName")
      .populate("evaluation.evaluator", "name")
      .lean();
    if (!bid) {
      return NextResponse.json({ success: false, message: "Bid not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: bid });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}