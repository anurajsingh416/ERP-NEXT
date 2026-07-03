import mongoose from "mongoose";

const LabourProductivitySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    labour: { type: mongoose.Schema.Types.ObjectId, ref: "Labour", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    
    // Summary
    totalDaysWorked: { type: Number, default: 0 },
    totalDaysAssigned: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    totalEstimatedHours: { type: Number, default: 0 },
    
    // Productivity metrics
    productivityRatio: { type: Number, default: 0 }, // actual/estimated
    efficiency: { type: Number, default: 0 }, // (estimated/actual)*100
    onTimeCompletion: { type: Number, default: 0 }, // percentage
    
    // Activities completed
    activitiesCompleted: { type: Number, default: 0 },
    activitiesInProgress: { type: Number, default: 0 },
    activitiesOverdue: { type: Number, default: 0 },
    
    lastCalculated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LabourProductivitySchema.index({ companyId: 1, labour: 1, month: 1, year: 1 });

export default mongoose.models.LabourProductivity ||
  mongoose.model("LabourProductivity", LabourProductivitySchema);
