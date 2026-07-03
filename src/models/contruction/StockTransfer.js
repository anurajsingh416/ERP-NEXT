import mongoose from "mongoose";

const StockTransferItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: "nos" },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  // Optional reference back to work order item for traceability
  workOrderItemId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder.items" },
  boqItemId: { type: mongoose.Schema.Types.ObjectId, ref: "BOQ.items" },
});

const StockTransferSchema = new mongoose.Schema(
  {
    transferNumber: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder" },
    // ✅ Warehouse fields
       // ✅ NEW: party type and name for quick display
    partyType: { type: String, enum: ["contractor", "customer"], default: "contractor" },
    partyName: { type: String, trim: true },
    sourceWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    destinationWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    sourceLocation: { type: String }, // legacy, kept for compatibility
    destinationLocation: { type: String }, // legacy, kept for compatibility
    items: [StockTransferItemSchema],
    status: { type: String, enum: ["draft", "completed", "cancelled"], default: "draft" },
    
    transferredDate: { type: Date, default: Date.now },
    remarks: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

StockTransferSchema.index({ companyId: 1, transferNumber: 1 }, { unique: true });
StockTransferSchema.index({ companyId: 1, project: 1 });
StockTransferSchema.index({ companyId: 1, workOrder: 1 });
StockTransferSchema.index({ companyId: 1, sourceWarehouse: 1 });

export default mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", StockTransferSchema);
