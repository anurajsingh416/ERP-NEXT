import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Tender from "@/models/contruction/Tender";
import TenderBid from "@/models/contruction/TenderBid";
import WorkOrder from "@/models/contruction/workOrder";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
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

// ─── POST ─────────────────────────────────────────────────────────────
export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const { bidId } = await req.json();

    if (!bidId) {
      return NextResponse.json({ success: false, message: "Bid ID required" }, { status: 400 });
    }

    // ─── 1. Fetch Tender ──────────────────────────────────────────────
    const tender = await Tender.findOne({ _id: id, companyId: user.companyId })
      .populate("project boq");
    if (!tender) {
      return NextResponse.json({ success: false, message: "Tender not found" }, { status: 404 });
    }

    if (tender.status !== "published" && tender.status !== "closed") {
      return NextResponse.json({
        success: false,
        message: "Tender must be published or closed to award"
      }, { status: 400 });
    }

    // ─── 2. Fetch the Winning Bid ─────────────────────────────────────
    const bid = await TenderBid.findOne({ _id: bidId, tender: id, companyId: user.companyId })
      .populate("vendor");
    if (!bid) {
      return NextResponse.json({ success: false, message: "Bid not found" }, { status: 404 });
    }

    // ─── 3. Generate Work Order Number ──────────────────────────────
    const lastWO = await WorkOrder.findOne({ companyId: user.companyId })
      .sort({ workOrderNumber: -1 })
      .lean();
    let nextNumber = 1;
    if (lastWO) {
      const parts = lastWO.workOrderNumber.match(/\d+$/);
      if (parts) nextNumber = parseInt(parts[0]) + 1;
    }
    const workOrderNumber = `WO-${String(nextNumber).padStart(6, "0")}`;

    // ─── 4. Map Bid Items → Work Order Items ─────────────────────────
    const workOrderItems = bid.items.map((item) => ({
      boqItemId: item.boqItemId,
      itemName: item.itemName || "Item",
      description: item.itemName || "No description",
      unit: item.unit || "nos",
      quantity: item.quantity || 0,
      rate: item.quotedRate || 0,
      amount: item.amount || 0,
      section: "Tender Award",          // default section
      subSection: "Main",
      subSectionIndex: 1,
      isRateOnly: false,
      transferFromStock: false,
    }));

    // ─── 5. (Optional) Handle Materials from BOQ ────────────────────
    // If you want to copy materials from the BOQ to the work order,
    // you can add them here. For now, we'll leave it empty.
    const materials = [];

    // ─── 6. Create Work Order ─────────────────────────────────────────
    const workOrder = new WorkOrder({
      workOrderNumber,
      project: tender.project._id,
      boq: tender.boq._id,
      orderType: "contractor",          // since it's a contractor award
      contractor: bid.vendor._id,
      customer: null,                   // not applicable
      materials,                        // empty array for now
      items: workOrderItems,
      status: "draft",
      issuedDate: new Date(),
      remarks: `Awarded from tender ${tender.tenderNumber}`,
      createdBy: user.id || user._id,
      companyId: user.companyId,
    });

    await workOrder.save();

    // ─── 7. Update Tender Status ─────────────────────────────────────
    tender.status = "awarded";
    tender.timeline.push({
      event: "awarded",
      description: `Awarded to ${bid.vendor.name}`,
      user: user.id || user._id,
    });
    await tender.save();

    // ─── 8. Update Winning Bid Status ────────────────────────────────
    bid.status = "awarded";
    await bid.save();

    // ─── 9. Reject Other Bids ─────────────────────────────────────────
    await TenderBid.updateMany(
      { tender: id, _id: { $ne: bidId }, companyId: user.companyId },
      { $set: { status: "rejected" } }
    );

    // ─── 10. Populate Work Order for Response ────────────────────────
    await workOrder.populate([
      { path: "project", select: "name" },
      { path: "boq", select: "boqNumber" },
      { path: "contractor", select: "name supplierName" },
      { path: "createdBy", select: "name" },
    ]);

    return NextResponse.json({
      success: true,
      message: "Tender awarded and work order created",
      data: { tender, bid, workOrder },
    });
  } catch (err) {
    console.error("❌ Award error:", err);
    if (err.code === 11000) {
      return NextResponse.json({
        success: false,
        message: "Work order number already exists (please retry)"
      }, { status: 409 });
    }
    return NextResponse.json({
      success: false,
      message: err.message || "Award failed"
    }, { status: 500 });
  }
}