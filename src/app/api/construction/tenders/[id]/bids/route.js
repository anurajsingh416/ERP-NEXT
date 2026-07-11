
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
import TenderBid from "@/models/contruction/TenderBid";
import BOQ from "@/models/contruction/BOQ";
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



export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const bids = await TenderBid.find({ tender: id, companyId: user.companyId })
      .populate("vendor", "name supplierName")
      .sort({ submittedDate: -1 })
      .lean();
    return NextResponse.json({ success: true, data: bids });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const { vendor, items, remarks } = body;

    if (!vendor || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "Vendor and items required" }, { status: 400 });
    }

    const tender = await Tender.findOne({ _id: id, companyId: user.companyId });
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }
    if (tender.status !== "published") {
      return NextResponse.json({ success: false, message: "Tender not open for bids" }, { status: 400 });
    }
    if (new Date() > new Date(tender.submissionDeadline)) {
      return NextResponse.json({ success: false, message: "Bid submission deadline passed" }, { status: 400 });
    }

    const vendorDoc = await Supplier.findOne({ _id: vendor, companyId: user.companyId });
    if (!vendorDoc) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }

    // Check duplicate
    const existing = await TenderBid.findOne({ tender: id, vendor, companyId: user.companyId });
    if (existing) {
      return NextResponse.json({ success: false, message: "Bid already submitted" }, { status: 400 });
    }

    const boq = await BOQ.findOne({ _id: tender.boq, companyId: user.companyId });
    if (!boq) {
      return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    }

    // Validate items
    const boqItemsMap = {};
    boq.items.forEach(it => { boqItemsMap[it._id.toString()] = it; });

    const bidItems = items.map((item) => {
      const boqItem = boqItemsMap[item.boqItemId];
      if (!boqItem) {
        throw new Error(`Invalid boqItemId: ${item.boqItemId}`);
      }
      return {
        boqItemId: item.boqItemId,
        itemName: boqItem.itemName || item.itemName,
        unit: boqItem.unit || item.unit,
        quantity: boqItem.quantity || item.quantity || 0,
        quotedRate: parseFloat(item.quotedRate) || 0,
        amount: (parseFloat(item.quotedRate) || 0) * (boqItem.quantity || item.quantity || 0),
      };
    });

    const totalAmount = bidItems.reduce((sum, i) => sum + (i.amount || 0), 0);

    const bid = new TenderBid({
      tender: id,
      vendor,
      items: bidItems,
      totalAmount,
      remarks,
      createdBy: user.id || user._id,
      companyId: user.companyId,
      status: "submitted",
    });

    await bid.save();

    // Add timeline
    tender.timeline.push({
      event: "bid_submitted",
      description: `Bid submitted by ${vendorDoc.name}`,
      user: user.id || user._id,
    });
    await tender.save();

    await bid.populate("vendor", "name supplierName");
    return NextResponse.json({ success: true, data: bid });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}