// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import BOQ from "@/models/contruction/BOQ";
// import Project from "@/models/project/ProjectModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import * as XLSX from "xlsx";

// // ─── Auth Helper Functions ────────────────────────────────────────────────
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

// // ─── Helper: Check if a row is a Section Header ──────────────────────────
// function isSectionHeader(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim().toUpperCase();
//   // Pattern: "1. PLASTERING WORK" or "2. FLOORING & CLADDING WORK"
//   if (/^[\d]+\.\s+[A-Z]/.test(trimmed)) return true;
//   // Check for common section keywords
//   const sectionKeywords = [
//     "PLASTERING",
//     "FLOORING",
//     "CLADDING",
//     "CEILING",
//     "PANELLING",
//     "JOINERY",
//     "PAINTING",
//     "MISCELLANEOUS",
//   ];
//   return sectionKeywords.some((kw) => trimmed.includes(kw) && trimmed.includes("WORK"));
// }

// function extractSectionName(text) {
//   if (!text) return "Other Work";
//   const trimmed = text.toString().trim();
//   // Remove number prefix like "1. "
//   return trimmed.replace(/^[\d]+\.\s*/, "").trim();
// }

// // ─── Helper: Check if row is preamble (a), b), c) etc.) ──────────────────
// function isPreambleRow(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim();
//   return /^[a-z]\)/.test(trimmed) || trimmed.startsWith("a)") || trimmed.startsWith("b)") || trimmed.startsWith("c)");
// }

// // ─── Helper: Check if row is "Rate Only" ──────────────────────────────────
// function isRateOnly(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim().toUpperCase();
//   return trimmed === "RATE ONLY";
// }

// // ─── Helper: Check if row is "TOTAL" ──────────────────────────────────────
// function isTotalRow(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim().toUpperCase();
//   return trimmed === "TOTAL" || trimmed === "SUB TOTAL" || trimmed === "TOTAL OF" || trimmed.includes("TOTAL");
// }

// // ─── POST: Import BOQ from Excel ──────────────────────────────────────────
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const formData = await req.formData();
//     const file = formData.get("file");
//     const projectId = formData.get("projectId");

//     if (!file || !projectId) {
//       return NextResponse.json(
//         { success: false, message: "File and projectId required" },
//         { status: 400 }
//       );
//     }

//     // Validate project belongs to user's company
//     const project = await Project.findOne({ _id: projectId, company: user.companyId });
//     if (!project) {
//       return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
//     }

//     // ─── Parse Excel ──────────────────────────────────────────────────────
//     const buffer = await file.arrayBuffer();
//     const workbook = XLSX.read(buffer, { type: "buffer" });

//     // Find sheets
//     let boqSheet = null;
//     let summarySheet = null;
//     let phaseDetected = "I";

//     for (const sheetName of workbook.SheetNames) {
//       const upperName = sheetName.toUpperCase();
//       if (upperName.includes("BOQ-PHASE")) {
//         boqSheet = workbook.Sheets[sheetName];
//         if (upperName.includes("II")) phaseDetected = "II";
//         break;
//       }
//       if (upperName.includes("SUMMARY")) {
//         summarySheet = workbook.Sheets[sheetName];
//       }
//     }

//     // If no BOQ sheet found, find any sheet with "SR. NO." in first column
//     if (!boqSheet) {
//       for (const sheetName of workbook.SheetNames) {
//         const sheet = workbook.Sheets[sheetName];
//         const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//         for (let i = 0; i < Math.min(rows.length, 20); i++) {
//           if (rows[i] && rows[i][0] && rows[i][0]?.toString().trim().toUpperCase() === "SR. NO.") {
//             boqSheet = sheet;
//             if (sheetName.toUpperCase().includes("II")) phaseDetected = "II";
//             break;
//           }
//         }
//         if (boqSheet) break;
//       }
//     }

//     if (!boqSheet) {
//       return NextResponse.json(
//         { success: false, message: "No BOQ sheet found in the file" },
//         { status: 400 }
//       );
//     }

//     const rows = XLSX.utils.sheet_to_json(boqSheet, { header: 1 });

//     // ─── Find start row (look for "SR. NO.") ──────────────────────────────
//     let startRow = -1;
//     for (let i = 0; i < rows.length; i++) {
//       if (rows[i] && rows[i][0] && rows[i][0].toString().trim().toUpperCase() === "SR. NO.") {
//         startRow = i + 1;
//         break;
//       }
//     }

//     if (startRow === -1) {
//       return NextResponse.json(
//         { success: false, message: "Could not find item rows in the sheet" },
//         { status: 400 }
//       );
//     }

//     // ─── Parse items with section detection ──────────────────────────────
//     const items = [];
//     let currentSection = "Other Work";
//     let totalAmount = 0;

//     for (let i = startRow; i < rows.length; i++) {
//       const row = rows[i];
//       if (!row || row.length < 2) continue;

//       const col0 = row[0]?.toString().trim() || "";
//       const col1 = row[1]?.toString().trim() || "";
//       const unit = row[2]?.toString().trim() || "";
//       const rateStr = row[3]?.toString().trim() || "";
//       const qtyStr = row[4]?.toString().trim() || "";
//       const amountStr = row[5]?.toString().trim() || "";

//       // ── Skip preamble rows (a), b), c) etc.) ────────────────────────
//       if (isPreambleRow(col0) || isPreambleRow(col1)) {
//         continue;
//       }

//       // ── Check if this is a section header ──────────────────────────────
//       if (isSectionHeader(col0) && !col1) {
//         currentSection = extractSectionName(col0);
//         continue;
//       }
//       if (isSectionHeader(col1) && !col0) {
//         currentSection = extractSectionName(col1);
//         continue;
//       }

//       // ── Skip TOTAL rows ────────────────────────────────────────────────
//       if (isTotalRow(col0) || isTotalRow(col1)) {
//         continue;
//       }

//       // ── Skip "Rate Only" items ────────────────────────────────────────
//       const isRateOnlyItem = isRateOnly(qtyStr) || isRateOnly(amountStr);
//       if (isRateOnlyItem) {
//         // Still add as a reference item with quantity 0
//         const itemName = col1 || col0 || "Unnamed Item";
//         items.push({
//           itemId: null,
//           itemName: itemName.substring(0, 200),
//           description: itemName,
//           unit: unit || "nos",
//           quantity: 0,
//           rate: parseFloat(rateStr) || 0,
//           amount: 0,
//           section: currentSection,
//           isRateOnly: true,
//         });
//         continue;
//       }

//       // ── Parse actual item ──────────────────────────────────────────────
//       const quantity = parseFloat(qtyStr) || 0;
//       const rate = parseFloat(rateStr) || 0;
//       const amount = parseFloat(amountStr) || 0;

//       // Skip completely empty rows
//       if (!col1 && !col0 && quantity === 0 && rate === 0) continue;

//       const itemName = col1 || col0 || "Unnamed Item";

//       // Only add if it has valid data (quantity > 0 or rate > 0)
//       if (itemName && (quantity > 0 || rate > 0)) {
//         const finalAmount = amount || quantity * rate;
//         totalAmount += finalAmount;

//         items.push({
//           itemId: null,
//           itemName: itemName.substring(0, 200),
//           description: itemName,
//           unit: unit || "nos",
//           quantity: quantity || 0,
//           rate: rate || 0,
//           amount: finalAmount,
//           section: currentSection,
//           isRateOnly: false,
//         });
//       }
//     }

//     if (items.length === 0) {
//       return NextResponse.json(
//         { success: false, message: "No items extracted from the BOQ sheet" },
//         { status: 400 }
//       );
//     }

//     // ─── Extract tax details from SUMMARY sheet ────────────────────────────
//     let taxVAT = 0;
//     let taxService = 0;

//     if (summarySheet) {
//       const summaryRows = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
//       for (const row of summaryRows) {
//         const col0 = row[0]?.toString().trim() || "";
//         const col5 = parseFloat(row[5]) || 0;
//         if (col0.includes("VAT")) {
//           taxVAT = col5;
//         }
//         if (col0.includes("Service Tax")) {
//           taxService = col5;
//         }
//       }
//     }

//     // ─── Auto-generate BOQ number ──────────────────────────────────────────
//     const count = await BOQ.countDocuments({ companyId: user.companyId });
//     const boqNumber = `BOQ-${String(count + 1).padStart(5, "0")}`;

//     // ─── Create BOQ ──────────────────────────────────────────────────────────
//     const boqData = {
//       companyId: user.companyId,
//       project: projectId,
//       boqNumber,
//       phase: phaseDetected,
//       date: new Date(),
//       status: "draft",
//       remarks: `Imported from Excel on ${new Date().toLocaleDateString()}. Phase: ${phaseDetected}`,
//       items: items,
//       taxVAT: taxVAT,
//       taxService: taxService,
//       createdBy: user.id,
//     };

//     const boq = new BOQ(boqData);
//     await boq.save();

//     // ─── Build section summary for response (pre‑save already updated totals) ──
//     const sectionSummary = {};
//     items
//       .filter((item) => !item.isRateOnly)
//       .forEach((item) => {
//         if (item.section) {
//           sectionSummary[item.section] =
//             (sectionSummary[item.section] || 0) + (item.amount || 0);
//         }
//       });

//     // ─── Response ──────────────────────────────────────────────────────────
//     return NextResponse.json({
//       success: true,
//       message: `BOQ created with ${items.length} items (${items.filter(i => !i.isRateOnly).length} quantity items) across ${Object.keys(sectionSummary).length} sections`,
//       data: {
//         boq: boq,
//         sections: Object.keys(sectionSummary),
//         sectionSummary: sectionSummary,
//         totalItems: items.length,
//         totalAmount: totalAmount,
//         grandTotal: boq.grandTotal,
//         phase: phaseDetected,
//         taxVAT: taxVAT,
//         taxService: taxService,
//       },
//     });
//   } catch (err) {
//     console.error("BOQ Import Error:", err);
//     // Handle duplicate boqNumber (rare in import but possible)
//     if (err.code === 11000) {
//       return NextResponse.json(
//         { success: false, message: "A BOQ with this number already exists. Please try again." },
//         { status: 409 }
//       );
//     }
//     return NextResponse.json(
//       { success: false, message: err.message || "Import failed" },
//       { status: 500 }
//     );
//   }
// }

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import BOQ from "@/models/contruction/BOQ";
// import Project from "@/models/project/ProjectModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import * as XLSX from "xlsx";

// // ─── Auth Helper Functions ────────────────────────────────────────────────
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

// // ─── Helper: Check if a row is a Section Header ──────────────────────────
// function isSectionHeader(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim().toUpperCase();
//   // Pattern: "1. PLASTERING WORK" or "2. FLOORING & CLADDING WORK"
//   if (/^[\d]+\.\s+[A-Z]/.test(trimmed)) return true;
//   // Check for common section keywords
//   const sectionKeywords = [
//     "PLASTERING",
//     "FLOORING",
//     "CLADDING",
//     "CEILING",
//     "PANELLING",
//     "JOINERY",
//     "PAINTING",
//     "MISCELLANEOUS",
//   ];
//   return sectionKeywords.some((kw) => trimmed.includes(kw) && trimmed.includes("WORK"));
// }

// function extractSectionName(text) {
//   if (!text) return "Other Work";
//   const trimmed = text.toString().trim();
//   // Remove number prefix like "1. "
//   return trimmed.replace(/^[\d]+\.\s*/, "").trim();
// }

// // ─── Helper: Check if row is preamble (a), b), c) etc.) ──────────────────
// function isPreambleRow(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim();
//   return /^[a-z]\)/.test(trimmed) || trimmed.startsWith("a)") || trimmed.startsWith("b)") || trimmed.startsWith("c)");
// }

// // ─── Helper: Check if row is "Rate Only" ──────────────────────────────────
// function isRateOnly(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim().toUpperCase();
//   return trimmed === "RATE ONLY";
// }

// // ─── Helper: Check if row is "TOTAL" ──────────────────────────────────────
// function isTotalRow(text) {
//   if (!text) return false;
//   const trimmed = text.toString().trim().toUpperCase();
//   return trimmed === "TOTAL" || trimmed === "SUB TOTAL" || trimmed === "TOTAL OF" || trimmed.includes("TOTAL");
// }

// // ─── POST: Import BOQ from Excel ──────────────────────────────────────────
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const formData = await req.formData();
//     const file = formData.get("file");
//     const projectId = formData.get("projectId");

//     if (!file || !projectId) {
//       return NextResponse.json(
//         { success: false, message: "File and projectId required" },
//         { status: 400 }
//       );
//     }

//     // Validate project belongs to user's company
//     const project = await Project.findOne({ _id: projectId, company: user.companyId });
//     if (!project) {
//       return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
//     }

//     // ─── Parse Excel ──────────────────────────────────────────────────────
//     const buffer = await file.arrayBuffer();
//     const workbook = XLSX.read(buffer, { type: "buffer" });

//     // Find sheets
//     let boqSheet = null;
//     let summarySheet = null;
//     let phaseDetected = "I";

//     for (const sheetName of workbook.SheetNames) {
//       const upperName = sheetName.toUpperCase();
//       if (upperName.includes("BOQ-PHASE")) {
//         boqSheet = workbook.Sheets[sheetName];
//         if (upperName.includes("II")) phaseDetected = "II";
//         break;
//       }
//       if (upperName.includes("SUMMARY")) {
//         summarySheet = workbook.Sheets[sheetName];
//       }
//     }

//     // If no BOQ sheet found, find any sheet with "SR. NO." in first column
//     if (!boqSheet) {
//       for (const sheetName of workbook.SheetNames) {
//         const sheet = workbook.Sheets[sheetName];
//         const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//         for (let i = 0; i < Math.min(rows.length, 20); i++) {
//           if (rows[i] && rows[i][0] && rows[i][0]?.toString().trim().toUpperCase() === "SR. NO.") {
//             boqSheet = sheet;
//             if (sheetName.toUpperCase().includes("II")) phaseDetected = "II";
//             break;
//           }
//         }
//         if (boqSheet) break;
//       }
//     }

//     if (!boqSheet) {
//       return NextResponse.json(
//         { success: false, message: "No BOQ sheet found in the file" },
//         { status: 400 }
//       );
//     }

//     const rows = XLSX.utils.sheet_to_json(boqSheet, { header: 1 });

//     // ─── Find start row (look for "SR. NO.") ──────────────────────────────
//     let startRow = -1;
//     for (let i = 0; i < rows.length; i++) {
//       if (rows[i] && rows[i][0] && rows[i][0].toString().trim().toUpperCase() === "SR. NO.") {
//         startRow = i + 1;
//         break;
//       }
//     }

//     if (startRow === -1) {
//       return NextResponse.json(
//         { success: false, message: "Could not find item rows in the sheet" },
//         { status: 400 }
//       );
//     }

//     // ─── Parse items with section detection ──────────────────────────────
//     // NOTE: the current BOQ item schema is Item-header + Description-lines
//     // (itemGroupId / itemSerialNo / itemName shared by a group, srNo /
//     // description / rates per line). This sheet format is flat — one row =
//     // one line of work, with no way to tell which rows belong under the
//     // same Item header. So each imported row becomes its own self-contained
//     // Item (its own itemGroupId + itemSerialNo, one description line). That
//     // is deliberate: giving every row a *unique* itemGroupId guarantees rows
//     // never wrongly collapse into (or duplicate) someone else's Item header
//     // just because they happen to share a blank serial no. or item name.
//     // If your sheets do encode multi-line items (e.g. "4" then "4.1", "4.2"
//     // sub-rows), tell us the numbering convention and this can group them
//     // under one itemGroupId instead.
//     const items = [];
//     const rateOnlyFlags = [];
//     let currentSection = "Other Work";
//     let totalAmount = 0;
//     let rowCounter = 0;
//     const importBatchId = Date.now();

//     for (let i = startRow; i < rows.length; i++) {
//       const row = rows[i];
//       if (!row || row.length < 2) continue;

//       const col0 = row[0]?.toString().trim() || "";
//       const col1 = row[1]?.toString().trim() || "";
//       const unit = row[2]?.toString().trim() || "";
//       const rateStr = row[3]?.toString().trim() || "";
//       const qtyStr = row[4]?.toString().trim() || "";
//       const amountStr = row[5]?.toString().trim() || "";

//       // ── Skip preamble rows (a), b), c) etc.) ────────────────────────
//       if (isPreambleRow(col0) || isPreambleRow(col1)) {
//         continue;
//       }

//       // ── Check if this is a section header ──────────────────────────────
//       if (isSectionHeader(col0) && !col1) {
//         currentSection = extractSectionName(col0);
//         continue;
//       }
//       if (isSectionHeader(col1) && !col0) {
//         currentSection = extractSectionName(col1);
//         continue;
//       }

//       // ── Skip TOTAL rows ────────────────────────────────────────────────
//       if (isTotalRow(col0) || isTotalRow(col1)) {
//         continue;
//       }

//       // ── Skip "Rate Only" items ────────────────────────────────────────
//       const isRateOnlyItem = isRateOnly(qtyStr) || isRateOnly(amountStr);
//       if (isRateOnlyItem) {
//         const itemName = (col1 || col0 || "Unnamed Item").substring(0, 200);
//         rowCounter += 1;
//         const rate = parseFloat(rateStr) || 0;
//         items.push({
//           itemGroupId: `import-${importBatchId}-${rowCounter}`,
//           itemSerialNo: col0 || "",
//           itemName,
//           srNo: col0 || "",
//           description: itemName,
//           unit: unit || "nos",
//           quantity: 0,
//           // No supply/install split in this sheet format — the single rate
//           // is treated as the supply rate so `amount` still equals `rate`
//           // for a rate-only line (installation stays 0).
//           unitRateSupply: rate,
//           unitRateInstallation: 0,
//           amountSupply: rate,
//           amountInstallation: 0,
//           amount: rate,
//           section: currentSection,
//           subSection: "Main",
//         });
//         rateOnlyFlags.push(true);
//         continue;
//       }

//       // ── Parse actual item ──────────────────────────────────────────────
//       const quantity = parseFloat(qtyStr) || 0;
//       const rate = parseFloat(rateStr) || 0;
//       const amount = parseFloat(amountStr) || 0;

//       // Skip completely empty rows
//       if (!col1 && !col0 && quantity === 0 && rate === 0) continue;

//       const itemName = (col1 || col0 || "Unnamed Item").substring(0, 200);

//       // Only add if it has valid data (quantity > 0 or rate > 0)
//       if (itemName && (quantity > 0 || rate > 0)) {
//         const finalAmount = amount || quantity * rate;
//         totalAmount += finalAmount;
//         rowCounter += 1;

//         items.push({
//           itemGroupId: `import-${importBatchId}-${rowCounter}`,
//           itemSerialNo: col0 || "",
//           itemName,
//           srNo: col0 || "",
//           description: itemName,
//           unit: unit || "nos",
//           quantity,
//           unitRateSupply: rate,
//           unitRateInstallation: 0,
//           amountSupply: finalAmount,
//           amountInstallation: 0,
//           amount: finalAmount,
//           section: currentSection,
//           subSection: "Main",
//         });
//         rateOnlyFlags.push(false);
//       }
//     }

//     if (items.length === 0) {
//       return NextResponse.json(
//         { success: false, message: "No items extracted from the BOQ sheet" },
//         { status: 400 }
//       );
//     }

//     // ─── Extract tax details from SUMMARY sheet ────────────────────────────
//     let taxVAT = 0;
//     let taxService = 0;

//     if (summarySheet) {
//       const summaryRows = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
//       for (const row of summaryRows) {
//         const col0 = row[0]?.toString().trim() || "";
//         const col5 = parseFloat(row[5]) || 0;
//         if (col0.includes("VAT")) {
//           taxVAT = col5;
//         }
//         if (col0.includes("Service Tax")) {
//           taxService = col5;
//         }
//       }
//     }

//     // ─── Auto-generate BOQ number ──────────────────────────────────────────
//     const count = await BOQ.countDocuments({ companyId: user.companyId });
//     const boqNumber = `BOQ-${String(count + 1).padStart(5, "0")}`;

//     // ─── Create BOQ ──────────────────────────────────────────────────────────
//     const boqData = {
//       companyId: user.companyId,
//       project: projectId,
//       boqNumber,
//       phase: phaseDetected,
//       date: new Date(),
//       status: "draft",
//       remarks: `Imported from Excel on ${new Date().toLocaleDateString()}. Phase: ${phaseDetected}`,
//       items,
//       taxVAT,
//       taxService,
//       createdBy: user.id,
//     };

//     const boq = new BOQ(boqData);
//     await boq.save();

//     // ─── Build section summary for response (pre‑save already updated totals) ──
//     const sectionSummary = {};
//     items
//       .filter((_, idx) => !rateOnlyFlags[idx])
//       .forEach((item) => {
//         if (item.section) {
//           sectionSummary[item.section] =
//             (sectionSummary[item.section] || 0) + (item.amount || 0);
//         }
//       });

//     // ─── Response ──────────────────────────────────────────────────────────
//     return NextResponse.json({
//       success: true,
//       message: `BOQ created with ${items.length} items (${items.length - rateOnlyFlags.filter(Boolean).length} quantity items) across ${Object.keys(sectionSummary).length} sections`,
//       data: {
//         boq,
//         sections: Object.keys(sectionSummary),
//         sectionSummary,
//         totalItems: items.length,
//         totalAmount,
//         grandTotal: boq.grandTotal,
//         phase: phaseDetected,
//         taxVAT,
//         taxService,
//       },
//     });
//   } catch (err) {
//     console.error("BOQ Import Error:", err);
//     // Handle duplicate boqNumber (rare in import but possible)
//     if (err.code === 11000) {
//       return NextResponse.json(
//         { success: false, message: "A BOQ with this number already exists. Please try again." },
//         { status: 409 }
//       );
//     }
//     return NextResponse.json(
//       { success: false, message: err.message || "Import failed" },
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

// ─── Helper to identify valid billable raw materials vs empty scope headers ───
function isBillableChildLine(desc) {
  const qty = Number(desc.quantity ?? desc.qty) || 0;
  const supplyRate = Number(desc.unitRateSupply) || 0;
  const installRate = Number(desc.unitRateInstallation) || 0;
  const isRateOnly = Boolean(desc.isRateOnly);

  // Billable if marked as Rate Only OR has quantity with valid rates
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
    // const isRateOnly =
    //   rawQtyStr.toUpperCase() === "RATE ONLY" ||
    //   rawAmountCol6.toUpperCase() === "RATE ONLY" ||
    //   (!hasQty && hasRates);

    // const quantity = isRateOnly ? 0 : number(rawQtyStr);

    // Only treat as Rate Only if the cell explicitly says "RATE ONLY"
    const isRateOnly =
      rawQtyStr.toUpperCase() === "RATE ONLY" ||
      rawAmountCol6.toUpperCase() === "RATE ONLY";

    // If quantity is missing but rates exist, default qty to 1
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
        continue; // Skip adding duplicate empty descriptions
      }

      currentParent = {
        itemSerialNo: srNo,
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

    // Handle multi-line specification notes that continue the previous row
    if (!srNo && description.startsWith("(") && !hasQty && !hasRates) {
      if (currentParent.descriptions.length > 0) {
        currentParent.descriptions[currentParent.descriptions.length - 1].description += `\n${description}`;
      }
      continue;
    }

    // ── OPTION 2: Skip empty scope/header lines (e.g. 1002, 1101) ──
    // If it has no billable quantity, no supply/install rates, and is not rate-only, ignore it
    if (!hasQty && !hasRates && !isRateOnly) {
      continue;
    }

    const child = {
      srNo,
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

      if ( !Array.isArray(mappedParents) || mappedParents.length === 0) {
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

      // ── Get the starting item-code number ONCE instead of once per item ──
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

      // ── Collect writes here instead of awaiting each one ──
      const newItemDocs = [];   // plain objects → Item.insertMany at the end
      const bulkUpdates = [];   // ops → Item.bulkWrite at the end

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
            // ── NEW raw material: build the object, don't save yet ──
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
            // ── EXISTING raw material: queue the update, don't await yet ──
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
            // keep the in-memory copy consistent for anything referencing it later in this same request
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

        // ── Parent product: same batching treatment ──
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
          itemName: cleanParentName,
          section: cleanCategory,
          sectionSpecification: parent.sectionSpecification || "",
          subSection: parent.subSection || "Main",
          subSectionIndex: parent.subSectionIndex || 1,
          descriptions: resolvedBOQDescriptions,
        });
      }

      // ── Fire the two bulk DB calls, once, instead of hundreds of small ones ──
      if (newItemDocs.length) await Item.insertMany(newItemDocs);
      if (bulkUpdates.length) await Item.bulkWrite(bulkUpdates);

      const count = await BOQ.countDocuments({ companyId: targetCompanyId });
      const boqNumber = `BOQ-${String(count + 1).padStart(5, "0")}`;

      const boq = new BOQ({
        companyId: targetCompanyId,
        // project: projectId,
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
    // const projectId = formData.get("projectId");

    if (!file)
    // !projectId) 
    {
      return NextResponse.json({ success: false, message: "File  required." }, { status: 400 });
    }

    // const buffer = await file.arrayBuffer();
    // const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    // const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    let sheet = null;

    // 1. Prefer a sheet explicitly named like "BOQ-PHASE..."
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toUpperCase().includes("BOQ")) {
        sheet = workbook.Sheets[sheetName];
        break;
      }
    }

    // 2. Fallback: scan every sheet for one containing "SR. NO." + "ITEM DESCRIPTION" headers
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

    // 3. Last resort: fall back to the first sheet (old behavior)
    if (!sheet) {
      sheet = workbook.Sheets[workbook.SheetNames[0]];
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });

    const headerRow = findHeaderRow(rows);
    const parents = parseExcelRows(rows, headerRow);

    console.log("🔍 Total raw rows in sheet:", rows.length);
    console.log("🔍 Parsed parents count:", parents.length);
    console.log("🔍 First few parent names:", parents.slice(0, 5).map(p => p.itemName));

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

    // const aiResults = [];
    // const CHUNK_SIZE = 15;
    // for (let i = 0; i < aiPayload.length; i += CHUNK_SIZE) {
    //   const chunk = aiPayload.slice(i, i + CHUNK_SIZE);
    //   try {
    //     const cleaned = await batchCorrectItemsWithClaude(
    //       targetCompanyId,
    //       chunk,
    //       allMasterItems.map((m) => m.itemName).filter(Boolean)
    //     );
    //     aiResults.push(...cleaned);
    //   } catch (err) {
    //     console.error("AI clean batch error:", err);
    //   }
    // }

    const aiResults = [];
    const CHUNK_SIZE = 15;
    const CONCURRENCY = 5; // how many chunks run at once — tune based on your rate limits

    // Split payload into chunks first
    const chunks = [];
    for (let i = 0; i < aiPayload.length; i += CHUNK_SIZE) {
      chunks.push(aiPayload.slice(i, i + CHUNK_SIZE));
    }

    // Process chunks in parallel batches of CONCURRENCY
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
          // that chunk's items just won't have AI suggestions — parsing still continues
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

      // ── MATCH CHILD LINES ONLY AGAINST RAW MATERIALS ──
      const analyzedDescriptions = (parent.descriptions || []).map((desc, dIdx) => {
        const isBillable = isBillableChildLine(desc);
        const childAiClean = aiMap.get(`desc-${pIdx}-${dIdx}`);
        const rawDesc = (desc.description || "").trim();
        const suggestedDesc = childAiClean?.correctedDescription?.trim() || rawDesc;
        const childHasAiChange =
          Boolean(childAiClean?.changesMade) ||
          suggestedDesc.toLowerCase() !== rawDesc.toLowerCase();

        if (childHasAiChange) totalAiSuggestionsCount++;

        // If it's an empty header row like 1002, do NOT try to match it to master Raw Materials
        if (!isBillable) {
          return {
            ...desc,
            id: `desc-${pIdx}-${dIdx}`,
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

      // ── MATCH PARENT ITEM ONLY AGAINST FINISHED GOODS / PRODUCTS ──
      const normParentSuggested = canonicalizeText(suggestedParentName);
      const normParentOriginal = canonicalizeText(rawParentName);

      let bestProduct = null;
      let highestProductScore = 0;

      for (const prod of masterProducts) {
        const prodName = canonicalizeText(prod.itemName);
        const score = Math.max(
          stringSimilarity.compareTwoStrings(normParentSuggested, prodName),
          stringSimilarity.compareTwoStrings(normParentOriginal, prodName)
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