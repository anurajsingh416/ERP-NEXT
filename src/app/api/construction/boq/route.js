// import mongoose from "mongoose";
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import BOQ from "@/models/contruction/BOQ";
// import Project from "@/models/project/ProjectModel";
// import Supplier from "@/models/SupplierModels";
// import Customer from "@/models/CustomerModel";
// import CompanyUser from "@/models/CompanyUser";
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

// // ─── GET: List BOQs ──────────────────────────────────────────────────────
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     const projectId = searchParams.get("projectId");
//     const statusFilter = searchParams.get("status");
//     const phase = searchParams.get("phase");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

//     // Single BOQ by ID
//     if (id) {
//       if (!mongoose.Types.ObjectId.isValid(id)) {
//         return NextResponse.json({ success: false, message: "Invalid BOQ ID format" }, { status: 400 });
//       }
//       const boq = await BOQ.findOne({ _id: id, companyId: user.companyId })
//         .populate("project", "name")
//         .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
//         .populate("customer", "customerName contactPersonName mobileNumber")
//         .populate("createdBy", "name")
//         .lean();
//       if (!boq) {
//         return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//       }
//       return NextResponse.json({ success: true, data: boq });
//     }

//     // List with filters
//     const query = { companyId: user.companyId };
//     if (projectId) query.project = projectId;
//     if (statusFilter && statusFilter !== "all") query.status = statusFilter;
//     if (phase && phase !== "all") query.phase = phase;

//     const skip = (page - 1) * limit;
//     const [boqs, total] = await Promise.all([
//       BOQ.find(query)
//         .populate("project", "name")
//         .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       BOQ.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: boqs,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error("GET /boq error:", err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// // ─── POST: Create BOQ ──────────────────────────────────────────────────
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const body = await req.json();
//     console.log("📥 Received POST payload:", JSON.stringify(body, null, 2));

//     const {
//       project,
//       contractor,
//       customer,
//       boqNumber,
//       phase,
//       date,
//       status: boqStatus,
//       remarks,
//       items,
//       taxVAT,
//       taxService,
//     } = body;

//     // ── 1. Validate required fields ──
//     if (!project) {
//       console.log("❌ Project missing");
//       return NextResponse.json({ success: false, message: "Project is required" }, { status: 400 });
//     }
//     if (!boqNumber || !boqNumber.trim()) {
//       console.log("❌ BOQ Number missing");
//       return NextResponse.json({ success: false, message: "BOQ Number is required" }, { status: 400 });
//     }
//     if (!items || items.length === 0) {
//       console.log("❌ Items array empty");
//       return NextResponse.json({ success: false, message: "At least one item is required" }, { status: 400 });
//     }
//     console.log("✅ Required fields ok");

//     // ── 2. Project validation ──
//     console.log(`🔍 Checking project: ${project} for company: ${user.companyId}`);
//     const projectDoc = await Project.findOne({ _id: project, company: user.companyId });
//     if (!projectDoc) {
//       console.log(`❌ Project ${project} not found or not in company ${user.companyId}`);
//       return NextResponse.json(
//         { success: false, message: "Invalid project – it does not belong to your company." },
//         { status: 400 }
//       );
//     }
//     console.log(`✅ Project found: ${projectDoc.name}`);

//     // ── 3. Contractor validation (optional) ──
//     let contractorId = null;
//     if (contractor) {
//       console.log(`🔍 Checking contractor: ${contractor}`);
//       const contractorDoc = await Supplier.findOne({ _id: contractor, companyId: user.companyId });
//       if (!contractorDoc) {
//         console.warn(`⚠️ Contractor ${contractor} not found or not in company – will be set to null`);
//         // We'll set contractor to null instead of failing
//         contractorId = null;
//       } else {
//         contractorId = contractor;
//         console.log(`✅ Contractor found: ${contractorDoc.supplierName}`);
//       }
//     }
//     let customerId = null;
//     if (body.customer) {
//       console.log(`🔍 Checking customer: ${body.customer}`);
//       const customerDoc = await Customer.findOne({ _id: body.customer, companyId: user.companyId });
//       if (!customerDoc) {
//         console.warn(`⚠️ Customer ${body.customer} not found or not in company – will be set to null`);
//         // We'll set customer to null instead of failing
//         customerId = null;
//       } else {
//         customerId = body.customer;
//         console.log(`✅ Customer found: ${customerDoc.customerName}`);
//       }
//     }

//     // ── 4. Prepare items ──
//     console.log(`🔍 Preparing ${items.length} items...`);
//     const preparedItems = items.map((item) => ({
//       itemId: item.itemId || null,
//       itemName: (item.itemName || "").trim(),
//       description: (item.description || "").trim(),
//       unit: (item.unit || "nos").trim(),
//       quantity: parseFloat(item.quantity) || 0,
//       rate: parseFloat(item.rate) || 0,
//       amount: parseFloat(item.amount) || 0,
//       section: (item.section || "Other Work").trim(),
//       subSection: (item.subSection || "Main").trim(),
//       subSectionIndex: parseInt(item.subSectionIndex) || 1,
//       isRateOnly: !!item.isRateOnly,
//     }));
//     console.log(`✅ Items prepared`);

//     // ── 5. Build BOQ document ──
//     const boqData = {
//       companyId: user.companyId,
//       project,
//       contractor: contractorId,
//       customer: customerId,
//       boqNumber: boqNumber.trim(),
//       phase: phase || "I",
//       date: date ? new Date(date) : new Date(),
//       status: boqStatus || "draft",
//       remarks: remarks?.trim() || "",
//       items: preparedItems,
//       taxVAT: parseFloat(taxVAT) || 0,
//       taxService: parseFloat(taxService) || 0,
//       createdBy: user.id,
//     };

//     console.log("🔍 Saving BOQ...");
//     const boq = new BOQ(boqData);
//     await boq.save();
//     console.log("✅ BOQ saved");

//     await boq.populate([
//       { path: "project", select: "name" },
//       { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
//       { path: "customer", select: "customerName contactPersonName mobileNumber" },
//     ]);

//     return NextResponse.json({ success: true, data: boq }, { status: 201 });
//   } catch (err) {
//     console.error("❌ POST /boq error:", err);
//     if (err.name === "ValidationError") {
//       const messages = Object.values(err.errors).map(e => e.message);
//       console.error("ValidationError messages:", messages);
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
//       { success: false, message: err.message || "Failed to create BOQ" },
//       { status: 500 }
//     );
//   }
// }

// // ─── PUT: Update BOQ (via body id – keep for fallback) ──────────────
// export async function PUT(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const body = await req.json();
//     const { id, ...updateData } = body;

//     if (!id) {
//       return NextResponse.json({ success: false, message: "BOQ ID is required" }, { status: 400 });
//     }
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ success: false, message: "Invalid BOQ ID format" }, { status: 400 });
//     }

//     // Load existing
//     const boq = await BOQ.findOne({ _id: id, companyId: user.companyId });
//     if (!boq) {
//       return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//     }

//     // Validate project/contractor if changed (same as dynamic PUT)
//     if (updateData.project) {
//       const projectDoc = await Project.findOne({ _id: updateData.project, company: user.companyId });
//       if (!projectDoc) {
//         return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
//       }
//     }
//     if (updateData.contractor) {
//       const contractorDoc = await Supplier.findOne({ _id: updateData.contractor, companyId: user.companyId });
//       if (!contractorDoc) {
//         return NextResponse.json({ success: false, message: "Invalid contractor" }, { status: 400 });
//       }
//     }
//     if (updateData.customer) {
//       const customerDoc = await Customer.findOne({ _id: updateData.customer, companyId: user.companyId });
//       if (!customerDoc) {
//         return NextResponse.json({ success: false, message: "Invalid customer" }, { status: 400 });
//       }
//     } 

//     // Update fields
//     const fieldsToUpdate = {
//       project: updateData.project,
//       contractor: updateData.contractor || null,
//       customer: updateData.customer || null,
//       boqNumber: updateData.boqNumber?.trim(),
//       phase: updateData.phase,
//       date: updateData.date ? new Date(updateData.date) : undefined,
//       status: updateData.status,
//       remarks: updateData.remarks?.trim() || "",
//       taxVAT: parseFloat(updateData.taxVAT) || 0,
//       taxService: parseFloat(updateData.taxService) || 0,
//     };

//     if (updateData.items) {
//       if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
//         return NextResponse.json({ success: false, message: "At least one item is required" }, { status: 400 });
//       }
//       // Validate item names
//       const invalid = updateData.items.filter(i => !i.itemName || i.itemName.trim() === "");
//       if (invalid.length) {
//         return NextResponse.json(
//           { success: false, message: `Items missing a name: ${invalid.length} item(s)` },
//           { status: 400 }
//         );
//       }
//       fieldsToUpdate.items = updateData.items.map((item) => {
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
//         };
//         if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
//           mapped._id = item._id;
//         }
//         return mapped;
//       });
//     }

//     Object.assign(boq, fieldsToUpdate);
//     boq.version = (boq.version || 1) + 1;
//     await boq.save();

//     await boq.populate([
//       { path: "project", select: "name" },
//       { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
//       { path: "customer", select: "customerName contactPersonName mobileNumber" },
//     ]);

//     return NextResponse.json({ success: true, data: boq });
//   } catch (err) {
//     console.error("❌ PUT /boq error:", err);
//     if (err.name === "ValidationError") {
//       const messages = Object.values(err.errors).map(e => e.message);
//       return NextResponse.json(
//         { success: false, message: `Validation error: ${messages.join(", ")}` },
//         { status: 400 }
//       );
//     }
//     if (err.code === 11000) {
//       return NextResponse.json(
//         { success: false, message: "A BOQ with this number already exists." },
//         { status: 409 }
//       );
//     }
//     return NextResponse.json(
//       { success: false, message: err.message || "Update failed" },
//       { status: 500 }
//     );
//   }
// }




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import BOQ from "@/models/contruction/BOQ";
// import Project from "@/models/project/ProjectModel";
// import Supplier from "@/models/SupplierModels";
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

// // ─── GET: List BOQs ──────────────────────────────────────────────────────
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     const projectId = searchParams.get("projectId");
//     const statusFilter = searchParams.get("status");
//     const phase = searchParams.get("phase");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

//     if (id) {
//       const boq = await BOQ.findOne({ _id: id, companyId: user.companyId })
//         .populate("project", "name")
//         .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
//         .populate("createdBy", "name")
//         .lean();
//       if (!boq) {
//         return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//       }
//       return NextResponse.json({ success: true, data: boq });
//     }

//     const query = { companyId: user.companyId };
//     if (projectId) query.project = projectId;
//     if (statusFilter && statusFilter !== "all") query.status = statusFilter;
//     if (phase && phase !== "all") query.phase = phase;

//     const skip = (page - 1) * limit;
//     const [boqs, total] = await Promise.all([
//       BOQ.find(query)
//         .populate("project", "name")
//         .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       BOQ.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: boqs,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error("GET /boq error:", err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const body = await req.json();
//     console.log("📥 Received BOQ payload:", JSON.stringify(body, null, 2));

//     const {
//       project,
//       contractor,
//       boqNumber,
//       phase,
//       date,
//       status: boqStatus,
//       remarks,
//       items,
//       taxVAT,
//       taxService,
//     } = body;

//     // ── 1. Validate required fields ──
//     if (!project) {
//       return NextResponse.json({ success: false, message: "Project is required" }, { status: 400 });
//     }
//     if (!boqNumber || !boqNumber.trim()) {
//       return NextResponse.json({ success: false, message: "BOQ Number is required" }, { status: 400 });
//     }
//     if (!items || items.length === 0) {
//       return NextResponse.json({ success: false, message: "At least one item is required" }, { status: 400 });
//     }

//     // ── 2. Validate project belongs to company ──
//     const projectDoc = await Project.findOne({ _id: project, company: user.companyId });
//     if (!projectDoc) {
//       return NextResponse.json(
//         { success: false, message: "Invalid project – it does not belong to your company." },
//         { status: 400 }
//       );
//     }

//     // ── 3. Contractor – no validation, just let it be null if invalid ──
//     // We'll just log it for debugging.
//     if (contractor) {
//       console.log(`🔍 Contractor provided: ${contractor}`);
//       // We don't validate – we'll just use it as-is, or null if invalid.
//     }

//     // ── 4. Prepare items ──
//     const preparedItems = items.map((item) => ({
//       itemId: item.itemId || null,
//       itemName: item.itemName?.trim() || "",
//       description: item.description?.trim() || "",
//       unit: item.unit?.trim() || "nos",
//       quantity: parseFloat(item.quantity) || 0,
//       rate: parseFloat(item.rate) || 0,
//       amount: parseFloat(item.amount) || 0,
//       section: item.section?.trim() || "Other Work",
//       subSection: item.subSection?.trim() || "Main",
//       subSectionIndex: parseInt(item.subSectionIndex) || 1,
//       isRateOnly: !!item.isRateOnly,
//     }));

//     // ── 5. Build BOQ document ──
//     const boqData = {
//       companyId: user.companyId,
//       project,
//       contractor: contractor || null, // if invalid, it will be null
//       boqNumber: boqNumber.trim(),
//       phase: phase || "I",
//       date: date ? new Date(date) : new Date(),
//       status: boqStatus || "draft",
//       remarks: remarks?.trim() || "",
//       items: preparedItems,
//       taxVAT: parseFloat(taxVAT) || 0,
//       taxService: parseFloat(taxService) || 0,
//       createdBy: user.id,
//     };

//     const boq = new BOQ(boqData);
//     await boq.save();

//     await boq.populate([
//       { path: "project", select: "name" },
//       { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
//     ]);

//     return NextResponse.json({ success: true, data: boq }, { status: 201 });
//   } catch (err) {
//     console.error("❌ POST /boq error:", err);
//     if (err.name === "ValidationError") {
//       const messages = Object.values(err.errors).map(e => e.message);
//       return NextResponse.json(
//         { success: false, message: messages.join(", ") },
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
//       { success: false, message: err.message || "Failed to create BOQ" },
//       { status: 500 }
//     );
//   }
// }
// // ─── PUT: Update an existing BOQ ──────────────────────────────────────────
// export async function PUT(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const body = await req.json();
//     const { id, ...updateData } = body;

//     if (!id) {
//       return NextResponse.json(
//         { success: false, message: "BOQ ID is required" },
//         { status: 400 }
//       );
//     }

//     // ── Find existing BOQ ──
//     const existingBoq = await BOQ.findOne({ _id: id, companyId: user.companyId });
//     if (!existingBoq) {
//       return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
//     }

//     // ── Validate project (if changed) ──
//     if (updateData.project) {
//       const projectDoc = await Project.findOne({
//         _id: updateData.project,
//         companyId: user.companyId,
//       });
//       if (!projectDoc) {
//         return NextResponse.json(
//           { success: false, message: "Invalid project – it does not belong to your company." },
//           { status: 400 }
//         );
//       }
//     }

//     // ── Validate contractor (if provided) ──
//     if (updateData.contractor) {
//       const contractorDoc = await Supplier.findOne({
//         _id: updateData.contractor,
//         companyId: user.companyId,
//       });
//       if (!contractorDoc) {
//         return NextResponse.json(
//           { success: false, message: "Invalid contractor – it does not belong to your company." },
//           { status: 400 }
//         );
//       }
//     }

//     // ── Prepare update fields ──
//     const fieldsToUpdate = {
//       project: updateData.project,
//       contractor: updateData.contractor || null,
//       boqNumber: updateData.boqNumber?.trim(),
//       phase: updateData.phase,
//       date: updateData.date ? new Date(updateData.date) : undefined,
//       status: updateData.status,
//       remarks: updateData.remarks?.trim() || "",
//       taxVAT: parseFloat(updateData.taxVAT) || 0,
//       taxService: parseFloat(updateData.taxService) || 0,
//     };

//     // ── Handle items update ──
//     if (updateData.items) {
//       if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
//         return NextResponse.json(
//           { success: false, message: "At least one item is required" },
//           { status: 400 }
//         );
//       }
//       fieldsToUpdate.items = updateData.items.map((item) => ({
//         itemId: item.itemId || null,
//         itemName: item.itemName?.trim() || "",
//         description: item.description?.trim() || "",
//         unit: item.unit?.trim() || "nos",
//         quantity: parseFloat(item.quantity) || 0,
//         rate: parseFloat(item.rate) || 0,
//         amount: parseFloat(item.amount) || 0,
//         section: item.section?.trim() || "Other Work",
//         subSection: item.subSection?.trim() || "Main",
//         subSectionIndex: parseInt(item.subSectionIndex) || 1,
//         isRateOnly: !!item.isRateOnly,
//       }));
//     }

//     // ── Update and save ──
//     Object.assign(existingBoq, fieldsToUpdate);
//     await existingBoq.save();

//     await existingBoq.populate([
//       { path: "project", select: "name" },
//       { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
//     ]);

//     return NextResponse.json({ success: true, data: existingBoq });
//   } catch (err) {
//     console.error("❌ PUT /boq error:", err);
//     if (err.name === "ValidationError") {
//       const messages = Object.values(err.errors).map(e => e.message);
//       return NextResponse.json(
//         { success: false, message: messages.join(", ") },
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
//       { success: false, message: err.message || "Failed to update BOQ" },
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

// ─── Auth ──────────────────────────────────────────────────────────────────
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

// ─── Helper: normalize string for deduplication comparison ───────────────
function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── Helper: Identify legitimate billable items vs empty scope headers ───
function isBillableLine(desc) {
  const isRateOnly = Boolean(desc.isRateOnly);
  const qty = parseFloat(desc.quantity ?? desc.qty) || 0;
  const supplyRate = parseFloat(desc.unitRateSupply) || 0;
  const installRate = parseFloat(desc.unitRateInstallation) || 0;
  return isRateOnly || (qty > 0 && (supplyRate > 0 || installRate > 0));
}

// ─── Auto-Increment Item Code Generator ──────────────────────────────────
async function getNextItemCode(companyId) {
  const lastItem = await Item.findOne({
    companyId,
    itemCode: { $regex: /^ITEM-\d+$/ },
  })
    .sort({ createdAt: -1 })
    .select("itemCode")
    .lean();

  if (!lastItem || !lastItem.itemCode) {
    return "ITEM-00001";
  }

  const currentNumber = parseInt(lastItem.itemCode.replace("ITEM-", ""), 10) || 0;
  return `ITEM-${String(currentNumber + 1).padStart(5, "0")}`;
}

// ─── Helper: Map and Dedupe Hierarchical Items ─────────────────────────────
function mapAndDedupeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  const groupedMap = new Map();

  rawItems.forEach((raw) => {
    const itemName = (raw.itemName || "").trim();
    const itemSerialNo = (raw.itemSerialNo || raw.serialNo || "").trim();
    const section = (raw.section || "Other Work").trim();
    const subSection = (raw.subSection || "Main").trim();
    const subSectionIndex = parseInt(raw.subSectionIndex) || 1;
    const sectionSpecification = (raw.sectionSpecification || "").trim();

    const parentKey = `${normalize(section)}|${normalize(subSection)}|${normalize(itemName)}`;

    if (!groupedMap.has(parentKey)) {
      groupedMap.set(parentKey, {
        itemId: raw.itemId && mongoose.Types.ObjectId.isValid(raw.itemId) ? raw.itemId : null,
        itemSerialNo,
        itemName: itemName || "Unnamed Item",
        section,
        sectionSpecification,
        subSection,
        subSectionIndex,
        descriptions: [],
        _id: raw._id && mongoose.Types.ObjectId.isValid(raw._id) ? raw._id : undefined,
      });
    }

    const parentGroup = groupedMap.get(parentKey);

    // 1. If incoming item already has a descriptions array
    if (Array.isArray(raw.descriptions) && raw.descriptions.length > 0) {
      raw.descriptions.forEach((desc) => {
        const descText = (desc.description || "").trim();
        if (!descText) return;

        const srNo = (desc.srNo || "").trim();
        const lineKey = `${srNo}|${normalize(descText)}`;

        const isDuplicate = parentGroup.descriptions.some(
          (existing) =>
            `${(existing.srNo || "").trim()}|${normalize(existing.description)}` === lineKey
        );

        if (!isDuplicate) {
          const isHeader = !isBillableLine(desc);
          const qty = isHeader ? 0 : parseFloat(desc.quantity ?? desc.qty) || 0;
          const supplyRate = isHeader ? 0 : parseFloat(desc.unitRateSupply) || 0;
          const installRate = isHeader ? 0 : parseFloat(desc.unitRateInstallation) || 0;
          const isRateOnly = isHeader ? false : !!desc.isRateOnly;
          const amountSupply = isRateOnly ? supplyRate : qty * supplyRate;
          const amountInstallation = isRateOnly ? installRate : qty * installRate;
          const totalAmount = amountSupply + amountInstallation;

          parentGroup.descriptions.push({
            itemId: desc.itemId && mongoose.Types.ObjectId.isValid(desc.itemId) ? desc.itemId : null,
            srNo,
            description: descText,
            unit: isHeader ? "—" : (desc.unit || "nos").trim(),
            quantity: isRateOnly ? 0 : qty,
            unitRateSupply: supplyRate,
            unitRateInstallation: installRate,
            amountSupply,
            amountInstallation,
            totalAmount,
            amount: totalAmount,
            isRateOnly,
            isHeader,
            _id: desc._id && mongoose.Types.ObjectId.isValid(desc._id) ? desc._id : undefined,
          });
        }
      });
    }
    // 2. Fallback: If sent as a legacy flat item
    else if (raw.description && raw.description.trim()) {
      const descText = raw.description.trim();
      const srNo = (raw.srNo || "").trim();
      const lineKey = `${srNo}|${normalize(descText)}`;

      const isDuplicate = parentGroup.descriptions.some(
        (existing) =>
          `${(existing.srNo || "").trim()}|${normalize(existing.description)}` === lineKey
      );

      if (!isDuplicate) {
        const isHeader = !isBillableLine(raw);
        const qty = isHeader ? 0 : parseFloat(raw.quantity ?? raw.qty) || 0;
        const supplyRate = isHeader ? 0 : parseFloat(raw.unitRateSupply) || 0;
        const installRate = isHeader ? 0 : parseFloat(raw.unitRateInstallation) || 0;
        const isRateOnly = isHeader ? false : !!raw.isRateOnly;
        const amountSupply = isRateOnly ? supplyRate : qty * supplyRate;
        const amountInstallation = isRateOnly ? installRate : qty * installRate;
        const totalAmount = amountSupply + amountInstallation;

        parentGroup.descriptions.push({
          itemId: raw.itemId && mongoose.Types.ObjectId.isValid(raw.itemId) ? raw.itemId : null,
          srNo,
          description: descText,
          unit: isHeader ? "—" : (raw.unit || "nos").trim(),
          quantity: isRateOnly ? 0 : qty,
          unitRateSupply: supplyRate,
          unitRateInstallation: installRate,
          amountSupply,
          amountInstallation,
          totalAmount,
          amount: totalAmount,
          isRateOnly,
          isHeader,
        });
      }
    }
  });

  return Array.from(groupedMap.values()).filter((item) => item.descriptions.length > 0);
}

// ─── Find or Create Child Description as a "Raw Material" in Item Master ─────
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

// ─── Find or Create Parent Item as a "Product" (Finished Good) & Link BOM ──
async function syncParentAndLinkBOM(companyId, userId, parent) {
  const rawParentName = (parent.itemName || "").trim();
  const rawMaterialLinks = [];

  // 1. Process description lines into Raw Material items ONLY if billable
  for (const descLine of parent.descriptions) {
    if (descLine.isHeader || !isBillableLine(descLine)) {
      descLine.itemId = null; // Headers do not have Master IDs
      continue; // 👈 Skip Raw Material creation and BOM linking
    }

    let rawMatDoc;
    if (descLine.itemId && mongoose.Types.ObjectId.isValid(descLine.itemId)) {
      rawMatDoc = await Item.findOne({ _id: descLine.itemId, companyId });
    }

    if (!rawMatDoc) {
      rawMatDoc = await findOrCreateRawMaterialItem(companyId, userId, descLine, parent.section);
    }

    descLine.itemId = rawMatDoc._id;

    rawMaterialLinks.push({
      rawMaterialId: rawMatDoc._id,
      rawMaterialName: rawMatDoc.itemName,
      quantityPerUnit: descLine.quantity || 1,
      uom: descLine.unit || "nos",
      unitRate: descLine.unitRateSupply || 0,
      notes: descLine.srNo ? `Line ${descLine.srNo}` : "",
    });
  }

  // 2. Find or Create Finished Good ("Product") for the Parent Item
  let productDoc = null;
  if (parent.itemId && mongoose.Types.ObjectId.isValid(parent.itemId)) {
    productDoc = await Item.findOne({ _id: parent.itemId, companyId });
  }

  if (!productDoc) {
    productDoc = await Item.findOne({
      companyId,
      itemName: { $regex: new RegExp(`^${rawParentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      itemType: { $ne: "Raw Material" },
    });
  }

  if (productDoc) {
    productDoc.rawMaterials = rawMaterialLinks;
    if (parent.sectionSpecification) {
      productDoc.description = parent.sectionSpecification;
    }
    await productDoc.save();
  } else {
    const nextProductCode = await getNextItemCode(companyId);
    productDoc = new Item({
      companyId,
      createdBy: userId,
      itemCode: nextProductCode,
      serialNumber: (parent.itemSerialNo || "").trim(),
      itemName: rawParentName,
      description: parent.sectionSpecification || rawParentName,
      category: parent.section || "Other Work",
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

  parent.itemId = productDoc._id;
  if (productDoc.itemCode) {
    parent.itemSerialNo = productDoc.itemCode;
  }

  return productDoc;
}

// ─── GET: List / Single BOQ ──────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    // const projectId = searchParams.get("projectId");
    const statusFilter = searchParams.get("status");
    const phase = searchParams.get("phase");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, message: "Invalid BOQ ID format" }, { status: 400 });
      }
      const boq = await BOQ.findOne({ _id: id, companyId: user.companyId })
        // .populate("project", "name")
        .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
        .populate("customer", "customerName contactPersonName mobileNumber")
        .populate("createdBy", "name")
        .populate("items.itemId", "itemCode itemName itemType")
        .populate("items.descriptions.itemId", "itemCode itemName itemType uom unitPrice")
        .lean();

      if (!boq) {
        return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: boq });
    }

    const query = { companyId: user.companyId };
    // if (projectId) query.project = projectId;
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;
    if (phase && phase !== "all") query.phase = phase;

    const skip = (page - 1) * limit;
    const [boqs, total] = await Promise.all([
      BOQ.find(query)
        // .populate("project", "name")
        .populate("contractor", "supplierName supplierCode contactPersonName mobileNumber")
        .populate("customer", "customerName contactPersonName mobileNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BOQ.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: boqs,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /boq error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST: Create BOQ ──────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const {
      project,
      contractor,
      customer,
      boqNumber,
      phase,
      date,
      status: boqStatus,
      remarks,
      items,
      taxVAT,
      taxService,
    } = body;

    // if (!project) {
    //   return NextResponse.json({ success: false, message: "Project is required" }, { status: 400 });
    // }
    if (!boqNumber || !boqNumber.trim()) {
      return NextResponse.json({ success: false, message: "BOQ Number is required" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: "At least one item is required" }, { status: 400 });
    }

    // const projectDoc = await Project.findOne({ _id: project, company: user.companyId });
    // if (!projectDoc) {
    //   return NextResponse.json(
    //     { success: false, message: "Invalid project – it does not belong to your company." },
    //     { status: 400 }
    //   );
    // }

    let contractorId = null;
    if (contractor) {
      const contractorDoc = await Supplier.findOne({ _id: contractor, companyId: user.companyId });
      contractorId = contractorDoc ? contractor : null;
    }

    let customerId = null;
    if (customer) {
      const customerDoc = await Customer.findOne({ _id: customer, companyId: user.companyId });
      customerId = customerDoc ? customer : null;
    }

    const preparedItems = mapAndDedupeItems(items);
    if (preparedItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid items with description lines to save." },
        { status: 400 }
      );
    }

    // ── Sync Item Master: Raw Materials & Finished Goods BOM ──
    for (const parent of preparedItems) {
      await syncParentAndLinkBOM(user.companyId, user.id, parent);
    }

    const boqData = {
      companyId: user.companyId,
      project,
      contractor: contractorId,
      customer: customerId,
      boqNumber: boqNumber.trim(),
      phase: phase || "I",
      date: date ? new Date(date) : new Date(),
      status: boqStatus || "draft",
      remarks: remarks?.trim() || "",
      items: preparedItems,
      materials: body.materials || [],
      taxVAT: parseFloat(taxVAT) || 0,
      taxService: parseFloat(taxService) || 0,
      createdBy: user.id,
    };

    const boq = new BOQ(boqData);
    await boq.save();

    await boq.populate([
      // { path: "project", select: "name" },
      { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
      { path: "customer", select: "customerName contactPersonName mobileNumber" },
    ]);

    return NextResponse.json({ success: true, data: boq }, { status: 201 });
  } catch (err) {
    console.error("❌ POST /boq error:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
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
      { success: false, message: err.message || "Failed to create BOQ" },
      { status: 500 }
    );
  }
}

// ─── PUT: Update BOQ (via body id) ─────────────────────────────────────────
export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "BOQ ID is required" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid BOQ ID format" }, { status: 400 });
    }

    const boq = await BOQ.findOne({ _id: id, companyId: user.companyId });
    if (!boq) {
      return NextResponse.json({ success: false, message: "BOQ not found" }, { status: 404 });
    }

    // if (updateData.project) {
    //   const projectDoc = await Project.findOne({ _id: updateData.project, company: user.companyId });
    //   if (!projectDoc) {
    //     return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
    //   }
    //   boq.project = updateData.project;
    // }

    if (updateData.contractor !== undefined) {
      boq.contractor = updateData.contractor || null;
    }
    if (updateData.customer !== undefined) {
      boq.customer = updateData.customer || null;
    }
    if (updateData.boqNumber !== undefined) {
      boq.boqNumber = updateData.boqNumber.trim();
    }
    if (updateData.phase !== undefined) {
      boq.phase = updateData.phase;
    }
    if (updateData.date !== undefined) {
      boq.date = new Date(updateData.date);
    }
    if (updateData.status !== undefined) {
      boq.status = updateData.status;
    }
    if (updateData.remarks !== undefined) {
      boq.remarks = updateData.remarks.trim();
    }
    if (updateData.taxVAT !== undefined) {
      boq.taxVAT = parseFloat(updateData.taxVAT) || 0;
    }
    if (updateData.taxService !== undefined) {
      boq.taxService = parseFloat(updateData.taxService) || 0;
    }

    // Update items hierarchically with Raw Material & BOM Sync
    if (updateData.items !== undefined) {
      if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one item is required" },
          { status: 400 }
        );
      }

      const preparedItems = mapAndDedupeItems(updateData.items);
      if (preparedItems.length === 0) {
        return NextResponse.json(
          { success: false, message: "Items must contain valid description lines." },
          { status: 400 }
        );
      }

      for (const parent of preparedItems) {
        await syncParentAndLinkBOM(user.companyId, user.id, parent);
      }

      boq.items = preparedItems;
    }

    if (updateData.materials !== undefined) {
      boq.materials = updateData.materials;
    }

    boq.version = (boq.version || 1) + 1;
    await boq.save();

    await boq.populate([
      // { path: "project", select: "name" },
      { path: "contractor", select: "supplierName supplierCode contactPersonName mobileNumber" },
      { path: "customer", select: "customerName contactPersonName mobileNumber" },
    ]);

    return NextResponse.json({ success: true, data: boq });
  } catch (err) {
    console.error("❌ PUT /boq error:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return NextResponse.json(
        { success: false, message: `Validation error: ${messages.join(", ")}` },
        { status: 400 }
      );
    }
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A BOQ with this number already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}