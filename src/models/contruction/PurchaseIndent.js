import mongoose from "mongoose";

const IndentItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  itemName: { type: String, required: true },
  uom: { type: String },
  quantityRequired: { type: Number, required: true },
  quantityAvailable: { type: Number, default: 0 },
  quantityToPurchase: { type: Number, required: true },
  estimatedRate: { type: Number, default: 0 },
  estimatedAmount: { type: Number, default: 0 },
  boqReference: { type: String },
  remarks: { type: String },
});

const PurchaseIndentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    boq: { type: mongoose.Schema.Types.ObjectId, ref: "BOQ" },
    indentNumber: { type: String, required: true },
    indentDate: { type: Date, default: Date.now },
    requiredDate: { type: Date },
    items: [IndentItemSchema],
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "purchased", "partially-purchased"],
      default: "pending",
    },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    approvedDate: { type: Date },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

PurchaseIndentSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0);
  next();
});

PurchaseIndentSchema.index({ companyId: 1, indentNumber: 1 }, { unique: true });
PurchaseIndentSchema.index({ companyId: 1, project: 1 });
PurchaseIndentSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.PurchaseIndent ||
  mongoose.model("PurchaseIndent", PurchaseIndentSchema);
