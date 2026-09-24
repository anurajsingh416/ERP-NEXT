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
import Counter from "@/models/Counter";
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

// ─── Detect the new "Finished Good + Sub BOQ" workbook format ───
function isFinishedGoodHeaderRow(row) {
  const c2 = clean(row?.[2]).toLowerCase();
  return c2.includes("finished good") || c2.includes("package description");
}

function isSubBoqHeaderRow(row) {
  const c0 = clean(row?.[0]).toLowerCase();
  return c0.includes("parent") && c0.includes("link");
}

function isSectionHeaderRow(srNo, desc) {
  return /^\d+$/.test(clean(srNo)) && /^section\s/i.test(clean(desc));
}

// ─── Parse Sheet1 in the new Finished-Good format ───
function parseFinishedGoodSheet(rows) {
  const headerIdx = rows.findIndex(isFinishedGoodHeaderRow);
  if (headerIdx === -1) return null; // not this format

  const parents = [];
  let currentParent = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const srNo = clean(row[0]);
    const itemCode = clean(row[1]);
    const description = clean(row[2]);
    const qty = clean(row[3]);
    const unit = clean(row[4]) || "nos";
    const rateSupply = number(row[5]);
    const rateInstall = number(row[6]);

    if (!srNo && !description) continue;
    if (isTotalRow(srNo) || isTotalRow(description)) continue;

    if (isSectionHeaderRow(srNo, description)) {
      currentParent = {
        itemSerialNo: srNo,
        itemName: description.replace(/^section\s*\d+\s*-\s*/i, "").trim(),
        section: description,
        subSection: "Main",
        subSectionIndex: 1,
        sectionSpecification: "",
        descriptions: [],
      };
      parents.push(currentParent);
      continue;
    }

    if (!currentParent || !itemCode) continue;

    currentParent.descriptions.push({
      srNo,                 // e.g. "1000.1" — this IS the Sub BOQ Parent Link key
      itemCode,              // e.g. "FG-SUB-001"
      description,
      unit,
      quantity: number(qty) || 0,
      unitRateSupply: rateSupply,
      unitRateInstallation: rateInstall,
      isRateOnly: false,
    });
  }

  return parents.filter((p) => p.descriptions.length > 0);
}

// ─── Parse the Sub BOQ sheet into a flat, parent-linked row list ───
function parseSubBoqSheet(rows) {
  const headerIdx = rows.findIndex(isSubBoqHeaderRow);
  if (headerIdx === -1) return [];

  let subBoqRows = [];
  let fgSheetName = "";
  let subSheetName = "";
  let subSheetRows = null;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const parentLink = clean(row[0]);
    const componentCode = clean(row[1]);
    const classificationRaw = clean(row[2]);
    const description = clean(row[3]);
    const uom = clean(row[4]) || "nos";
    const qtyPerUnit = number(row[5]);
    const costRate = number(row[6]);
    const sourcingChannel = clean(row[7]);

    if (!parentLink || !componentCode) continue;

    subBoqRows.push({
      parentLink,
      componentCode,
      classification: classificationRaw.toLowerCase().includes("sub-assembly")
        ? "Sub-Assembly (FG)"
        : "Raw Material",
      description,
      uom,
      qtyPerUnit,
      costRate,
      sourcingChannel,
    });
  }
  return subBoqRows;
}

// Paste this block into the BOQ import route, below parseSubBoqSheet().
// It reuses helpers already in that file: clean, isTotalRow,
// isFinishedGoodHeaderRow, isSubBoqHeaderRow, isSectionHeaderRow.

// ─── Validate the Finished-Good sheet ↔ Sub BOQ sheet linkage ───
const STRICT_NUM = /^[-+]?\d+(\.\d+)?$/;
const numericOrBlank = (v) => {
  const s = clean(v).replace(/,/g, "");
  return s === "" || STRICT_NUM.test(s);
};
const toNum = (v) => parseFloat(clean(v).replace(/,/g, "")) || 0;

function validateFinishedGoodWorkbook({ fgRows, fgSheetName, subRows, subSheetName }) {
  const errors = [];
  const warnings = [];
  const addError = (sheet, rows, message) =>
    errors.push({ sheet, rows: [].concat(rows), message });
  const addWarning = (sheet, rows, message) =>
    warnings.push({ sheet, rows: [].concat(rows), message });

  // ── 1. Finished-Good sheet: build the set of valid Parent Item Link keys ──
  const fgKeys = new Map();      // Sr. No. -> excel row
  const fgItemCodes = new Map(); // Item Code -> excel row
  const fgHeaderIdx = fgRows.findIndex(isFinishedGoodHeaderRow);

  for (let i = fgHeaderIdx + 1; i < fgRows.length; i++) {
    const row = fgRows[i];
    if (!row) continue;
    const rowNo = i + 1;
    const srNo = clean(row[0]);
    const itemCode = clean(row[1]);
    const description = clean(row[2]);

    if (!srNo && !itemCode && !description) continue;
    if (isTotalRow(srNo) || isTotalRow(description)) continue;

    if (isSectionHeaderRow(srNo, description)) {
      if (clean(row[3])) {
        addWarning(fgSheetName, rowNo,
          `Section ${srNo} has extra text in the Qty column ("${clean(row[3])}"). The section title was probably split by a comma.`);
      }
      continue;
    }

    if (!srNo) {
      addError(fgSheetName, rowNo, `Item "${itemCode || description}" has no Sr. No. (it is needed as the Sub BOQ link).`);
      continue;
    }
    if (!itemCode) {
      addError(fgSheetName, rowNo, `Sr. No. ${srNo} has no Item Code.`);
    }

    if (fgKeys.has(srNo)) {
      addError(fgSheetName, rowNo, `Sr. No. ${srNo} is duplicated (already used on row ${fgKeys.get(srNo)}).`);
    } else {
      fgKeys.set(srNo, rowNo);
    }
    if (itemCode) {
      if (fgItemCodes.has(itemCode)) {
        addError(fgSheetName, rowNo, `Item Code ${itemCode} is duplicated (already used on row ${fgItemCodes.get(itemCode)}).`);
      } else {
        fgItemCodes.set(itemCode, rowNo);
      }
    }

    // Numeric sanity: catches shifted columns (e.g. a stray comma splitting the description)
    const problems = [];
    if (!numericOrBlank(row[3])) problems.push(`Qty "${clean(row[3])}" is not a number`);
    else if (toNum(row[3]) <= 0) problems.push("Qty is missing or zero");
    if (!numericOrBlank(row[5])) problems.push(`Unit Rate Supply "${clean(row[5])}" is not a number`);
    if (!numericOrBlank(row[6])) problems.push(`Unit Rate Install "${clean(row[6])}" is not a number`);
    if (problems.length) {
      addError(fgSheetName, rowNo,
        `Sr. No. ${srNo}${itemCode ? ` (${itemCode})` : ""}: ${problems.join("; ")}. Check this row for a stray comma or shifted cells.`);
    }
  }

  // ── 2. Sub BOQ sheet ──
  const subHeaderIdx = subRows.findIndex(isSubBoqHeaderRow);
  const subLines = [];
  const componentCodes = new Map(); // Component Code -> excel row

  for (let i = subHeaderIdx + 1; i < subRows.length; i++) {
    const row = subRows[i];
    if (!row) continue;
    const rowNo = i + 1;
    const parentLink = clean(row[0]);
    const componentCode = clean(row[1]);
    const description = clean(row[3]);
    if (!parentLink && !componentCode && !description) continue;

    if (!parentLink) {
      addError(subSheetName, rowNo, `Parent Item Link is blank for component "${componentCode || description}".`);
      continue;
    }
    if (!componentCode) {
      addError(subSheetName, rowNo, `Component Code is blank (parent ${parentLink}).`);
      continue;
    }

    if (componentCodes.has(componentCode)) {
      addError(subSheetName, rowNo, `Component Code ${componentCode} is duplicated (already used on row ${componentCodes.get(componentCode)}).`);
    } else {
      componentCodes.set(componentCode, rowNo);
    }

    const problems = [];
    if (!numericOrBlank(row[5]) || toNum(row[5]) <= 0) problems.push(`Qty per Unit "${clean(row[5])}" must be a number greater than 0`);
    if (!numericOrBlank(row[6])) problems.push(`Cost Rate "${clean(row[6])}" is not a number`);
    if (problems.length) addError(subSheetName, rowNo, `${componentCode}: ${problems.join("; ")}.`);

    subLines.push({
      rowNo,
      parentLink,
      componentCode,
      isAssembly: clean(row[2]).toLowerCase().includes("sub-assembly"),
    });
  }

  // ── 3. The main check: every Parent Item Link must exist in the Finished-Good sheet
  //       (or be a Sub-Assembly defined in the Sub BOQ sheet itself) ──
  const assemblyCodes = new Set(subLines.filter((l) => l.isAssembly).map((l) => l.componentCode));

  const missingParents = new Map(); // parentLink -> [excel rows]
  for (const line of subLines) {
    if (!fgKeys.has(line.parentLink) && !assemblyCodes.has(line.parentLink)) {
      if (!missingParents.has(line.parentLink)) missingParents.set(line.parentLink, []);
      missingParents.get(line.parentLink).push(line.rowNo);
    }
  }
  for (const [link, rows] of missingParents) {
    addError(
      subSheetName,
      rows,
      `Parent item "${link}" is missing in ${fgSheetName}. ${rows.length} Sub BOQ component${rows.length > 1 ? "s" : ""} in ${subSheetName} reference it. Add this item to ${fgSheetName} or correct the Parent Item Link.`
    );
  }

  // ── 4. Sub-Assemblies that can't be traced back to any Finished-Good line ──
  const reachable = new Set(fgKeys.keys());
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of subLines) {
      if (l.isAssembly && reachable.has(l.parentLink) && !reachable.has(l.componentCode)) {
        reachable.add(l.componentCode);
        grew = true;
      }
    }
  }
  for (const l of subLines) {
    if (assemblyCodes.has(l.parentLink) && !fgKeys.has(l.parentLink) && !reachable.has(l.parentLink)) {
      addError(subSheetName, l.rowNo,
        `${l.componentCode} sits under Sub-Assembly "${l.parentLink}", which is not linked to any item in ${fgSheetName}.`);
    }
  }

  // ── 5. Warnings (non-blocking) ──
  const parentsWithChildren = new Set(subLines.map((l) => l.parentLink));
  for (const l of subLines) {
    if (l.isAssembly && reachable.has(l.componentCode) && !parentsWithChildren.has(l.componentCode)) {
      addWarning(subSheetName, l.rowNo, `Sub-Assembly ${l.componentCode} has no components listed under it.`);
    }
  }

  return { errors, warnings };
}

// ─── Recursively collect EVERY descendant of a Sheet1 finished-good line ───
// (its direct children, plus children of any Sub-Assembly child, etc.)
function collectSubBoqTreeForItem(rootCode, subBoqRows) {
  const result = [];
  const queue = [rootCode];
  const visited = new Set();

  while (queue.length) {
    const parentCode = queue.shift();
    if (visited.has(parentCode)) continue;
    visited.add(parentCode);

    const children = subBoqRows.filter((r) => r.parentLink === parentCode);
    for (const child of children) {
      result.push(child);
      if (child.classification === "Sub-Assembly (FG)") {
        queue.push(child.componentCode);
      }
    }
  }
  return result;
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

// Makes sure the counter for this company is at least as high as the
// highest existing ITEM-XXXXX code already in the DB. Only does real work
// the first time it's called for a company — after that, the counter
// document exists and this is a single cheap indexed lookup.
async function ensureItemCounterSeeded(companyId) {
  const existing = await Counter.findOne({ companyId, id: "ItemCode" }).lean();
  if (existing) return; // already seeded — nothing to do

  const items = await Item.find({
    companyId,
    itemCode: { $regex: /^ITEM-\d+$/ },
  })
    .select("itemCode")
    .lean();

  let maxNum = 0;
  for (const it of items) {
    const n = parseInt(it.itemCode.replace("ITEM-", ""), 10) || 0;
    if (n > maxNum) maxNum = n;
  }

  await Counter.updateOne(
    { companyId, id: "ItemCode" },
    { $max: { seq: maxNum } },
    { upsert: true }
  );
}

async function reserveItemCodes(companyId, count) {
  if (count <= 0) return [];
  await ensureItemCounterSeeded(companyId);

  const updated = await Counter.findOneAndUpdate(
    { companyId, id: "ItemCode" },
    { $inc: { seq: count } },
    { upsert: true, new: true }
  );
  const endNum = updated.seq;
  const startNum = endNum - count + 1;
  const codes = [];
  for (let n = startNum; n <= endNum; n++) {
    codes.push(`ITEM-${String(n).padStart(5, "0")}`);
  }
  return codes;
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
      const assemblyMap = new Map();

      for (const it of existingItems) {
        const key = canonicalizeText(it.itemName);
        if (it.itemType === "Raw Material") {
          rawMaterialMap.set(key, it);
        } else if (it.itemType === "Assembly") {
          assemblyMap.set(key, it);
        } else {
          productMap.set(key, it);
        }
      }

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

          // ── Resolve this line's Sub BOQ components (sub-assemblies + raw
          // materials pulled from the Sub BOQ sheet) into the flat
          // materials[] shape the BOQ schema expects ──
          const resolvedMaterials = [];
          for (const node of desc.subBoqComponents || []) {
            const normKey = canonicalizeText(node.description);
            const targetMap = node.classification === "Sub-Assembly (FG)" ? assemblyMap : rawMaterialMap;

            let matDoc = node.selectedMasterId
              ? existingItems.find((m) => String(m._id) === String(node.selectedMasterId))
              : targetMap.get(normKey);

            if (!matDoc) {
              matDoc = {
                _id: new mongoose.Types.ObjectId(),
                companyId: targetCompanyId,
                createdBy: user.id,
                itemCode: null,
                itemName: node.description,
                description: node.description,
                itemType: node.classification === "Sub-Assembly (FG)" ? "Assembly" : "Raw Material",
                unit: node.uom,
                uom: node.uom,
                unitPrice: node.costRate,
                status: "active",
                active: true,
              };
              newItemDocs.push(matDoc);
              targetMap.set(normKey, matDoc);
            }

            resolvedMaterials.push({
              rawMaterialId: matDoc._id,
              rawMaterialName: matDoc.itemName,
              quantityPerUnit: node.qtyPerUnit,
              uom: node.uom,
              unitRate: node.costRate,
              componentCode: node.componentCode,
              parentLink: node.parentLink,
              classification: node.classification,
              sourcingChannel: node.sourcingChannel,
            });
          }

          if (!isBillable) {
            resolvedBOQDescriptions.push({
              itemId: null,
              srNo: desc.srNo || "",
              description: descText,
              unit: desc.unit || "nos",
              quantity: 0,
              unitRateSupply: 0,
              unitRateInstallation: 0,
              amountSupply: 0,
              amountInstallation: 0,
              totalAmount: 0,
              amount: 0,
              isRateOnly: false,
              isHeader: true,
              materials: resolvedMaterials, // in case a header line still has Sub BOQ components attached
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
              itemCode: null,
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
            materials: resolvedMaterials,
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
            itemCode: null,
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

      if (newItemDocs.length) {
        const codes = await reserveItemCodes(targetCompanyId, newItemDocs.length);
        newItemDocs.forEach((doc, i) => {
          doc.itemCode = codes[i];
        });
        await Item.insertMany(newItemDocs);
      }
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
      return NextResponse.json({ success: false, message: "File  required." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const allSheetRows = {};
    for (const name of workbook.SheetNames) {
      allSheetRows[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1,
        defval: "",
        raw: true,
      });
    }

    let sheet = null;
    let sheetRows = null;
    let isNewFormat = false;
    let subBoqRows = [];
    let fgSheetName = "";
    let subSheetName = "";
    let subSheetRows = null;
    // 1. Prefer a sheet explicitly named "BOQ..."
    for (const name of workbook.SheetNames) {
      if (name.toUpperCase().includes("BOQ")) {
        sheet = workbook.Sheets[name];
        sheetRows = allSheetRows[name];
        break;
      }
    }

    // 2. Scan for old-format headers ("SR. NO." / "ITEM DESCRIPTION")
    if (!sheet) {
      for (const name of workbook.SheetNames) {
        const rows = allSheetRows[name];
        const found = rows.slice(0, 30).some(
          (row) =>
            clean(row?.[0]).toUpperCase() === "SR. NO." &&
            clean(row?.[1]).toUpperCase() === "ITEM DESCRIPTION"
        );
        if (found) {
          sheet = workbook.Sheets[name];
          sheetRows = rows;
          break;
        }
      }
    }

    // 3. Scan for the new Finished-Good format
    if (!sheet) {
      for (const name of workbook.SheetNames) {
        const rows = allSheetRows[name];
        if (rows.slice(0, 10).some(isFinishedGoodHeaderRow)) {
          sheet = workbook.Sheets[name];
          sheetRows = rows;
          isNewFormat = true;
          fgSheetName = name;
          break;
        }
      }
    }

    // 4. Last resort: first sheet
    if (!sheet) {
      sheet = workbook.Sheets[workbook.SheetNames[0]];
      sheetRows = allSheetRows[workbook.SheetNames[0]];
    }

    const rows = sheetRows;

    // If new format, look for a Sub BOQ sheet among the OTHER sheets
    if (isNewFormat) {
      for (const name of workbook.SheetNames) {
        const candidateRows = allSheetRows[name];
        if (candidateRows.slice(0, 10).some(isSubBoqHeaderRow)) {
          subBoqRows = parseSubBoqSheet(candidateRows);
          subSheetName = name;
          subSheetRows = candidateRows;
          break;
        }
      }
    }

    const headerRow = isNewFormat ? rows.findIndex(isFinishedGoodHeaderRow) : findHeaderRow(rows);
    const parents = isNewFormat ? parseFinishedGoodSheet(rows) : parseExcelRows(rows, headerRow);

    let importErrors = [];
    let importWarnings = [];
    if (isNewFormat && subSheetRows) {
      const result = validateFinishedGoodWorkbook({
        fgRows: rows,
        fgSheetName,
        subRows: subSheetRows,
        subSheetName,
      });
      importErrors = result.errors;
      importWarnings = result.warnings;
    }

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

        // ── Match this line's Sub BOQ components (sub-assemblies / raw
        // materials from the Sub BOQ sheet) against the Item Master ──
        const matchedSubBoqComponents = (desc.subBoqComponents || []).map((node) => {
          const normNode = canonicalizeText(node.description);
          const pool = node.classification === "Sub-Assembly (FG)"
            ? allMasterItems.filter((i) => i.itemType === "Assembly")
            : masterRawMaterials;

          let best = null;
          let highest = 0;
          for (const candidate of pool) {
            const score = stringSimilarity.compareTwoStrings(normNode, canonicalizeText(candidate.itemName));
            if (score > highest) { highest = score; best = candidate; }
          }
          const matchPercent = Math.round(highest * 100);
          const isMatched = matchPercent >= 85 && best !== null;

          return {
            ...node,
            matchedMasterItem: isMatched ? best : null,
            matchScore: isMatched ? matchPercent : 0,
            action: isMatched ? "merge" : "create_new",
            selectedMasterId: isMatched ? best._id : null,
          };
        });

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
            subBoqComponents: matchedSubBoqComponents,
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
          subBoqComponents: matchedSubBoqComponents,
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
        validationErrors: importErrors,
        warnings: importWarnings,
      },
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}