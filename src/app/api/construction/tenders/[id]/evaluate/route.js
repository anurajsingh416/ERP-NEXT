import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
import TenderBid from "@/models/contruction/TenderBid";
import TenderEvaluation from "@/models/contruction/TenderEvaluation";
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


export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const { bidId, technicalScore, commercialScore, remarks } = body;

    if (!bidId || technicalScore === undefined || commercialScore === undefined) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const tender = await Tender.findOne({ _id: id, companyId: user.companyId });
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }

    const bid = await TenderBid.findOne({ _id: bidId, tender: id, companyId: user.companyId });
    if (!bid) {
      return NextResponse.json({ success: false, message: "Bid not found" }, { status: 404 });
    }

    // Update bid scores
    bid.technicalScore = parseFloat(technicalScore) || 0;
    bid.commercialScore = parseFloat(commercialScore) || 0;
    const { technicalWeight = 40, commercialWeight = 60 } = tender.evaluationCriteria || {};
    bid.overallScore = (bid.technicalScore * technicalWeight / 100) + (bid.commercialScore * commercialWeight / 100);
    bid.status = "evaluated";
    await bid.save();

    // Create evaluation log
    const evaluation = new TenderEvaluation({
      tender: id,
      bid: bidId,
      evaluator: user.id || user._id,
      technicalScore: bid.technicalScore,
      commercialScore: bid.commercialScore,
      remarks,
      companyId: user.companyId,
    });
    await evaluation.save();

    return NextResponse.json({ success: true, data: bid });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}