import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
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
    const { action } = await req.json();
    const tender = await Tender.findOne({ _id: id, companyId: user.companyId });
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }

    if (action === "publish") {
      if (tender.status === "published") {
        return NextResponse.json({ success: false, message: "Already published" }, { status: 400 });
      }
      if (tender.status === "awarded" || tender.status === "cancelled") {
        return NextResponse.json({ success: false, message: "Cannot publish" }, { status: 400 });
      }
      tender.status = "published";
      tender.publishDate = new Date();
      tender.timeline.push({ event: "published", description: "Tender published", user: user.id || user._id });
    } else if (action === "unpublish") {
      if (tender.status !== "published") {
        return NextResponse.json({ success: false, message: "Not published" }, { status: 400 });
      }
      tender.status = "draft";
      tender.publishDate = null;
      tender.timeline.push({ event: "published", description: "Tender unpublished", user: user.id || user._id });
    } else {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

    await tender.save();
    return NextResponse.json({ success: true, data: tender });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}