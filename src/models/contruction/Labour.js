import mongoose from "mongoose";

const LabourSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true },
    phone: { type: String },
    address: String,
    skill: { type: String, enum: ["carpenter", "fitter", "mason", "helper", "electrician", "plumber", "welder", "operator", "foreman", "other"], default: "helper" },
    dailyRate: { type: Number, required: true, min: 0 },
    contractor: { type: String }, // contractor name if they belong to a sub-contractor
    aadhaar: { type: String }, // optional document number
    documents: [{ type: String }], // URLs for uploaded documents
    status: { type: String, enum: ["active", "inactive", "on-leave"], default: "active" },
    joinedDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

LabourSchema.index({ companyId: 1, project: 1 });
LabourSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.Labour || mongoose.model("Labour", LabourSchema);
