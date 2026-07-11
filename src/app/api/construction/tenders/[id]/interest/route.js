import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
import Supplier from "@/models/SupplierModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Auth helpers...
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
    const { vendorId } = await req.json();
    if (!vendorId) {
      return NextResponse.json({ success: false, message: "Vendor ID required" }, { status: 400 });
    }

    const tender = await Tender.findOne({ _id: id, companyId: user.companyId });
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }

    // Check vendor exists
    const vendor = await Supplier.findOne({ _id: vendorId, companyId: user.companyId });
    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }

    // Already registered?
    if (tender.interestedVendors.some(v => v.vendor.toString() === vendorId)) {
      return NextResponse.json({ success: false, message: "Vendor already registered" }, { status: 400 });
    }

    tender.interestedVendors.push({ vendor: vendorId });
    tender.timeline.push({
      event: "vendor_registered",
      description: `Vendor ${vendor.name} registered interest`,
      user: user.id || user._id,
    });
    await tender.save();

    return NextResponse.json({ success: true, data: tender });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}