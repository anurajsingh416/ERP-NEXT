import { NextResponse } from "next/server";
import { Parser } from "json2csv";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
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
    const { id } = await params;
    const format = req.nextUrl.searchParams.get("format") || "csv";

    const tender = await Tender.findOne({ _id: id, companyId: user.companyId })
      .populate("project boq")
      .lean();
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }

    const bids = await TenderBid.find({ tender: id, companyId: user.companyId })
      .populate("vendor")
      .lean();

    if (format === "csv") {
      const fields = [
        { label: "Vendor", value: (row) => row.vendor?.name || "—" },
        { label: "Total Amount", value: (row) => row.totalAmount || 0 },
        { label: "Status", value: (row) => row.status },
        { label: "Overall Score", value: (row) => row.overallScore || "—" },
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(bids);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=tender-${tender.tenderNumber}-bids.csv`,
        },
      });
    }

    // Return JSON (frontend can handle PDF/print)
    return NextResponse.json({ success: true, data: { tender, bids } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}