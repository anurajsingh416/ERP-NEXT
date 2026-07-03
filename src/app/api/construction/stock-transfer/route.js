import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StockTransfer from "@/models/contruction/StockTransfer";
import WorkOrder from "@/models/contruction/workOrder";
import BOQ from "@/models/contruction/BOQ";
import Inventory from "@/models/Inventory";
import Project from "@/models/project/ProjectModel";
import Supplier from "@/models/SupplierModels";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
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

// ─── GET (list) ──────────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const workOrderId = searchParams.get("workOrderId");
    const projectId = searchParams.get("projectId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

    const query = { companyId: user.companyId };
    if (workOrderId) query.workOrder = workOrderId;
    if (projectId) query.project = projectId;
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [transfers, total] = await Promise.all([
      StockTransfer.find(query)
        .populate("project", "name")
        .populate("workOrder", "workOrderNumber orderType")
        .populate("createdBy", "name")
        .sort({ transferredDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockTransfer.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: transfers,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /stock-transfer error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    console.log("📥 Stock transfer payload:", JSON.stringify(body, null, 2));

    const { items } = body;
    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: "No items selected" }, { status: 400 });
    }

    // Validate per item
    for (const item of items) {
      if (!item.itemId || !item.source || !item.workOrderId || !item.warehouseId) {
        return NextResponse.json(
          { success: false, message: "Each item must have itemId, source, workOrderId, and warehouseId" },
          { status: 400 }
        );
      }
      if (!["items", "materials"].includes(item.source)) {
        return NextResponse.json(
          { success: false, message: "Invalid source – must be 'items' or 'materials'" },
          { status: 400 }
        );
      }
    }

    // ── 1. Fetch work orders ──────────────────────────────────────────
    const workOrderIds = [...new Set(items.map(i => i.workOrderId))];
    console.log("🔍 Looking for work orders with IDs:", workOrderIds, "and company:", user.companyId);

    let orders = await WorkOrder.find({
      _id: { $in: workOrderIds },
      company: user.companyId
    }).populate("project customer contractor").lean();

    if (orders.length === 0) {
      orders = await WorkOrder.find({
        _id: { $in: workOrderIds },
        companyId: user.companyId
      }).populate("project customer contractor").lean();
    }

    if (orders.length === 0) {
      const anyOrders = await WorkOrder.find({ _id: { $in: workOrderIds } }).lean();
      if (anyOrders.length === 0) {
        return NextResponse.json(
          { success: false, message: `Work orders not found: ${workOrderIds.join(", ")}` },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { success: false, message: "Access denied – work orders belong to another company" },
          { status: 403 }
        );
      }
    }

    console.log(`✅ Found ${orders.length} work orders`);
    const orderMap = {};
    orders.forEach(o => { orderMap[o._id.toString()] = o; });

    // Get party info from first order (all orders must have same party type in this flow)
    const firstOrder = orders[0];
    const partyType = firstOrder.orderType === "customer" ? "customer" : "contractor";
    let partyName = "";
    if (partyType === "customer") {
      partyName = firstOrder.customer?.customerName || firstOrder.customer?.name || "Customer";
    } else {
      partyName = firstOrder.contractor?.supplierName || firstOrder.contractor?.name || "Contractor";
    }
    const projectName = firstOrder.project?.name || "Unknown Project";
    const woNumbers = orders.map(o => o.workOrderNumber).join(", ");
    const remarks = `Stock transfer for ${partyType} ${partyName} | WO: ${woNumbers} | Project: ${projectName}`;

    // ── 2. Prepare transfer items and inventory updates ──────────────────
    const transferItems = [];
    const inventoryUpdates = [];

    async function getInventoryIdFromBoqItem(boqItemId) {
      if (!boqItemId) return null;
      const boq = await BOQ.findOne(
        { "items._id": boqItemId, company: user.companyId },
        { "items.$": 1 }
      ).lean();
      if (boq && boq.items && boq.items.length > 0) {
        return boq.items[0].itemId;
      }
      return null;
    }

    for (const selected of items) {
      const order = orderMap[selected.workOrderId];
      if (!order) {
        console.warn(`⚠️ Work order ${selected.workOrderId} not found`);
        continue;
      }

      let workOrderItem = null;
      let inventoryItemId = null;
      let quantity = 0;
      let unit = "nos";
      let rate = 0;
      let amount = 0;
      let boqItemId = null;
      let source = selected.source;

      if (source === "items") {
        workOrderItem = order.items.find(i => i._id.toString() === selected.itemId);
        if (!workOrderItem) {
          console.warn(`⚠️ Item ${selected.itemId} not found in work order items`);
          continue;
        }
        boqItemId = workOrderItem.boqItemId;
        quantity = workOrderItem.quantity || 0;
        unit = workOrderItem.unit || "nos";
        rate = workOrderItem.rate || 0;
        amount = workOrderItem.amount || 0;
        inventoryItemId = await getInventoryIdFromBoqItem(boqItemId);
        if (!inventoryItemId) {
          console.warn(`⚠️ No inventory item ID found for BOQ item ${boqItemId}`);
          continue;
        }
      } else if (source === "materials") {
        workOrderItem = order.materials.find(m => m._id.toString() === selected.itemId);
        if (!workOrderItem) {
          console.warn(`⚠️ Material ${selected.itemId} not found in work order materials`);
          continue;
        }
        inventoryItemId = workOrderItem.itemId;
        if (!inventoryItemId) {
          console.warn(`⚠️ Material ${selected.itemId} has no itemId`);
          continue;
        }
        quantity = workOrderItem.quantity || 0;
        unit = workOrderItem.unit || "nos";
        rate = workOrderItem.rate || 0;
        amount = workOrderItem.amount || 0;
        boqItemId = null;
      }

      if (quantity <= 0) {
        console.warn(`⚠️ Item ${selected.itemId} has zero quantity – skipping`);
        continue;
      }

      transferItems.push({
        itemId: inventoryItemId,
        quantity,
        unit,
        rate,
        amount,
        source,
        workOrderItemId: selected.itemId,
        workOrderId: selected.workOrderId,
        boqItemId,
        warehouseId: selected.warehouseId,
        type: selected.type || "material",
      });

      inventoryUpdates.push({
        inventoryItemId,
        quantity,
        warehouseId: selected.warehouseId,
        workOrderId: selected.workOrderId,
        workOrderItemId: selected.itemId,
        source,
      });
    }

    if (transferItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid items to transfer" },
        { status: 400 }
      );
    }

    // ── 3. Reduce stock in Inventory (transaction) ──────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Group updates by warehouse and inventory item
      const updateMap = {};
      for (const update of inventoryUpdates) {
        const key = `${update.inventoryItemId}_${update.warehouseId}`;
        if (!updateMap[key]) {
          updateMap[key] = {
            inventoryItemId: update.inventoryItemId,
            warehouseId: update.warehouseId,
            totalQuantity: 0,
            updates: [],
          };
        }
        updateMap[key].totalQuantity += update.quantity;
        updateMap[key].updates.push(update);
      }

      // Apply inventory updates
      for (const key of Object.keys(updateMap)) {
        const { inventoryItemId, warehouseId, totalQuantity, updates } = updateMap[key];
        const inventory = await Inventory.findOne({
          companyId: user.companyId,
          item: inventoryItemId,
          warehouse: warehouseId,
        }).session(session);

        if (!inventory) {
          throw new Error(`Inventory not found for item ${inventoryItemId} at warehouse ${warehouseId}`);
        }

        if (inventory.quantity < totalQuantity) {
          throw new Error(
            `Insufficient stock for item ${inventoryItemId} at warehouse ${warehouseId}. ` +
            `Available: ${inventory.quantity}, requested: ${totalQuantity}`
          );
        }

        inventory.quantity -= totalQuantity;
        await inventory.updateStockStatus();
        await inventory.save({ session });
      }

      // ── 4. Create StockTransfer record with party info ──────────────────
      const firstItem = transferItems[0];
      const transferNumber = `ST-${Date.now().toString().slice(-6)}`;

      const transfer = new StockTransfer({
        transferNumber,
        project: orders[0].project._id,
        workOrder: orders[0]._id,
        partyType,
        partyName,
        sourceWarehouse: firstItem.warehouseId,
        destinationWarehouse: firstItem.warehouseId,
        items: transferItems,
        status: "completed",
        transferredDate: new Date(),
        remarks,
        createdBy: user.id || user._id,
        companyId: user.companyId,
      });

      await transfer.save({ session });

      // ── 5. Update work order items to mark them as transferred ──────────
      for (const selected of items) {
        const order = orderMap[selected.workOrderId];
        if (!order) continue;

        if (selected.source === "items") {
          await WorkOrder.updateOne(
            { _id: order._id, "items._id": selected.itemId },
            { $set: { "items.$.transferFromStock": false } },
            { session }
          );
        } else if (selected.source === "materials") {
          await WorkOrder.updateOne(
            { _id: order._id, "materials._id": selected.itemId },
            { $set: { "materials.$.transferFromStock": false } },
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({
        success: true,
        message: `Successfully transferred ${transferItems.length} items`,
        data: transfer,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    console.error("❌ Stock transfer error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Transfer failed" },
      { status: 500 }
    );
  }
}


// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import StockTransfer from "@/models/contruction/StockTransfer";
// import WorkOrder from "@/models/contruction/workOrder";
// import BOQ from "@/models/contruction/BOQ";
// import Inventory from "@/models/Inventory";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ─── Auth ──────────────────────────────────────────────────────────────────
// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = [
//     "admin", "project manager", "site engineer", "project coordinator",
//     "site supervisor", "accounts manager", "purchase manager",
//   ];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// // ─── POST ──────────────────────────────────────────────────────────────────
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const body = await req.json();
//     console.log("📥 Stock transfer payload:", JSON.stringify(body, null, 2));

//     // ✅ New payload format: { items: [ { itemId, source, workOrderId, warehouseId, type } ] }
//     const { items } = body;
//     if (!items || items.length === 0) {
//       return NextResponse.json({ success: false, message: "No items selected" }, { status: 400 });
//     }

//     // Validate required fields per item
//     for (const item of items) {
//       if (!item.itemId || !item.source || !item.workOrderId || !item.warehouseId) {
//         return NextResponse.json(
//           { success: false, message: "Each item must have itemId, source, workOrderId, and warehouseId" },
//           { status: 400 }
//         );
//       }
//       if (!["items", "materials"].includes(item.source)) {
//         return NextResponse.json(
//           { success: false, message: "Invalid source – must be 'items' or 'materials'" },
//           { status: 400 }
//         );
//       }
//     }

//     // ── 1. Fetch all work orders (deduplicate) ──────────────────────────
//     const workOrderIds = [...new Set(items.map(i => i.workOrderId))];
//     const orders = await WorkOrder.find({ _id: { $in: workOrderIds }, companyId: user.companyId })
//       .populate("project")
//       .lean();

//     if (orders.length === 0) {
//       return NextResponse.json({ success: false, message: "Work orders not found" }, { status: 404 });
//     }

//     // ── 2. Build maps for quick lookup ────────────────────────────────────
//     const orderMap = {};
//     orders.forEach(o => { orderMap[o._id.toString()] = o; });

//     // ── 3. Prepare transfer items and inventory updates ──────────────────
//     const transferItems = [];
//     const inventoryUpdates = [];

//     // Helper to find inventory item ID from BOQ item
//     async function getInventoryIdFromBoqItem(boqItemId) {
//       if (!boqItemId) return null;
//       const boq = await BOQ.findOne(
//         { "items._id": boqItemId, companyId: user.companyId },
//         { "items.$": 1 }
//       ).lean();
//       if (boq && boq.items && boq.items.length > 0) {
//         return boq.items[0].itemId;
//       }
//       return null;
//     }

//     for (const selected of items) {
//       const order = orderMap[selected.workOrderId];
//       if (!order) {
//         console.warn(`⚠️ Work order ${selected.workOrderId} not found`);
//         continue;
//       }

//       let workOrderItem = null;
//       let inventoryItemId = null;
//       let quantity = 0;
//       let unit = "nos";
//       let rate = 0;
//       let amount = 0;
//       let boqItemId = null;
//       let source = selected.source;

//       if (source === "items") {
//         // Find in order.items
//         workOrderItem = order.items.find(i => i._id.toString() === selected.itemId);
//         if (!workOrderItem) {
//           console.warn(`⚠️ Item ${selected.itemId} not found in work order items`);
//           continue;
//         }
//         boqItemId = workOrderItem.boqItemId;
//         quantity = workOrderItem.quantity || 0;
//         unit = workOrderItem.unit || "nos";
//         rate = workOrderItem.rate || 0;
//         amount = workOrderItem.amount || 0;
//         // Get inventory ID from BOQ
//         inventoryItemId = await getInventoryIdFromBoqItem(boqItemId);
//         if (!inventoryItemId) {
//           console.warn(`⚠️ No inventory item ID found for BOQ item ${boqItemId}`);
//           continue;
//         }
//       } else if (source === "materials") {
//         // Find in order.materials
//         workOrderItem = order.materials.find(m => m._id.toString() === selected.itemId);
//         if (!workOrderItem) {
//           console.warn(`⚠️ Material ${selected.itemId} not found in work order materials`);
//           continue;
//         }
//         inventoryItemId = workOrderItem.itemId;  // materials have direct itemId
//         if (!inventoryItemId) {
//           console.warn(`⚠️ Material ${selected.itemId} has no itemId`);
//           continue;
//         }
//         quantity = workOrderItem.quantity || 0;
//         unit = workOrderItem.unit || "nos";
//         rate = workOrderItem.rate || 0;
//         amount = workOrderItem.amount || 0;
//         boqItemId = null; // materials don't have boqItemId
//       }

//       // Skip zero quantity
//       if (quantity <= 0) {
//         console.warn(`⚠️ Item ${selected.itemId} has zero quantity – skipping`);
//         continue;
//       }

//       // Build transfer item
//       transferItems.push({
//         itemId: inventoryItemId,
//         quantity,
//         unit,
//         rate,
//         amount,
//         source, // store source for reference
//         workOrderItemId: selected.itemId,
//         workOrderId: selected.workOrderId,
//         boqItemId,
//         warehouseId: selected.warehouseId,
//         type: selected.type || "material", // optional
//       });

//       // Prepare inventory update
//       inventoryUpdates.push({
//         inventoryItemId,
//         quantity,
//         warehouseId: selected.warehouseId,
//         workOrderId: selected.workOrderId,
//         workOrderItemId: selected.itemId,
//         source,
//       });
//     }

//     if (transferItems.length === 0) {
//       return NextResponse.json(
//         { success: false, message: "No valid items to transfer – missing inventory IDs or zero quantities" },
//         { status: 400 }
//       );
//     }

//     // ── 4. Reduce stock in Inventory (transaction) ──────────────────────
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // Group updates by warehouse and inventory item to sum quantities
//       const updateMap = {};
//       for (const update of inventoryUpdates) {
//         const key = `${update.inventoryItemId}_${update.warehouseId}`;
//         if (!updateMap[key]) {
//           updateMap[key] = {
//             inventoryItemId: update.inventoryItemId,
//             warehouseId: update.warehouseId,
//             totalQuantity: 0,
//             updates: [],
//           };
//         }
//         updateMap[key].totalQuantity += update.quantity;
//         updateMap[key].updates.push(update);
//       }

//       // Apply updates
//       for (const key of Object.keys(updateMap)) {
//         const { inventoryItemId, warehouseId, totalQuantity, updates } = updateMap[key];
//         const inventory = await Inventory.findOne({
//           companyId: user.companyId,
//           item: inventoryItemId,
//           warehouse: warehouseId,
//         }).session(session);

//         if (!inventory) {
//           throw new Error(
//             `Inventory not found for item ${inventoryItemId} at warehouse ${warehouseId}`
//           );
//         }

//         if (inventory.quantity < totalQuantity) {
//           throw new Error(
//             `Insufficient stock for item ${inventoryItemId} at warehouse ${warehouseId}. ` +
//             `Available: ${inventory.quantity}, requested: ${totalQuantity}`
//           );
//         }

//         inventory.quantity -= totalQuantity;
//         await inventory.updateStockStatus();
//         await inventory.save({ session });

//         // Optionally log each update (optional)
//         for (const update of updates) {
//           console.log(
//             `✅ Transferred ${update.quantity} of ${update.inventoryItemId} ` +
//             `from WO ${update.workOrderId} (${update.source})`
//           );
//         }
//       }

//       // ── 5. Create StockTransfer record ──────────────────────────────────
//       const firstItem = transferItems[0];
//       const transferNumber = `ST-${Date.now().toString().slice(-6)}`;
//       const transfer = new StockTransfer({
//         transferNumber,
//         project: orders[0].project._id,
//         workOrder: orders[0]._id,
//         sourceWarehouse: firstItem.warehouseId,
//         destinationWarehouse: firstItem.warehouseId, // same – adjust if needed
//         items: transferItems,
//         status: "completed",
//         transferredDate: new Date(),
//         remarks: `Transferred from work orders ${orders.map(o => o.workOrderNumber).join(", ")}`,
//         createdBy: user.id || user._id,
//         companyId: user.companyId,
//       });

//       await transfer.save({ session });

//       // ── 6. (Optional) Mark work order items as transferred ─────────────
//       // You could add a flag `transferred: true` on each transferred item
//       // but that's not required for now.

//       await session.commitTransaction();
//       session.endSession();

//       return NextResponse.json({
//         success: true,
//         message: `Successfully transferred ${transferItems.length} items`,
//         data: transfer,
//       });
//     } catch (err) {
//       await session.abortTransaction();
//       session.endSession();
//       throw err;
//     }
//   } catch (err) {
//     console.error("❌ Stock transfer error:", err);
//     return NextResponse.json(
//       { success: false, message: err.message || "Transfer failed" },
//       { status: 500 }
//     );
//   }
// }