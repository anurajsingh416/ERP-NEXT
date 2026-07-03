import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import * as XLSX from "xlsx";

// ─── Auth Helper Functions ────────────────────────────────────────────────
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

// ─── Helper: Check if a row is a Section Header ──────────────────────────
function isSectionHeader(text) {
  if (!text) return false;
  const trimmed = text.toString().trim().toUpperCase();
  // Pattern: "1. PLASTERING WORK" or "2. FLOORING & CLADDING WORK"
  if (/^[\d]+\.\s+[A-Z]/.test(trimmed)) return true;
  // Check for common section keywords
  const sectionKeywords = [
    "PLASTERING",
    "FLOORING",
    "CLADDING",
    "CEILING",
    "PANELLING",
    "JOINERY",
    "PAINTING",
    "MISCELLANEOUS",
  ];
  return sectionKeywords.some((kw) => trimmed.includes(kw) && trimmed.includes("WORK"));
}

function extractSectionName(text) {
  if (!text) return "Other Work";
  const trimmed = text.toString().trim();
  // Remove number prefix like "1. "
  return trimmed.replace(/^[\d]+\.\s*/, "").trim();
}

// ─── Helper: Check if row is preamble (a), b), c) etc.) ──────────────────
function isPreambleRow(text) {
  if (!text) return false;
  const trimmed = text.toString().trim();
  return /^[a-z]\)/.test(trimmed) || trimmed.startsWith("a)") || trimmed.startsWith("b)") || trimmed.startsWith("c)");
}

// ─── Helper: Check if row is "Rate Only" ──────────────────────────────────
function isRateOnly(text) {
  if (!text) return false;
  const trimmed = text.toString().trim().toUpperCase();
  return trimmed === "RATE ONLY";
}

// ─── Helper: Check if row is "TOTAL" ──────────────────────────────────────
function isTotalRow(text) {
  if (!text) return false;
  const trimmed = text.toString().trim().toUpperCase();
  return trimmed === "TOTAL" || trimmed === "SUB TOTAL" || trimmed === "TOTAL OF" || trimmed.includes("TOTAL");
}

// ─── POST: Import BOQ from Excel ──────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const projectId = formData.get("projectId");

    if (!file || !projectId) {
      return NextResponse.json(
        { success: false, message: "File and projectId required" },
        { status: 400 }
      );
    }

    // Validate project belongs to user's company
    const project = await Project.findOne({ _id: projectId, company: user.companyId });
    if (!project) {
      return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
    }

    // ─── Parse Excel ──────────────────────────────────────────────────────
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Find sheets
    let boqSheet = null;
    let summarySheet = null;
    let phaseDetected = "I";

    for (const sheetName of workbook.SheetNames) {
      const upperName = sheetName.toUpperCase();
      if (upperName.includes("BOQ-PHASE")) {
        boqSheet = workbook.Sheets[sheetName];
        if (upperName.includes("II")) phaseDetected = "II";
        break;
      }
      if (upperName.includes("SUMMARY")) {
        summarySheet = workbook.Sheets[sheetName];
      }
    }

    // If no BOQ sheet found, find any sheet with "SR. NO." in first column
    if (!boqSheet) {
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          if (rows[i] && rows[i][0] && rows[i][0]?.toString().trim().toUpperCase() === "SR. NO.") {
            boqSheet = sheet;
            if (sheetName.toUpperCase().includes("II")) phaseDetected = "II";
            break;
          }
        }
        if (boqSheet) break;
      }
    }

    if (!boqSheet) {
      return NextResponse.json(
        { success: false, message: "No BOQ sheet found in the file" },
        { status: 400 }
      );
    }

    const rows = XLSX.utils.sheet_to_json(boqSheet, { header: 1 });

    // ─── Find start row (look for "SR. NO.") ──────────────────────────────
    let startRow = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] && rows[i][0].toString().trim().toUpperCase() === "SR. NO.") {
        startRow = i + 1;
        break;
      }
    }

    if (startRow === -1) {
      return NextResponse.json(
        { success: false, message: "Could not find item rows in the sheet" },
        { status: 400 }
      );
    }

    // ─── Parse items with section detection ──────────────────────────────
    const items = [];
    let currentSection = "Other Work";
    let totalAmount = 0;

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const col0 = row[0]?.toString().trim() || "";
      const col1 = row[1]?.toString().trim() || "";
      const unit = row[2]?.toString().trim() || "";
      const rateStr = row[3]?.toString().trim() || "";
      const qtyStr = row[4]?.toString().trim() || "";
      const amountStr = row[5]?.toString().trim() || "";

      // ── Skip preamble rows (a), b), c) etc.) ────────────────────────
      if (isPreambleRow(col0) || isPreambleRow(col1)) {
        continue;
      }

      // ── Check if this is a section header ──────────────────────────────
      if (isSectionHeader(col0) && !col1) {
        currentSection = extractSectionName(col0);
        continue;
      }
      if (isSectionHeader(col1) && !col0) {
        currentSection = extractSectionName(col1);
        continue;
      }

      // ── Skip TOTAL rows ────────────────────────────────────────────────
      if (isTotalRow(col0) || isTotalRow(col1)) {
        continue;
      }

      // ── Skip "Rate Only" items ────────────────────────────────────────
      const isRateOnlyItem = isRateOnly(qtyStr) || isRateOnly(amountStr);
      if (isRateOnlyItem) {
        // Still add as a reference item with quantity 0
        const itemName = col1 || col0 || "Unnamed Item";
        items.push({
          itemId: null,
          itemName: itemName.substring(0, 200),
          description: itemName,
          unit: unit || "nos",
          quantity: 0,
          rate: parseFloat(rateStr) || 0,
          amount: 0,
          section: currentSection,
          isRateOnly: true,
        });
        continue;
      }

      // ── Parse actual item ──────────────────────────────────────────────
      const quantity = parseFloat(qtyStr) || 0;
      const rate = parseFloat(rateStr) || 0;
      const amount = parseFloat(amountStr) || 0;

      // Skip completely empty rows
      if (!col1 && !col0 && quantity === 0 && rate === 0) continue;

      const itemName = col1 || col0 || "Unnamed Item";

      // Only add if it has valid data (quantity > 0 or rate > 0)
      if (itemName && (quantity > 0 || rate > 0)) {
        const finalAmount = amount || quantity * rate;
        totalAmount += finalAmount;

        items.push({
          itemId: null,
          itemName: itemName.substring(0, 200),
          description: itemName,
          unit: unit || "nos",
          quantity: quantity || 0,
          rate: rate || 0,
          amount: finalAmount,
          section: currentSection,
          isRateOnly: false,
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "No items extracted from the BOQ sheet" },
        { status: 400 }
      );
    }

    // ─── Extract tax details from SUMMARY sheet ────────────────────────────
    let taxVAT = 0;
    let taxService = 0;

    if (summarySheet) {
      const summaryRows = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
      for (const row of summaryRows) {
        const col0 = row[0]?.toString().trim() || "";
        const col5 = parseFloat(row[5]) || 0;
        if (col0.includes("VAT")) {
          taxVAT = col5;
        }
        if (col0.includes("Service Tax")) {
          taxService = col5;
        }
      }
    }

    // ─── Auto-generate BOQ number ──────────────────────────────────────────
    const count = await BOQ.countDocuments({ companyId: user.companyId });
    const boqNumber = `BOQ-${String(count + 1).padStart(5, "0")}`;

    // ─── Create BOQ ──────────────────────────────────────────────────────────
    const boqData = {
      companyId: user.companyId,
      project: projectId,
      boqNumber,
      phase: phaseDetected,
      date: new Date(),
      status: "draft",
      remarks: `Imported from Excel on ${new Date().toLocaleDateString()}. Phase: ${phaseDetected}`,
      items: items,
      taxVAT: taxVAT,
      taxService: taxService,
      createdBy: user.id,
    };

    const boq = new BOQ(boqData);
    await boq.save();

    // ─── Build section summary for response (pre‑save already updated totals) ──
    const sectionSummary = {};
    items
      .filter((item) => !item.isRateOnly)
      .forEach((item) => {
        if (item.section) {
          sectionSummary[item.section] =
            (sectionSummary[item.section] || 0) + (item.amount || 0);
        }
      });

    // ─── Response ──────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: `BOQ created with ${items.length} items (${items.filter(i => !i.isRateOnly).length} quantity items) across ${Object.keys(sectionSummary).length} sections`,
      data: {
        boq: boq,
        sections: Object.keys(sectionSummary),
        sectionSummary: sectionSummary,
        totalItems: items.length,
        totalAmount: totalAmount,
        grandTotal: boq.grandTotal,
        phase: phaseDetected,
        taxVAT: taxVAT,
        taxService: taxService,
      },
    });
  } catch (err) {
    console.error("BOQ Import Error:", err);
    // Handle duplicate boqNumber (rare in import but possible)
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A BOQ with this number already exists. Please try again." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Import failed" },
      { status: 500 }
    );
  }
}
