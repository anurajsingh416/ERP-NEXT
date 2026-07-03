import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StockTransfer from "@/models/contruction/StockTransfer";
import Item from "@/models/ItemModels";
import Warehouse from "@/models/warehouseModels";
import project from "@/models/project/ProjectModel";
import workOrder from "@/models/contruction/workOrder";
import BOQ from "@/models/contruction/BOQ";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const transfer = await StockTransfer.findOne({ _id: id, companyId: user.companyId })
      .populate("project", "name")
      .populate("workOrder", "workOrderNumber")
      .populate("createdBy", "name")
      .lean();

    if (!transfer) {
      return NextResponse.json({ success: false, message: "Stock transfer not found" }, { status: 404 });
    }

    // ── Populate item names ──
    if (transfer.items && transfer.items.length) {
      const itemIds = transfer.items.map(i => i.itemId).filter(id => id);
      const itemsMap = {};
      if (itemIds.length) {
        const items = await Item.find({ _id: { $in: itemIds } }).select("name itemName").lean();
        items.forEach(item => {
          itemsMap[item._id.toString()] = item.name || item.itemName || "Unnamed";
        });
      }
      transfer.items = transfer.items.map(item => ({
        ...item,
        itemName: item.itemId ? (itemsMap[item.itemId.toString()] || "Unknown Item") : "No item ID",
      }));
    }

    // ── Populate warehouse names ──
    // Build array of warehouse IDs from source and destination
    const warehouseIds = [];
    if (transfer.sourceWarehouse) warehouseIds.push(transfer.sourceWarehouse);
    if (transfer.destinationWarehouse) warehouseIds.push(transfer.destinationWarehouse);

    if (warehouseIds.length) {
      const warehouses = await Warehouse.find({ _id: { $in: warehouseIds } }).select("name warehouseName").lean();
      const warehouseMap = {};
      warehouses.forEach(w => {
        warehouseMap[w._id.toString()] = w.name || w.warehouseName || "Unnamed";
      });
      // Add friendly names to the response
      transfer.sourceWarehouseName = transfer.sourceWarehouse
        ? (warehouseMap[transfer.sourceWarehouse.toString()] || "Unknown")
        : "—";
      transfer.destinationWarehouseName = transfer.destinationWarehouse
        ? (warehouseMap[transfer.destinationWarehouse.toString()] || "Unknown")
        : "—";
    } else {
      transfer.sourceWarehouseName = "—";
      transfer.destinationWarehouseName = "—";
    }

    return NextResponse.json({ success: true, data: transfer });
  } catch (err) {
    console.error("GET /stock-transfer/:id error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}