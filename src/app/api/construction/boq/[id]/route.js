import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BOQ from "@/models/contruction/BOQ";
import Project from "@/models/project/ProjectModel";
import Supplier from "@/models/SupplierModels";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

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
    // ✅ Await params (Next.js 15)
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

// // ─── PUT: Update BOQ ──────────────────────────────────────────────────────
// export async function PUT(req, { params }) {
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
//         // Since contractor is optional, we log a warning and continue (set to null)
//         console.warn(`⚠️ Contractor ${body.contractor} not found – will be set to null`);
//         body.contractor = null;
//       }
//     }

//     // ── Load the existing BOQ ──
//     const boq = await BOQ.findOne({ _id: id, companyId: user.companyId });
//     if (!boq) {
//       return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//     }

//     // ── Update whitelisted fields (excluding 'items') ──
//     for (const field of UPDATABLE_FIELDS) {
//       if (field === "items") continue;
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

//       // ✅ Validate each item has a non‑empty itemName
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

//       // ✅ Map items – preserve `_id` for existing items only
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
//         // ✅ Only include `_id` if it exists and is valid
//         if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
//           mapped._id = item._id;
//         }
//         return mapped;
//       });
//     }

//     // ── Bump version ──
//     boq.version = (boq.version || 1) + 1;

//     // ── Save – triggers pre‑save hook ──
//     await boq.save();

//     await boq.populate([
//       { path: "project", select: "name" },
//       { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
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
    console.log("📥 Received PUT payload for BOQ:", JSON.stringify(body, null, 2));

    // ── Validate project if being changed ──
    if (body.project) {
      const projectDoc = await Project.findOne({ _id: body.project, company: user.companyId });
      if (!projectDoc) {
        return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
      }
    }

    // ── Validate contractor if being changed ──
    if (body.contractor) {
      const contractorDoc = await Supplier.findOne({ _id: body.contractor, companyId: user.companyId });
      if (!contractorDoc) {
        console.warn(`⚠️ Contractor ${body.contractor} not found – will be set to null`);
        body.contractor = null;
      }
    }
    // ── Validate customer if being changed ──
    if (body.customer) {
      const customerDoc = await Customer.findOne({ _id: body.customer, companyId: user.companyId });
      if (!customerDoc) {
        console.warn(`⚠️ Customer ${body.customer} not found – will be set to null`);
        body.customer = null;
      }
    }


    // ── Load the existing BOQ ──
    const boq = await BOQ.findOne({ _id: id, companyId: user.companyId });
    if (!boq) {
      return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    }

    // ── Update whitelisted fields (excluding 'items' and 'materials') ──
    for (const field of UPDATABLE_FIELDS) {
      if (field === "items" || field === "materials") continue;
      if (body[field] !== undefined) {
        if (typeof body[field] === "string") {
          boq[field] = body[field].trim();
        } else {
          boq[field] = body[field];
        }
      }
    }

    // ── Handle items with validation ──
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { success: false, message: "BOQ must contain at least one item" },
          { status: 400 }
        );
      }

      const invalidItems = body.items.filter(
        (item) => !item.itemName || item.itemName.trim() === ""
      );
      if (invalidItems.length > 0) {
        const indices = body.items
          .map((item, idx) => (!item.itemName || item.itemName.trim() === "") ? idx : null)
          .filter(i => i !== null);
        return NextResponse.json(
          {
            success: false,
            message: `Items at indices ${indices.join(", ")} are missing a name.`,
          },
          { status: 400 }
        );
      }

      boq.items = body.items.map((item) => {
        const mapped = {
          itemId: item.itemId || null,
          itemName: (item.itemName || "").trim(),
          description: (item.description || "").trim(),
          unit: (item.unit || "nos").trim(),
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          amount: parseFloat(item.amount) || 0,
          section: (item.section || "Other Work").trim(),
          subSection: (item.subSection || "Main").trim(),
          subSectionIndex: parseInt(item.subSectionIndex) || 1,
          isRateOnly: !!item.isRateOnly,
          consumedQty: item.consumedQty || 0,
          consumedAmount: item.consumedAmount || 0,
        };
        if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
          mapped._id = item._id;
        }
        return mapped;
      });
    }

    // ── NEW: Handle materials ──
    if (body.materials !== undefined) {
      if (!Array.isArray(body.materials)) {
        return NextResponse.json(
          { success: false, message: "materials must be an array" },
          { status: 400 }
        );
      }

      // Optional: Validate each material has a name (or skip – schema allows empty)
      // We'll ensure itemName is trimmed, but we won't reject empty ones.
      boq.materials = body.materials.map((mat) => {
        // Preserve existing _id if present and valid
        let newMat = {
          itemId: mat.itemId || null,
          itemName: (mat.itemName || "").trim(),
          quantity: parseFloat(mat.quantity) || 0,
          unit: (mat.unit || "nos").trim(),
          rate: parseFloat(mat.rate) || 0,
          amount: parseFloat(mat.amount) || 0,
          section: (mat.section || "Other Work").trim(),
          subSection: (mat.subSection || "Main").trim(),
          subSectionIndex: parseInt(mat.subSectionIndex) || 1,
          isRateOnly: !!mat.isRateOnly,
          consumedQty: mat.consumedQty || 0,
          consumedAmount: mat.consumedAmount || 0,
          type: mat.type || "material",
        };
        if (mat._id && mongoose.Types.ObjectId.isValid(mat._id)) {
          newMat._id = mat._id;
        }
        return newMat;
      });
    }

    // ── Bump version ──
    boq.version = (boq.version || 1) + 1;

    // ── Save – triggers pre‑save hook ──
    await boq.save();

    await boq.populate([
      { path: "project", select: "name" },
      { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
      { path: "customer", select: "customerName contactPersonName mobileNumber" },
    ]);

    return NextResponse.json({ success: true, data: boq });
  } catch (err) {
    console.error("❌ PUT /boq/:id error (full stack):", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return NextResponse.json(
        { success: false, message: `Validation error: ${messages.join(", ")}` },
        { status: 400 }
      );
    }
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A BOQ with this number already exists for your company." },
        { status: 409 }
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
    // ✅ Await params
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
