import mongoose from "mongoose";

const TenderBidSchema = new mongoose.Schema(
  {
    tender: { type: mongoose.Schema.Types.ObjectId, ref: "Tender", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    items: [
      {
        boqItemId: { type: mongoose.Schema.Types.ObjectId, ref: "BOQ.items" },
        itemName: String,
        unit: String,
        quantity: Number,
        quotedRate: Number,
        amount: Number,
      },
    ],
    totalAmount: { type: Number, default: 0 },
    technicalScore: { type: Number, default: 0 },
    commercialScore: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    evaluation: [
      {
        criterion: { type: String, required: true },
        score: { type: Number, min: 0, max: 100 },
        remarks: String,
        evaluator: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
        evaluatedAt: { type: Date, default: Date.now },
      },
    ],
    documents: [{ name: String, url: String }],
    remarks: String,
    status: {
      type: String,
      enum: ["submitted", "evaluated", "awarded", "rejected"],
      default: "submitted",
    },
    submittedDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

TenderBidSchema.index({ tender: 1, vendor: 1 }, { unique: true });
TenderBidSchema.index({ companyId: 1, tender: 1 });

export default mongoose.models.TenderBid || mongoose.model("TenderBid", TenderBidSchema);