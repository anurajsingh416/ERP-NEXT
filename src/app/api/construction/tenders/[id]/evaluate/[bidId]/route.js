import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
import TenderBid from "@/models/contruction/TenderBid";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Auth helpers...
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
    const { id, bidId } = await params;
    const body = await req.json();
    const { evaluations } = body; // [{criterion, score, remarks}]

    if (!evaluations || !Array.isArray(evaluations) || evaluations.length === 0) {
      return NextResponse.json({ success: false, message: "Evaluations required" }, { status: 400 });
    }

    const bid = await TenderBid.findOne({ _id: bidId, tender: id, companyId: user.companyId });
    if (!bid) {
      return NextResponse.json({ success: false, message: "Bid not found" }, { status: 404 });
    }

    // Save each evaluation
    bid.evaluation = evaluations.map(ev => ({
      criterion: ev.criterion,
      score: ev.score,
      remarks: ev.remarks,
      evaluator: user.id || user._id,
      evaluatedAt: new Date(),
    }));

    // Calculate overall (average of all scores)
    const total = evaluations.reduce((sum, ev) => sum + ev.score, 0);
    bid.overallScore = total / evaluations.length;
    bid.status = "evaluated";
    await bid.save();

    // Update tender timeline
    const tender = await Tender.findOne({ _id: id, companyId: user.companyId });
    tender.timeline.push({
      event: "evaluated",
      description: `Bid from ${bid.vendor} evaluated`,
      user: user.id || user._id,
    });
    await tender.save();

    return NextResponse.json({ success: true, data: bid });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}