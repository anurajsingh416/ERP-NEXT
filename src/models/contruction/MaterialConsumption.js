import mongoose from "mongoose";

const MaterialConsumptionItemSchema = new mongoose.Schema({
  // Link to the general item master (optional)
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    default: null,
  },
  // Link to the BOQ item (optional)
  boqItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BOQ.items",
    default: null,
  },
  materialName: { type: String, required: true, trim: true },
  unit: { type: String, default: "nos", trim: true },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  rate: { type: Number, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
  location: { type: String, trim: true },
  remarks: { type: String, trim: true },
  section: { type: String, default: "Other Work", trim: true },
});

const MaterialConsumptionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    // Optional: link to a Work Order
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
      default: null,
    },
    consumptionDate: { type: Date, default: Date.now },
    items: [MaterialConsumptionItemSchema],
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

MaterialConsumptionSchema.index({ companyId: 1, project: 1 });
MaterialConsumptionSchema.index({ companyId: 1, workOrderId: 1 });
MaterialConsumptionSchema.index({ companyId: 1, consumptionDate: -1 });

export default mongoose.models.MaterialConsumption ||
  mongoose.model("MaterialConsumption", MaterialConsumptionSchema);
