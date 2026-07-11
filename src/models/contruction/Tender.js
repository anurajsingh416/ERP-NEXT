import mongoose from "mongoose";

const TenderSchema = new mongoose.Schema(
  {
    tenderNumber: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    boq: { type: mongoose.Schema.Types.ObjectId, ref: "BOQ", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    preQualification: [{ type: String }],
    interestedVendors: [
      {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
        status: { type: String, enum: ["pending", "qualified", "disqualified"], default: "pending" },
        registeredDate: { type: Date, default: Date.now },
      },
    ],
    submissionDeadline: { type: Date, required: true },
    bidOpening: {
      scheduledDate: { type: Date },
      isOpen: { type: Boolean, default: false },
      openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
      openedDate: { type: Date },
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed", "awarded", "cancelled"],
      default: "draft",
    },
    evaluationCriteria: {
      technicalWeight: { type: Number, default: 40 },
      commercialWeight: { type: Number, default: 60 },
    },
    timeline: [
      {
        event: { type: String, enum: ["created", "published", "vendor_registered", "bid_submitted", "evaluated", "awarded", "cancelled"] },
        description: String,
        date: { type: Date, default: Date.now },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

TenderSchema.index({ companyId: 1, tenderNumber: 1 }, { unique: true });
TenderSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.Tender || mongoose.model("Tender", TenderSchema);