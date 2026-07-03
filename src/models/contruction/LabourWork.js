import mongoose from "mongoose";

const LabourWorkSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    // Multiple labours can be assigned to same work
    assignedLabours: [{ type: mongoose.Schema.Types.ObjectId, ref: "Labour" }],
    // Work details
    workTitle: { type: String, required: true },
    workDescription: { type: String, required: true },
    workType: {
      type: String,
      enum: ["masonry", "plastering", "flooring", "tiling", "painting", "carpentry", "plumbing", "electrical", "roofing", "other"],
      default: "other",
    },
    // Location within site
    location: { type: String },
    // Time tracking
    estimatedDays: { type: Number, required: true, min: 0.5 }, // 0.5 = half day, 2 = 2 days
    estimatedHours: { type: Number, default: 0 },
    actualDays: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    // Status
    status: {
      type: String,
      enum: ["assigned", "in-progress", "completed", "delayed", "cancelled"],
      default: "assigned",
    },
    // Materials used for this work (reference to BOQ items or custom)
    materialsUsed: [
      {
        materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        materialName: { type: String },
        quantity: { type: Number },
        unit: { type: String },
        notes: { type: String },
      }
    ],
    // Daily progress log
    progressLogs: [
      {
        date: { type: Date, default: Date.now },
        labourId: { type: mongoose.Schema.Types.ObjectId, ref: "Labour" },
        description: { type: String },
        hoursWorked: { type: Number, default: 0 },
        status: { type: String, enum: ["started", "in-progress", "completed-day"], default: "in-progress" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
      }
    ],
    startDate: { type: Date },
    endDate: { type: Date },
    // Ratings
    qualityRating: { type: Number, min: 0, max: 5 },
    speedRating: { type: Number, min: 0, max: 5 },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

// Indexes for faster queries
LabourWorkSchema.index({ companyId: 1, project: 1, status: 1 });
LabourWorkSchema.index({ companyId: 1, assignedLabours: 1 });

export default mongoose.models.LabourWork ||
  mongoose.model("LabourWork", LabourWorkSchema);
