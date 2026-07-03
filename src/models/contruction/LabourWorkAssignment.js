import mongoose from "mongoose";

const LabourWorkAssignmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    labour: { type: mongoose.Schema.Types.ObjectId, ref: "Labour", required: true },
    
    // Work details
    workName: { type: String, required: true },
    workDescription: { type: String },
    workType: { type: String, enum: ["construction", "plastering", "painting", "flooring", "electrical", "plumbing", "other"], default: "construction" },
    
    // Quantity / Target
    targetQuantity: { type: Number, required: true }, // e.g., 10 (for 10x10)
    targetUnit: { type: String, default: "sqft" }, // sqft, sqm, nos, rmt
    targetDimensions: { type: String }, // e.g., "10x10" for display
    
    // Timeline
    startDate: { type: Date, default: Date.now },
    expectedCompletionDate: { type: Date, required: true }, // 2 hajari = 2 days
    actualCompletionDate: { type: Date },
    
    // Progress
    workDone: { type: Number, default: 0 }, // quantity completed so far
    progressPercentage: { type: Number, default: 0 }, // auto-calculated
    status: {
      type: String,
      enum: ["assigned", "in-progress", "completed", "overdue", "cancelled"],
      default: "assigned",
    },
    
    // Daily updates log
    dailyUpdates: [
      {
        date: { type: Date, default: Date.now },
        workDoneToday: { type: Number, default: 0 },
        remarks: { type: String },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
      },
    ],
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

// Auto-calculate progress and status
LabourWorkAssignmentSchema.pre("save", function (next) {
  if (this.targetQuantity > 0) {
    this.progressPercentage = Math.min(100, Math.round((this.workDone / this.targetQuantity) * 100));
  }
  if (this.progressPercentage >= 100) {
    this.status = "completed";
    if (!this.actualCompletionDate) {
      this.actualCompletionDate = new Date();
    }
  } else if (this.expectedCompletionDate < new Date() && this.status !== "completed") {
    this.status = "overdue";
  } else if (this.status === "assigned" && this.workDone > 0) {
    this.status = "in-progress";
  }
  next();
});

LabourWorkAssignmentSchema.index({ companyId: 1, project: 1, status: 1 });
LabourWorkAssignmentSchema.index({ companyId: 1, labour: 1 });

export default mongoose.models.LabourWorkAssignment ||
  mongoose.model("LabourWorkAssignment", LabourWorkAssignmentSchema);
