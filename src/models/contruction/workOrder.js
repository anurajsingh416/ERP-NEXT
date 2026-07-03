import mongoose from "mongoose";

const MaterialSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    default: null,
  },
  itemName: { type: String },
  quantity: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: "nos", trim: true },
  rate: { type: Number, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
  section: { type: String, default: "Other Work", trim: true },
  subSection: { type: String, default: "Main", trim: true },
  subSectionIndex: { type: Number, default: 1 },
  isRateOnly: { type: Boolean, default: false },
  consumedQty: { type: Number, default: 0, min: 0 },
  consumedAmount: { type: Number, default: 0, min: 0 },
  type: {
    type: String,
    enum: ["material", "labour", "equipment", "subcontract", "other"],
    default: "material",
  },
  // ✅ stock transfer flag
  transferFromStock: { type: Boolean, default: true },
});

const WorkOrderItemSchema = new mongoose.Schema({
  boqItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BOQ.items",
    default: null,
  },
  itemName: { type: String, trim: true },
  description: { type: String, required: true, trim: true },
  unit: { type: String, default: "nos", trim: true },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  rate: { type: Number, required: true, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
  section: { type: String, default: "Other Work", trim: true },
  subSection: { type: String, default: "Main", trim: true },
  subSectionIndex: { type: Number, default: 1 },
  isRateOnly: { type: Boolean, default: false },
  consumedQty: { type: Number, default: 0, min: 0 },
  consumedAmount: { type: Number, default: 0, min: 0 },
  transferFromStock: { type: Boolean, default: false },
});

const WorkOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    boq: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BOQ",
      required: true,
    },
    orderType: {
      type: String,
      enum: ["contractor", "customer"],
      default: "contractor",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    materials: [MaterialSchema],   // ✅ top‑level materials
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    items: [WorkOrderItemSchema],
    status: {
      type: String,
      enum: ["draft", "issued", "in-progress", "completed", "cancelled"],
      default: "draft",
    },
    issuedDate: { type: Date, default: Date.now },
    expectedStart: { type: Date },
    expectedEnd: { type: Date },
    actualStart: { type: Date },
    actualEnd: { type: Date },
    remarks: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
WorkOrderSchema.index({ companyId: 1, workOrderNumber: 1 }, { unique: true });
WorkOrderSchema.index({ companyId: 1, project: 1 });
WorkOrderSchema.index({ companyId: 1, boq: 1 });
WorkOrderSchema.index({ companyId: 1, status: 1 });
WorkOrderSchema.index({ companyId: 1, orderType: 1 });
WorkOrderSchema.index({ companyId: 1, customer: 1 });

export default mongoose.models.WorkOrder ||
  mongoose.model("WorkOrder", WorkOrderSchema);
