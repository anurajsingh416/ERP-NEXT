import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseIndent from "@/models/contruction/PurchaseIndent";
import BOQ from "@/models//contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "project manager", "purchase manager"];
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

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { boqId, projectId } = body;

    // Validate BOQ
    const boq = await BOQ.findOne({ _id: boqId, companyId: user.companyId });
    if (!boq) return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });

    // Validate Project
    const project = await Project.findOne({ _id: projectId || boq.project, company: user.companyId });
    if (!project) return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });

    // Build items from BOQ, checking inventory stock
    const items = [];
    for (const boqItem of boq.items) {
      let inventoryItem = null;
      let availableQty = 0;
      let uom = boqItem.unit || "nos";

      if (boqItem.itemId) {
        inventoryItem = await Item.findOne({ _id: boqItem.itemId, companyId: user.companyId });
        if (inventoryItem) {
          // Sum available quantity
          availableQty = inventoryItem.quantity || 0;
          uom = inventoryItem.uom || boqItem.unit || "nos";
        }
      }

      const quantityRequired = boqItem.quantity || 0;
      const quantityToPurchase = Math.max(0, quantityRequired - availableQty);

      // Only add if quantity to purchase > 0 or item not in inventory
      if (quantityToPurchase > 0 || !inventoryItem) {
        items.push({
          itemId: inventoryItem?._id || null,
          itemName: boqItem.itemName || boqItem.description || "Unknown Material",
          uom: uom,
          quantityRequired: quantityRequired,
          quantityAvailable: availableQty,
          quantityToPurchase: quantityToPurchase > 0 ? quantityToPurchase : quantityRequired,
          estimatedRate: boqItem.rate || 0,
          estimatedAmount: (boqItem.rate || 0) * (quantityToPurchase > 0 ? quantityToPurchase : quantityRequired),
          boqReference: boqItem.description || boqItem.itemName,
          remarks: `Generated from BOQ #${boq.boqNumber}`,
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No items need to be purchased. All materials are available in stock.",
      }, { status: 400 });
    }

    // Auto-generate indent number
    const count = await PurchaseIndent.countDocuments({ companyId: user.companyId });
    const indentNumber = `PI-${String(count + 1).padStart(5, "0")}`;

    const indentData = {
      companyId: user.companyId,
      project: project._id,
      boq: boq._id,
      indentNumber,
      indentDate: new Date(),
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      items,
      priority: "medium",
      remarks: `Auto-generated from BOQ #${boq.boqNumber}`,
      createdBy: user.id,
    };

    const indent = new PurchaseIndent(indentData);
    await indent.save();

    return NextResponse.json({
      success: true,
      data: indent,
      message: `Purchase Indent generated with ${items.length} items`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message || "Failed to generate indent" }, { status: 500 });
  }
}
