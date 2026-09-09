// import mongoose from "mongoose";
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import BOQ from "@/models/contruction/BOQ";
// import Project from "@/models/project/ProjectModel";
// import Supplier from "@/models/SupplierModels";
// import Customer from "@/models/CustomerModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ─── Auth Helpers ──────────────────────────────────────────────────────────
// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = [
//     "admin",
//     "project manager",
//     "site engineer",
//     "project coordinator",
//     "site supervisor",
//     "accounts manager",
//     "purchase manager",
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

// const UPDATABLE_FIELDS = [
//   "project",
//   "contractor",
//   "customer",
//   "boqNumber",
//   "phase",
//   "date",
//   "status",
//   "remarks",
//   "materials",
//   "items",
//   "taxVAT",
//   "taxService",
// ];

// // ─── GET: Single BOQ ──────────────────────────────────────────────────────
// export async function GET(req, { params }) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     // ✅ Await params (Next.js 15)
//     const { id } = await params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid BOQ ID format" },
//         { status: 400 }
//       );
//     }

//     const boq = await BOQ.findOne({ _id: id, companyId: user.companyId })
//       .populate("project", "name")
//       .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
//       .populate("customer", "customerName contactPersonName mobileNumber")
//       .populate("createdBy", "name")
//       .lean();

//     if (!boq) {
//       return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: boq });
//   } catch (err) {
//     console.error("GET /boq/:id error:", err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// // // ─── PUT: Update BOQ ──────────────────────────────────────────────────────
// // export async function PUT(req, { params }) {
// //   await dbConnect();
// //   const { user, error, status } = await validateUser(req);
// //   if (error) return NextResponse.json({ success: false, message: error }, { status });

// //   try {
// //     // ✅ Await params
// //     const { id } = await params;

// //     if (!mongoose.Types.ObjectId.isValid(id)) {
// //       return NextResponse.json(
// //         { success: false, message: "Invalid BOQ ID format" },
// //         { status: 400 }
// //       );
// //     }

// //     const body = await req.json();
// //     console.log("📥 Received PUT payload for BOQ:", JSON.stringify(body, null, 2));

// //     // ── Validate project if being changed ──
// //     if (body.project) {
// //       const projectDoc = await Project.findOne({ _id: body.project, company: user.companyId });
// //       if (!projectDoc) {
// //         return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
// //       }
// //     }

// //     // ── Validate contractor if being changed ──
// //     if (body.contractor) {
// //       const contractorDoc = await Supplier.findOne({ _id: body.contractor, companyId: user.companyId });
// //       if (!contractorDoc) {
// //         // Since contractor is optional, we log a warning and continue (set to null)
// //         console.warn(`⚠️ Contractor ${body.contractor} not found – will be set to null`);
// //         body.contractor = null;
// //       }
// //     }

// //     // ── Load the existing BOQ ──
// //     const boq = await BOQ.findOne({ _id: id, companyId: user.companyId });
// //     if (!boq) {
// //       return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
// //     }

// //     // ── Update whitelisted fields (excluding 'items') ──
// //     for (const field of UPDATABLE_FIELDS) {
// //       if (field === "items") continue;
// //       if (body[field] !== undefined) {
// //         if (typeof body[field] === "string") {
// //           boq[field] = body[field].trim();
// //         } else {
// //           boq[field] = body[field];
// //         }
// //       }
// //     }

// //     // ── Handle items with validation ──
// //     if (body.items !== undefined) {
// //       if (!Array.isArray(body.items) || body.items.length === 0) {
// //         return NextResponse.json(
// //           { success: false, message: "BOQ must contain at least one item" },
// //           { status: 400 }
// //         );
// //       }

// //       // ✅ Validate each item has a non‑empty itemName
// //       const invalidItems = body.items.filter(
// //         (item) => !item.itemName || item.itemName.trim() === ""
// //       );
// //       if (invalidItems.length > 0) {
// //         const indices = body.items
// //           .map((item, idx) => (!item.itemName || item.itemName.trim() === "") ? idx : null)
// //           .filter(i => i !== null);
// //         return NextResponse.json(
// //           {
// //             success: false,
// //             message: `Items at indices ${indices.join(", ")} are missing a name.`,
// //           },
// //           { status: 400 }
// //         );
// //       }

// //       // ✅ Map items – preserve `_id` for existing items only
// //       boq.items = body.items.map((item) => {
// //         const mapped = {
// //           itemId: item.itemId || null,
// //           itemName: (item.itemName || "").trim(),
// //           description: (item.description || "").trim(),
// //           unit: (item.unit || "nos").trim(),
// //           quantity: parseFloat(item.quantity) || 0,
// //           rate: parseFloat(item.rate) || 0,
// //           amount: parseFloat(item.amount) || 0,
// //           section: (item.section || "Other Work").trim(),
// //           subSection: (item.subSection || "Main").trim(),
// //           subSectionIndex: parseInt(item.subSectionIndex) || 1,
// //           isRateOnly: !!item.isRateOnly,
// //           consumedQty: item.consumedQty || 0,
// //           consumedAmount: item.consumedAmount || 0,
// //         };
// //         // ✅ Only include `_id` if it exists and is valid
// //         if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
// //           mapped._id = item._id;
// //         }
// //         return mapped;
// //       });
// //     }

// //     // ── Bump version ──
// //     boq.version = (boq.version || 1) + 1;

// //     // ── Save – triggers pre‑save hook ──
// //     await boq.save();

// //     await boq.populate([
// //       { path: "project", select: "name" },
// //       { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
// //     ]);

// //     return NextResponse.json({ success: true, data: boq });
// //   } catch (err) {
// //     console.error("❌ PUT /boq/:id error (full stack):", err);
// //     if (err.name === "ValidationError") {
// //       const messages = Object.values(err.errors).map(e => e.message);
// //       return NextResponse.json(
// //         { success: false, message: `Validation error: ${messages.join(", ")}` },
// //         { status: 400 }
// //       );
// //     }
// //     if (err.code === 11000) {
// //       return NextResponse.json(
// //         { success: false, message: "A BOQ with this number already exists for your company." },
// //         { status: 409 }
// //       );
// //     }
// //     return NextResponse.json(
// //       { success: false, message: err.message || "Update failed" },
// //       { status: 500 }
// //     );
// //   }
// // }

// export async function PUT(req, { params }) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { id } = await params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid BOQ ID format" },
//         { status: 400 }
//       );
//     }

//     const body = await req.json();
//     console.log("📥 Received PUT payload for BOQ:", JSON.stringify(body, null, 2));

//     // ── Validate project if being changed ──
//     if (body.project) {
//       const projectDoc = await Project.findOne({ _id: body.project, company: user.companyId });
//       if (!projectDoc) {
//         return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
//       }
//     }

//     // ── Validate contractor if being changed ──
//     if (body.contractor) {
//       const contractorDoc = await Supplier.findOne({ _id: body.contractor, companyId: user.companyId });
//       if (!contractorDoc) {
//         console.warn(`⚠️ Contractor ${body.contractor} not found – will be set to null`);
//         body.contractor = null;
//       }
//     }
//     // ── Validate customer if being changed ──
//     if (body.customer) {
//       const customerDoc = await Customer.findOne({ _id: body.customer, companyId: user.companyId });
//       if (!customerDoc) {
//         console.warn(`⚠️ Customer ${body.customer} not found – will be set to null`);
//         body.customer = null;
//       }
//     }


//     // ── Load the existing BOQ ──
//     const boq = await BOQ.findOne({ _id: id, companyId: user.companyId });
//     if (!boq) {
//       return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//     }

//     // ── Update whitelisted fields (excluding 'items' and 'materials') ──
//     for (const field of UPDATABLE_FIELDS) {
//       if (field === "items" || field === "materials") continue;
//       if (body[field] !== undefined) {
//         if (typeof body[field] === "string") {
//           boq[field] = body[field].trim();
//         } else {
//           boq[field] = body[field];
//         }
//       }
//     }

//     // ── Handle items with validation ──
//     if (body.items !== undefined) {
//       if (!Array.isArray(body.items) || body.items.length === 0) {
//         return NextResponse.json(
//           { success: false, message: "BOQ must contain at least one item" },
//           { status: 400 }
//         );
//       }

//       const invalidItems = body.items.filter(
//         (item) => !item.itemName || item.itemName.trim() === ""
//       );
//       if (invalidItems.length > 0) {
//         const indices = body.items
//           .map((item, idx) => (!item.itemName || item.itemName.trim() === "") ? idx : null)
//           .filter(i => i !== null);
//         return NextResponse.json(
//           {
//             success: false,
//             message: `Items at indices ${indices.join(", ")} are missing a name.`,
//           },
//           { status: 400 }
//         );
//       }

//       boq.items = body.items.map((item) => {
//         const mapped = {
//           itemId: item.itemId || null,
//           itemName: (item.itemName || "").trim(),
//           description: (item.description || "").trim(),
//           unit: (item.unit || "nos").trim(),
//           quantity: parseFloat(item.quantity) || 0,
//           rate: parseFloat(item.rate) || 0,
//           amount: parseFloat(item.amount) || 0,
//           section: (item.section || "Other Work").trim(),
//           subSection: (item.subSection || "Main").trim(),
//           subSectionIndex: parseInt(item.subSectionIndex) || 1,
//           isRateOnly: !!item.isRateOnly,
//           consumedQty: item.consumedQty || 0,
//           consumedAmount: item.consumedAmount || 0,
//         };
//         if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
//           mapped._id = item._id;
//         }
//         return mapped;
//       });
//     }

//     // ── NEW: Handle materials ──
//     if (body.materials !== undefined) {
//       if (!Array.isArray(body.materials)) {
//         return NextResponse.json(
//           { success: false, message: "materials must be an array" },
//           { status: 400 }
//         );
//       }

//       // Optional: Validate each material has a name (or skip – schema allows empty)
//       // We'll ensure itemName is trimmed, but we won't reject empty ones.
//       boq.materials = body.materials.map((mat) => {
//         // Preserve existing _id if present and valid
//         let newMat = {
//           itemId: mat.itemId || null,
//           itemName: (mat.itemName || "").trim(),
//           quantity: parseFloat(mat.quantity) || 0,
//           unit: (mat.unit || "nos").trim(),
//           rate: parseFloat(mat.rate) || 0,
//           amount: parseFloat(mat.amount) || 0,
//           section: (mat.section || "Other Work").trim(),
//           subSection: (mat.subSection || "Main").trim(),
//           subSectionIndex: parseInt(mat.subSectionIndex) || 1,
//           isRateOnly: !!mat.isRateOnly,
//           consumedQty: mat.consumedQty || 0,
//           consumedAmount: mat.consumedAmount || 0,
//           type: mat.type || "material",
//         };
//         if (mat._id && mongoose.Types.ObjectId.isValid(mat._id)) {
//           newMat._id = mat._id;
//         }
//         return newMat;
//       });
//     }

//     // ── Bump version ──
//     boq.version = (boq.version || 1) + 1;

//     // ── Save – triggers pre‑save hook ──
//     await boq.save();

//     await boq.populate([
//       { path: "project", select: "name" },
//       { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
//       { path: "customer", select: "customerName contactPersonName mobileNumber" },
//     ]);

//     return NextResponse.json({ success: true, data: boq });
//   } catch (err) {
//     console.error("❌ PUT /boq/:id error (full stack):", err);
//     if (err.name === "ValidationError") {
//       const messages = Object.values(err.errors).map(e => e.message);
//       return NextResponse.json(
//         { success: false, message: `Validation error: ${messages.join(", ")}` },
//         { status: 400 }
//       );
//     }
//     if (err.code === 11000) {
//       return NextResponse.json(
//         { success: false, message: "A BOQ with this number already exists for your company." },
//         { status: 409 }
//       );
//     }
//     return NextResponse.json(
//       { success: false, message: err.message || "Update failed" },
//       { status: 500 }
//     );
//   }
// }

// // ─── DELETE: Remove BOQ ──────────────────────────────────────────────────
// export async function DELETE(req, { params }) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     // ✅ Await params
//     const { id } = await params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid BOQ ID format" },
//         { status: 400 }
//       );
//     }

//     const deleted = await BOQ.findOneAndDelete({ _id: id, companyId: user.companyId });
//     if (!deleted) {
//       return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//     }
//     return NextResponse.json({ success: true, message: "BOQ deleted successfully" });
//   } catch (err) {
//     console.error("DELETE /boq/:id error:", err);
//     return NextResponse.json(
//       { success: false, message: err.message || "Delete failed" },
//       { status: 500 }
//     );
//   }
// }
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import Supplier from "@/models/SupplierModels";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Item from "@/models/ItemModels";

// ─── Auth Helpers ──────────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin",
    "project manager",
    "site engineer",
    "project coordinator",
    "site supervisor",
    "accounts manager",
    "purchase manager",
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

function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

async function getNextItemCode(companyId) {
  const lastItem = await Item.findOne({
    companyId,
    itemCode: { $regex: /^ITEM-\d+$/ },
  })
    .sort({ createdAt: -1 })
    .select("itemCode")
    .lean();

  if (!lastItem || !lastItem.itemCode) return "ITEM-00001";
  const num = parseInt(lastItem.itemCode.replace("ITEM-", ""), 10) || 0;
  return `ITEM-${String(num + 1).padStart(5, "0")}`;
}

// ─── Find or Create Child Line as a "Raw Material" in Item Master ──────────
async function findOrCreateRawMaterialItem(companyId, userId, descLine, parentCategory) {
  const descText = (descLine.description || "").trim();
  const qty = descLine.isRateOnly ? 0 : parseFloat(descLine.quantity) || 0;
  const supplyRate = parseFloat(descLine.unitRateSupply) || 0;
  const installRate = parseFloat(descLine.unitRateInstallation) || 0;
  const isRateOnly = Boolean(descLine.isRateOnly);

  const amountSupply = isRateOnly ? supplyRate : qty * supplyRate;
  const amountInstallation = isRateOnly ? installRate : qty * installRate;
  const totalAmount = amountSupply + amountInstallation;

  let rawMat = await Item.findOne({
    companyId,
    itemName: { $regex: new RegExp(`^${descText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    itemType: "Raw Material",
  });

  if (rawMat) {
    // Update existing item's rate and amount breakdown
    rawMat.quantity = qty;
    rawMat.unitRateSupply = supplyRate;
    rawMat.unitRateInstallation = installRate;
    rawMat.amountSupply = amountSupply;
    rawMat.amountInstallation = amountInstallation;
    rawMat.totalAmount = totalAmount;
    rawMat.unitPrice = supplyRate + installRate;
    rawMat.isRateOnly = isRateOnly;
    rawMat.unit = (descLine.unit || rawMat.unit || "nos").trim();
    rawMat.uom = (descLine.unit || rawMat.uom || "nos").trim();
    await rawMat.save();
    return rawMat;
  }

  // Create new item with rate and amount breakdown
  const nextCode = await getNextItemCode(companyId);
  rawMat = new Item({
    companyId,
    createdBy: userId,
    itemCode: nextCode,
    serialNumber: (descLine.srNo || "").trim(),
    itemName: descText,
    description: descText,
    category: parentCategory || "Raw Materials",
    itemType: "Raw Material",
    unit: (descLine.unit || "nos").trim(),
    uom: (descLine.unit || "nos").trim(),
    quantity: qty,
    unitPrice: supplyRate + installRate,
    unitRateSupply: supplyRate,
    unitRateInstallation: installRate,
    amountSupply,
    amountInstallation,
    totalAmount,
    isRateOnly,
    status: "active",
    active: true,
  });

  await rawMat.save();
  return rawMat;
}
// ─── Hierarchical Item Mapping with Raw Material BOM Sync ──────────────────
async function mapAndDedupeItems(rawItems, companyId, userId) {
  if (!Array.isArray(rawItems)) return [];

  const result = [];
  const seenNames = new Set();

  for (const rawItem of rawItems) {
    const itemName = (rawItem.itemName || "").trim();
    if (!itemName) continue;

    const normalizedTarget = normalize(itemName);
    if (seenNames.has(normalizedTarget)) continue;
    seenNames.add(normalizedTarget);

    const rawDescriptions = Array.isArray(rawItem.descriptions) ? rawItem.descriptions : [];
    const validDescriptions = [];
    const rawMaterialLinks = [];
    const seenLines = new Set();

    // 1. Process child lines into individual Raw Material items
    for (const rawDesc of rawDescriptions) {
      const descText = (rawDesc.description || "").trim();
      if (!descText) continue;

      const srNo = (rawDesc.srNo || "").trim();
      const lineKey = `${srNo}|${normalize(descText)}`;
      if (seenLines.has(lineKey)) continue;
      seenLines.add(lineKey);

      const qty = parseFloat(rawDesc.quantity) || 0;
      const supplyRate = parseFloat(rawDesc.unitRateSupply) || 0;
      const installRate = parseFloat(rawDesc.unitRateInstallation) || 0;
      const isRateOnly = !!rawDesc.isRateOnly;
      const amountSupply = isRateOnly ? supplyRate : qty * supplyRate;
      const amountInstallation = isRateOnly ? installRate : qty * installRate;
      const totalAmount = amountSupply + amountInstallation;

      let rawMatDoc = null;
      if (rawDesc.itemId && mongoose.Types.ObjectId.isValid(rawDesc.itemId)) {
        rawMatDoc = await Item.findOne({ _id: rawDesc.itemId, companyId });
      }

      if (!rawMatDoc) {
        rawMatDoc = await findOrCreateRawMaterialItem(
          companyId,
          userId,
          rawDesc,
          rawItem.section || itemName
        );
      }

      rawMaterialLinks.push({
        rawMaterialId: rawMatDoc._id,
        rawMaterialName: rawMatDoc.itemName,
        quantityPerUnit: qty || 1,
        uom: (rawDesc.unit || "nos").trim(),
        unitRate: supplyRate,
        notes: srNo ? `Line ${srNo}` : "",
      });

      const lineDoc = {
        itemId: rawMatDoc._id,
        srNo,
        description: descText,
        unit: (rawDesc.unit || "nos").trim(),
        quantity: isRateOnly ? 0 : qty,
        unitRateSupply: supplyRate,
        unitRateInstallation: installRate,
        amountSupply,
        amountInstallation,
        totalAmount,
        amount: totalAmount,
        isRateOnly,
      };

      if (rawDesc._id && mongoose.Types.ObjectId.isValid(rawDesc._id)) {
        lineDoc._id = rawDesc._id;
      }

      validDescriptions.push(lineDoc);
    }

    if (validDescriptions.length === 0) continue;

    // 2. Find or Create Finished Good ("Product") Item & link BOM
    let productDoc = null;
    if (rawItem.itemId && mongoose.Types.ObjectId.isValid(rawItem.itemId)) {
      productDoc = await Item.findOne({ _id: rawItem.itemId, companyId });
    }

    if (!productDoc) {
      productDoc = await Item.findOne({
        companyId,
        itemName: { $regex: new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        itemType: { $ne: "Raw Material" },
      });
    }

    if (productDoc) {
      productDoc.rawMaterials = rawMaterialLinks;
      if (rawItem.sectionSpecification) {
        productDoc.description = rawItem.sectionSpecification.trim();
      }
      await productDoc.save();
    } else {
      const nextCode = await getNextItemCode(companyId);
      productDoc = new Item({
        companyId,
        createdBy: userId,
        itemCode: nextCode,
        serialNumber: (rawItem.itemSerialNo || "").trim(),
        itemName,
        description: (rawItem.sectionSpecification || itemName).trim(),
        category: (rawItem.section || itemName || "Other Work").trim(),
        itemType: "Product",
        unitPrice: 0,
        uom: "set",
        unit: "set",
        rawMaterials: rawMaterialLinks,
        status: "active",
        active: true,
      });
      await productDoc.save();
    }

    const mappedParent = {
      itemId: productDoc._id,
      itemSerialNo: productDoc.itemCode || (rawItem.itemSerialNo || "").trim(),
      itemName: productDoc.itemName,
      section: (rawItem.section || itemName || "Other Work").trim(),
      sectionSpecification: (rawItem.sectionSpecification || "").trim(),
      subSection: (rawItem.subSection || "Main").trim(),
      subSectionIndex: parseInt(rawItem.subSectionIndex) || 1,
      descriptions: validDescriptions,
    };

    if (rawItem._id && mongoose.Types.ObjectId.isValid(rawItem._id)) {
      mappedParent._id = rawItem._id;
    }

    result.push(mappedParent);
  }

  return result;
}

const UPDATABLE_FIELDS = [
  "project",
  "contractor",
  "customer",
  "boqNumber",
  "phase",
  "date",
  "status",
  "remarks",
  "materials",
  "items",
  "taxVAT",
  "taxService",
];

// ─── GET: Single BOQ ──────────────────────────────────────────────────────
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid BOQ ID format" },
        { status: 400 }
      );
    }

    const boq = await BOQ.findOne({ _id: id, companyId: user.companyId })
      .populate("project", "name")
      .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
      .populate("customer", "customerName contactPersonName mobileNumber")
      .populate("createdBy", "name")
      .populate({
        path: "items.itemId",
        select: "itemCode itemName itemType rawMaterials",
        populate: {
          path: "rawMaterials.rawMaterialId",
          select: "itemCode itemName uom unitPrice",
        },
      })
      .populate("items.descriptions.itemId", "itemCode itemName itemType uom unitPrice")
      .lean();

    if (!boq) {
      return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: boq });
  } catch (err) {
    console.error("GET /boq/:id error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── PUT: Update BOQ ──────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid BOQ ID format" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // ── Validate References ──
    if (body.project) {
      const projectDoc = await Project.findOne({ _id: body.project, company: user.companyId });
      if (!projectDoc) {
        return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
      }
    }

    if (body.contractor) {
      const contractorDoc = await Supplier.findOne({ _id: body.contractor, companyId: user.companyId });
      if (!contractorDoc) body.contractor = null;
    }

    if (body.customer) {
      const customerDoc = await Customer.findOne({ _id: body.customer, companyId: user.companyId });
      if (!customerDoc) body.customer = null;
    }

    // ── Load Existing BOQ ──
    const boq = await BOQ.findOne({ _id: id, companyId: user.companyId });
    if (!boq) {
      return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    }

    // ── Update Scalar Fields ──
    for (const field of UPDATABLE_FIELDS) {
      if (field === "items" || field === "materials") continue;
      if (body[field] !== undefined) {
        boq[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
      }
    }

    // ── Update Hierarchical Items & Synchronize BOM ──
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { success: false, message: "BOQ must contain at least one item." },
          { status: 400 }
        );
      }

      const structuredItems = await mapAndDedupeItems(body.items, user.companyId, user.id);
      if (structuredItems.length === 0) {
        return NextResponse.json(
          { success: false, message: "Each item must have a name and at least one description line." },
          { status: 400 }
        );
      }
      boq.items = structuredItems;
    }

    // ── Handle Standalone Materials ──
    if (body.materials !== undefined) {
      if (!Array.isArray(body.materials)) {
        return NextResponse.json({ success: false, message: "Materials must be an array." }, { status: 400 });
      }

      const seenMat = new Set();
      const dedupedMaterials = [];

      for (const mat of body.materials) {
        const itemName = (mat.itemName || "").trim();
        if (!itemName) continue;

        const section = (mat.section || "Other Work").trim();
        const subSection = (mat.subSection || "Main").trim();
        const key = `${normalize(section)}|${normalize(subSection)}|${normalize(itemName)}`;

        if (seenMat.has(key)) continue;
        seenMat.add(key);

        const newMat = {
          itemId: mat.itemId && mongoose.Types.ObjectId.isValid(mat.itemId) ? mat.itemId : null,
          itemName,
          quantity: parseFloat(mat.quantity) || 0,
          unit: (mat.unit || "nos").trim(),
          rate: parseFloat(mat.rate) || 0,
          section,
          subSection,
          subSectionIndex: parseInt(mat.subSectionIndex) || 1,
          isRateOnly: !!mat.isRateOnly,
          consumedQty: parseFloat(mat.consumedQty) || 0,
          consumedAmount: parseFloat(mat.consumedAmount) || 0,
          type: mat.type || "material",
        };

        if (mat._id && mongoose.Types.ObjectId.isValid(mat._id)) {
          newMat._id = mat._id;
        }
        dedupedMaterials.push(newMat);
      }

      boq.materials = dedupedMaterials;
    }

    boq.version = (boq.version || 1) + 1;
    await boq.save();

    await boq.populate([
      { path: "project", select: "name" },
      { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
      { path: "customer", select: "customerName contactPersonName mobileNumber" },
      {
        path: "items.itemId",
        select: "itemCode itemName itemType rawMaterials",
        populate: {
          path: "rawMaterials.rawMaterialId",
          select: "itemCode itemName uom unitPrice",
        },
      },
      { path: "items.descriptions.itemId", select: "itemCode itemName itemType uom unitPrice" },
    ]);

    return NextResponse.json({ success: true, data: boq });
  } catch (err) {
    console.error("❌ PUT /boq/:id error:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return NextResponse.json(
        { success: false, message: `Validation error: ${messages.join(", ")}` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove BOQ ──────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid BOQ ID format" },
        { status: 400 }
      );
    }

    const deleted = await BOQ.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "BOQ deleted successfully" });
  } catch (err) {
    console.error("DELETE /boq/:id error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Delete failed" },
      { status: 500 }
    );
  }
}
