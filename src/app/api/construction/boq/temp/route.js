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

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BOQ from "@/models/contruction/BOQ";
import Item from "@/models/ItemModels";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import * as XLSX from "xlsx";
import stringSimilarity from "string-similarity";
import { batchCorrectItemsWithClaude } from "@/lib/claudeCorrect";
import mongoose from "mongoose";
export const maxDuration = 60;

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
    "inventory manager",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) =>
    allowedRoles.includes(String(role).trim().toLowerCase())
  );
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

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

function number(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[,₹$]/g, "").trim();
  const match = cleaned.match(/^[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

function normalizeText(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeText(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\b(\d+)\s*(kv|v|a|ka|hp|kw|sqmm|sq\s*mm)\b/gi, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function isParentItemNumber(value) {
  return /^\d+00$/.test(clean(value));
}

function isPreambleRow(value) {
  const text = clean(value).toLowerCase();
  return /^[a-z]\)/.test(text) || text.startsWith("general notes:");
}

function isTotalRow(value) {
  const text = clean(value).toUpperCase();
  if (!text) return false;
  return text === "TOTAL" || text === "SUB TOTAL" || text.startsWith("TOTAL ");
}

function isBillableChildLine(desc) {
  const qty = Number(desc.quantity ?? desc.qty) || 0;
  const supplyRate = Number(desc.unitRateSupply) || 0;
  const installRate = Number(desc.unitRateInstallation) || 0;
  const isRateOnly = Boolean(desc.isRateOnly);

  return isRateOnly || (qty > 0 && (supplyRate > 0 || installRate > 0));
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const c0 = clean(rows[i]?.[0]).toUpperCase();
    const c1 = clean(rows[i]?.[1]).toUpperCase();
    if (c0 === "SR. NO." && c1 === "ITEM DESCRIPTION") return i;
  }
  return 0;
}

function parseExcelRows(rows, startRow) {
  const parents = [];
  let currentParent = null;

  for (let i = startRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const srNo = clean(row[0]);
    const description = clean(row[1]);
    const rawQtyStr = clean(row[2]);
    const unit = clean(row[3]) || "nos";
    const unitRateSupply = number(row[4]);
    const unitRateInstallation = number(row[5]);
    const rawAmountCol6 = clean(row[6]);

    const hasRates = unitRateSupply > 0 || unitRateInstallation > 0;
    const hasQty = rawQtyStr !== "" && !isNaN(parseFloat(rawQtyStr));

    const isRateOnly =
      rawQtyStr.toUpperCase() === "RATE ONLY" ||
      rawAmountCol6.toUpperCase() === "RATE ONLY";

    const quantity = isRateOnly
      ? 0
      : (hasQty ? number(rawQtyStr) : (hasRates ? 1 : 0));

    if (isFooterMarker(srNo) || isFooterMarker(description)) {
      break;
    }

    if (!srNo && !description && !hasQty && !hasRates) continue;
    if (description === "." || isPreambleRow(srNo) || isPreambleRow(description)) continue;
    if (isTotalRow(srNo) || isTotalRow(description)) continue;

    // Handle Parent Item Headers (e.g., 1000, 1100, 2000)
    if (isParentItemNumber(srNo)) {
      if (currentParent && currentParent.itemSerialNo === srNo) {
        continue;
      }

      currentParent = {
        itemSerialNo: srNo,
        itemCode: srNo, // Initialized with serial number until resolved with master catalog code
        itemName: description || `Item ${srNo}`,
        section: description || "Other Work",
        subSection: "Main",
        subSectionIndex: 1,
        sectionSpecification: "",
        descriptions: [],
      };
      parents.push(currentParent);
      continue;
    }

    if (!currentParent || !description) continue;

    if (!srNo && description.startsWith("(") && !hasQty && !hasRates) {
      if (currentParent.descriptions.length > 0) {
        currentParent.descriptions[currentParent.descriptions.length - 1].description += `\n${description}`;
      }
      continue;
    }

    if (!hasQty && !hasRates && !isRateOnly) {
      continue;
    }

    const child = {
      srNo,
      itemCode: srNo, // Initialized with serial number until resolved with master catalog code
      description,
      unit,
      quantity,
      unitRateSupply,
      unitRateInstallation,
      isRateOnly,
    };

    const duplicate = currentParent.descriptions.some(
      (existing) =>
        normalizeText(existing.srNo) === normalizeText(child.srNo) &&
        normalizeText(existing.description) === normalizeText(child.description)
    );

    if (!duplicate) currentParent.descriptions.push(child);
  }

  return parents.filter((p) => p.descriptions.length > 0);
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

function isFooterMarker(value) {
  const text = clean(value).toUpperCase();
  if (!text) return false;
  return (
    text.includes("SIGNATURE OF THE TENDERER") ||
    text.includes("TOTAL AMOUNT IN FIGURE") ||
    text.includes("IN WORDS") ||
    text === "SIGNATURE"
  );
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const targetCompanyId = user.companyId || user.company || user._id;

  try {
    const contentType = req.headers.get("content-type") || "";

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 2: CONFIRM & PERSIST TO ITEM MASTER
    // ─────────────────────────────────────────────────────────────────────────
    if (contentType.includes("application/json")) {
      const { projectId, contractorId, customerId, phase, mappedParents } = await req.json();

      if (!Array.isArray(mappedParents) || mappedParents.length === 0) {
        return NextResponse.json(
          { success: false, message: "Missing project ID or items." },
          { status: 400 }
        );
      }

      const existingItems = await Item.find({ companyId: targetCompanyId }).lean();
      const rawMaterialMap = new Map();
      const productMap = new Map();

      for (const it of existingItems) {
        const key = canonicalizeText(it.itemName);
        if (it.itemType === "Raw Material") {
          rawMaterialMap.set(key, it);
        } else {
          productMap.set(key, it);
        }
      }

      const lastItem = await Item.findOne({
        companyId: targetCompanyId,
        itemCode: { $regex: /^ITEM-\d+$/ },
      })
        .sort({ createdAt: -1 })
        .select("itemCode")
        .lean();

      let nextCodeNum = lastItem?.itemCode
        ? (parseInt(lastItem.itemCode.replace("ITEM-", ""), 10) || 0) + 1
        : 1;
      const nextItemCode = () => `ITEM-${String(nextCodeNum++).padStart(5, "0")}`;

      const newItemDocs = [];
      const bulkUpdates = [];
      const boqItems = [];

      for (const parent of mappedParents) {
        const cleanParentName = (parent.itemName || "").trim();
        if (!cleanParentName) continue;
        const cleanCategory = cleanParentName;
        const normParentKey = canonicalizeText(cleanParentName);

        const resolvedRawMaterialsForParent = [];
        const resolvedBOQDescriptions = [];
        let parentSupplyTotal = 0;
        let parentInstallTotal = 0;

        for (const desc of parent.descriptions || []) {
          const descText = (desc.description || "").trim();
          if (!descText) continue;

          const isBillable = isBillableChildLine(desc);

          if (!isBillable) {
            resolvedBOQDescriptions.push({
              itemId: null,
              itemCode: desc.itemCode || desc.srNo || "",
              srNo: desc.srNo || "",
              description: descText,
              unit: "—",
              quantity: 0,
              unitRateSupply: 0,
              unitRateInstallation: 0,
              amountSupply: 0,
              amountInstallation: 0,
              totalAmount: 0,
              amount: 0,
              isRateOnly: false,
              isHeader: true,
            });
            continue;
          }

          const normDescKey = canonicalizeText(descText);
          const supplyRate = Number(desc.unitRateSupply) || 0;
          const installRate = Number(desc.unitRateInstallation) || 0;
          const isRateOnly = Boolean(desc.isRateOnly);
          const qty = isRateOnly ? 0 : Number(desc.quantity ?? desc.qty) || 0;

          const supplyAmt = isRateOnly ? supplyRate : qty * supplyRate;
          const installAmt = isRateOnly ? installRate : qty * installRate;
          const totalAmt = supplyAmt + installAmt;

          const effectiveUnitPrice =
            supplyRate + installRate > 0 ? supplyRate + installRate : totalAmt;

          parentSupplyTotal += supplyAmt;
          parentInstallTotal += installAmt;

          let rawMaterialDoc = null;

          if (desc.action === "merge" && desc.selectedMasterId) {
            rawMaterialDoc =
              existingItems.find((m) => String(m._id) === String(desc.selectedMasterId)) ||
              rawMaterialMap.get(canonicalizeText(desc.matchedDescriptionText || ""));
          }

          if (!rawMaterialDoc && rawMaterialMap.has(normDescKey)) {
            rawMaterialDoc = rawMaterialMap.get(normDescKey);
          }

          if (!rawMaterialDoc && desc.action !== "create_new") {
            for (const [key, doc] of rawMaterialMap.entries()) {
              if (stringSimilarity.compareTwoStrings(normDescKey, key) >= 0.85) {
                rawMaterialDoc = doc;
                break;
              }
            }
          }

          if (!rawMaterialDoc) {
            const newRawMat = {
              _id: new mongoose.Types.ObjectId(),
              companyId: targetCompanyId,
              createdBy: user.id,
              itemCode: nextItemCode(),
              serialNumber: desc.srNo || "",
              itemName: descText,
              description: descText,
              category: cleanCategory,
              itemType: "Raw Material",
              unit: (desc.unit || "nos").toLowerCase(),
              uom: (desc.unit || "nos").toLowerCase(),
              quantity: qty,
              unitPrice: effectiveUnitPrice,
              unitRateSupply: supplyRate,
              unitRateInstallation: installRate,
              amountSupply: supplyAmt,
              amountInstallation: installAmt,
              totalAmount: totalAmt,
              isRateOnly,
              status: "active",
              active: true,
            };

            newItemDocs.push(newRawMat);
            rawMaterialDoc = newRawMat;
            rawMaterialMap.set(normDescKey, newRawMat);
          } else {
            const updatedFields = {
              category: cleanCategory,
              unitRateSupply: supplyRate,
              unitRateInstallation: installRate,
              unitPrice: effectiveUnitPrice,
              amountSupply: supplyAmt,
              amountInstallation: installAmt,
              totalAmount: totalAmt,
              quantity: qty,
              unit: (desc.unit || rawMaterialDoc.unit || "nos").toLowerCase(),
              uom: (desc.unit || rawMaterialDoc.uom || "nos").toLowerCase(),
              isRateOnly,
            };
            bulkUpdates.push({
              updateOne: { filter: { _id: rawMaterialDoc._id }, update: { $set: updatedFields } },
            });
            Object.assign(rawMaterialDoc, updatedFields);
          }

          resolvedRawMaterialsForParent.push({
            rawMaterialId: rawMaterialDoc._id,
            rawMaterialName: rawMaterialDoc.itemName,
            quantityPerUnit: qty || 1,
            unit: (desc.unit || "nos").toLowerCase(),
            uom: (desc.unit || "nos").toLowerCase(),
            unitRateSupply: supplyRate,
            unitRateInstallation: installRate,
            unitRate: supplyRate,
            amountSupply: supplyAmt,
            amountInstallation: installAmt,
            totalAmount: totalAmt,
            notes: desc.srNo ? `Tender Sr ${desc.srNo}` : "",
          });

          resolvedBOQDescriptions.push({
            itemId: rawMaterialDoc._id,
            itemCode: rawMaterialDoc.itemCode,
            srNo: desc.srNo || "",
            description: descText,
            unit: desc.unit || "nos",
            quantity: qty,
            unitRateSupply: supplyRate,
            unitRateInstallation: installRate,
            amountSupply: supplyAmt,
            amountInstallation: installAmt,
            totalAmount: totalAmt,
            amount: totalAmt,
            isRateOnly,
            isHeader: false,
          });
        }

        let productDoc = null;

        if (parent.action === "merge" && parent.selectedMasterId) {
          productDoc = existingItems.find((m) => String(m._id) === String(parent.selectedMasterId));
        }
        if (!productDoc && productMap.has(normParentKey)) {
          productDoc = productMap.get(normParentKey);
        }

        const parentGrandTotal = parentSupplyTotal + parentInstallTotal;

        if (productDoc) {
          const updatedFields = {
            category: cleanCategory,
            rawMaterials: resolvedRawMaterialsForParent,
            amountSupply: parentSupplyTotal,
            amountInstallation: parentInstallTotal,
            totalAmount: parentGrandTotal,
            unitRateSupply: parentSupplyTotal,
            unitRateInstallation: parentInstallTotal,
            unitPrice: parentGrandTotal,
          };
          bulkUpdates.push({
            updateOne: { filter: { _id: productDoc._id }, update: { $set: updatedFields } },
          });
          Object.assign(productDoc, updatedFields);
        } else {
          productDoc = {
            _id: new mongoose.Types.ObjectId(),
            companyId: targetCompanyId,
            createdBy: user.id,
            itemCode: nextItemCode(),
            serialNumber: parent.itemSerialNo || "",
            itemName: cleanParentName,
            description: parent.sectionSpecification || cleanParentName,
            category: cleanCategory,
            itemType: "Product",
            unit: "set",
            uom: "set",
            quantity: 1,
            unitRateSupply: parentSupplyTotal,
            unitRateInstallation: parentInstallTotal,
            unitPrice: parentGrandTotal,
            amountSupply: parentSupplyTotal,
            amountInstallation: parentInstallTotal,
            totalAmount: parentGrandTotal,
            rawMaterials: resolvedRawMaterialsForParent,
            status: "active",
            active: true,
          };
          newItemDocs.push(productDoc);
          productMap.set(normParentKey, productDoc);
        }

        boqItems.push({
          itemId: productDoc._id,
          itemSerialNo: productDoc.itemCode,
          itemCode: productDoc.itemCode,
          itemName: cleanParentName,
          section: cleanCategory,
          sectionSpecification: parent.sectionSpecification || "",
          subSection: parent.subSection || "Main",
          subSectionIndex: parent.subSectionIndex || 1,
          descriptions: resolvedBOQDescriptions,
        });
      }

      if (newItemDocs.length) await Item.insertMany(newItemDocs);
      if (bulkUpdates.length) await Item.bulkWrite(bulkUpdates);

      const count = await BOQ.countDocuments({ companyId: targetCompanyId });
      const boqNumber = `BOQ-${String(count + 1).padStart(5, "0")}`;

      const boq = new BOQ({
        companyId: targetCompanyId,
        contractor: contractorId || null,
        customer: customerId || null,
        boqNumber,
        phase: phase || "I",
        date: new Date(),
        status: "draft",
        remarks: "",
        items: boqItems,
        materials: [],
        taxVAT: 0,
        taxService: 0,
        createdBy: user.id,
      });

      await boq.save();

      return NextResponse.json({
        success: true,
        message: `BOQ loaded with ${boqItems.length} Products and linked Raw Materials.`,
        data: { boq },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 1: ANALYZE EXCEL & SEPARATE RAW MATERIAL MATCHING
    // ─────────────────────────────────────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "File required." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    let sheet = null;

    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toUpperCase().includes("BOQ")) {
        sheet = workbook.Sheets[sheetName];
        break;
      }
    }

    if (!sheet) {
      for (const sheetName of workbook.SheetNames) {
        const candidate = workbook.Sheets[sheetName];
        const candidateRows = XLSX.utils.sheet_to_json(candidate, { header: 1, defval: "" });
        const found = candidateRows.slice(0, 30).some(
          (row) =>
            clean(row?.[0]).toUpperCase() === "SR. NO." &&
            clean(row?.[1]).toUpperCase() === "ITEM DESCRIPTION"
        );
        if (found) {
          sheet = candidate;
          break;
        }
      }
    }

    if (!sheet) {
      sheet = workbook.Sheets[workbook.SheetNames[0]];
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });

    const headerRow = findHeaderRow(rows);
    const parents = parseExcelRows(rows, headerRow);

    if (!parents.length) {
      return NextResponse.json({ success: false, message: "No items parsed from Excel." }, { status: 400 });
    }

    const allMasterItems = await Item.find({ companyId: targetCompanyId })
      .select(
        "_id itemCode itemName description itemType unit uom quantity unitPrice unitRateSupply unitRateInstallation amountSupply amountInstallation totalAmount rawMaterials"
      )
      .lean();

    const masterProducts = allMasterItems.filter((i) => i.itemType !== "Raw Material");
    const masterRawMaterials = allMasterItems.filter((i) => i.itemType === "Raw Material");

    const aiPayload = [];
    parents.forEach((parent, pIdx) => {
      aiPayload.push({ id: `parent-${pIdx}`, itemName: parent.itemName || "", description: "" });
      (parent.descriptions || []).forEach((desc, dIdx) => {
        aiPayload.push({ id: `desc-${pIdx}-${dIdx}`, itemName: "", description: desc.description || "" });
      });
    });

    const aiResults = [];
    const CHUNK_SIZE = 15;
    const CONCURRENCY = 5;

    const chunks = [];
    for (let i = 0; i < aiPayload.length; i += CHUNK_SIZE) {
      chunks.push(aiPayload.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map((chunk) =>
          batchCorrectItemsWithClaude(
            targetCompanyId,
            chunk,
            allMasterItems.map((m) => m.itemName).filter(Boolean)
          )
        )
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          aiResults.push(...result.value);
        } else {
          console.error("AI clean batch error:", result.reason);
        }
      }
    }

    const aiMap = new Map(aiResults.map((r) => [r.id, r]));

    let totalAiSuggestionsCount = 0;

    const analyzedItems = parents.map((parent, pIdx) => {
      const parentId = `item-${pIdx}`;
      const parentAiClean = aiMap.get(`parent-${pIdx}`);
      const rawParentName = (parent.itemName || "").trim();
      const suggestedParentName = parentAiClean?.correctedItemName?.trim() || rawParentName;
      const parentHasAiChange =
        Boolean(parentAiClean?.changesMade) ||
        suggestedParentName.toLowerCase() !== rawParentName.toLowerCase();

      if (parentHasAiChange) totalAiSuggestionsCount++;

      const analyzedDescriptions = (parent.descriptions || []).map((desc, dIdx) => {
        const isBillable = isBillableChildLine(desc);
        const childAiClean = aiMap.get(`desc-${pIdx}-${dIdx}`);
        const rawDesc = (desc.description || "").trim();
        const suggestedDesc = childAiClean?.correctedDescription?.trim() || rawDesc;
        const childHasAiChange =
          Boolean(childAiClean?.changesMade) ||
          suggestedDesc.toLowerCase() !== rawDesc.toLowerCase();

        if (childHasAiChange) totalAiSuggestionsCount++;

        if (!isBillable) {
          return {
            ...desc,
            id: `desc-${pIdx}-${dIdx}`,
            itemCode: desc.srNo || "",
            originalDescription: rawDesc,
            description: suggestedDesc,
            suggestedDescription: suggestedDesc,
            hasAiSuggestion: childHasAiChange,
            useAiSuggestion: childHasAiChange,
            matchedMasterItem: null,
            matchedDescriptionText: null,
            matchScore: 0,
            status: "header_clause",
            action: "ignore",
            selectedMasterId: null,
            isScopeHeader: true,
          };
        }

        const normSuggested = canonicalizeText(suggestedDesc);
        const normOriginal = canonicalizeText(rawDesc);

        let bestRawMat = null;
        let highestRawScore = 0;

        for (const candidate of masterRawMaterials) {
          const candidateName = canonicalizeText(candidate.itemName);
          const score = Math.max(
            stringSimilarity.compareTwoStrings(normSuggested, candidateName),
            stringSimilarity.compareTwoStrings(normOriginal, candidateName)
          );

          if (score > highestRawScore) {
            highestRawScore = score;
            bestRawMat = candidate;
          }
        }

        const matchPercent = Math.round(highestRawScore * 100);
        const isMatched = matchPercent >= 75 && bestRawMat !== null;

        return {
          ...desc,
          id: `desc-${pIdx}-${dIdx}`,
          itemCode: isMatched && bestRawMat?.itemCode ? bestRawMat.itemCode : desc.srNo || "",
          originalDescription: rawDesc,
          description: suggestedDesc,
          suggestedDescription: suggestedDesc,
          hasAiSuggestion: childHasAiChange,
          useAiSuggestion: childHasAiChange,
          matchedMasterItem: isMatched ? bestRawMat : null,
          matchedDescriptionText: isMatched ? bestRawMat.itemName : null,
          matchScore: isMatched ? matchPercent : 0,
          status: matchPercent >= 85 ? "in_master" : isMatched ? "suggested_match" : "not_in_master",
          action: matchPercent >= 85 ? "merge" : "create_new",
          selectedMasterId: matchPercent >= 85 && bestRawMat ? bestRawMat._id : null,
          isScopeHeader: false,
        };
      });

      const normParentSuggested = canonicalizeText(suggestedParentName);
      const normParentOriginal = canonicalizeText(rawParentName);

      let bestProduct = null;
      let highestProductScore = 0;

      for (const prod of masterProducts) {
        const prodName = canonicalizeText(prod.itemName);
        const score = Math.max(
          stringSimilarity.compareTwoStrings(normParentSuggested, prodName),
          stringSimilarity.compareTwoStrings(normOriginal, prodName)
        );
        if (score > highestProductScore) {
          highestProductScore = score;
          bestProduct = prod;
        }
      }

      const parentMatchPercent = Math.round(highestProductScore * 100);
      const isParentMatched = parentMatchPercent >= 80 && bestProduct !== null;

      return {
        id: parentId,
        ...parent,
        itemCode: isParentMatched && bestProduct?.itemCode ? bestProduct.itemCode : parent.itemSerialNo || "",
        itemName: suggestedParentName,
        suggestedItemName: suggestedParentName,
        originalItemName: rawParentName,
        hasAiSuggestion: parentHasAiChange,
        useAiSuggestion: parentHasAiChange,
        descriptions: analyzedDescriptions,
        matchedMasterItem: isParentMatched ? bestProduct : null,
        matchScore: isParentMatched ? parentMatchPercent : 0,
        status: isParentMatched ? "in_master" : parentMatchPercent >= 50 ? "suggested_match" : "not_in_master",
        action: isParentMatched ? "merge" : "create_new",
        selectedMasterId: isParentMatched ? bestProduct._id : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalFound: parents.length,
        itemsInMaster: analyzedItems.filter((i) => i.status === "in_master").length,
        itemsSuggested: totalAiSuggestionsCount,
        itemsNew: analyzedItems.filter((i) => i.status === "not_in_master").length,
        items: analyzedItems,
      },
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
