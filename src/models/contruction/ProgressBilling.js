import mongoose from "mongoose";

const ProgressBillItemSchema = new mongoose.Schema({
  boqItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BOQ.items",
    default: null,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    default: null,
  },
  description: { type: String, trim: true },
  unit: { type: String, default: "nos", trim: true },
  rate: { type: Number, default: 0 },
  billedQuantity: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  source: { type: String, enum: ["boq", "material", "custom"], default: "boq" },
  // For custom rows added manually
  isCustom: { type: Boolean, default: false },
});

const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  method: { type: String, enum: ["cash", "bank", "cheque", "upi", "other"], default: "cash" },
  reference: { type: String, trim: true },
  note: { type: String, trim: true },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
});

const ProgressBillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    boq: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BOQ",
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    orderType: {
      type: String,
      enum: ["contractor", "customer"],
      default: "contractor",
    },
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
      default: null,
    },
    items: [ProgressBillItemSchema],
    total: { type: Number, default: 0 },
    taxVAT: { type: Number, default: 0 },
    taxService: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "issued", "paid", "cancelled"],
      default: "draft",
    },
    // Add to ProgressBillSchema
payments: [PaymentSchema],
paidAmount: { type: Number, default: 0 },
remainingAmount: { type: Number, default: 0 },
    billDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
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
ProgressBillSchema.index({ companyId: 1, billNumber: 1 }, { unique: true });
ProgressBillSchema.index({ companyId: 1, boq: 1 });
ProgressBillSchema.index({ companyId: 1, status: 1 });
ProgressBillSchema.index({ companyId: 1, orderType: 1 });

// Pre‑save hook to calculate totals
ProgressBillSchema.pre("save", function(next) {
  this.paidAmount = (this.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const total = this.items.reduce((sum, i) => sum + (i.amount || 0), 0);
  this.remainingAmount = total - this.paidAmount;
  if (this.remainingAmount <= 0) this.status = "paid";
  next();
});

export default mongoose.models.ProgressBill ||
  mongoose.model("ProgressBill", ProgressBillSchema);