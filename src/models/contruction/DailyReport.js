import mongoose from "mongoose";

const WorkProgressSchema = new mongoose.Schema({
  activityName: { type: String, required: true },
  floorLocation: { type: String, required: true },
});

const TomorrowPlanSchema = new mongoose.Schema({
  activityName: { type: String, required: true },
  floorLocation: { type: String, required: true },
});

const IssueSchema = new mongoose.Schema({
  description: { type: String, required: true },
});

const ManpowerDetailSchema = new mongoose.Schema({
  contractorName: { type: String, required: true },
  // Labour counts by category
  carpenter: { type: Number, default: 0 },
  fitter: { type: Number, default: 0 },
  mason: { type: Number, default: 0 },
  machineOperator: { type: Number, default: 0 },
  foreman: { type: Number, default: 0 },
  helper: { type: Number, default: 0 },
});

const MaterialStockSchema = new mongoose.Schema({
  materialName: { type: String, required: true }, // could be itemId later
  unit: { type: String, required: true },
  receivedYesterday: { type: Number, default: 0 },
  receivedToday: { type: Number, default: 0 },
  totalReceived: { type: Number, default: 0 },
  consumedYesterday: { type: Number, default: 0 },
  consumedToday: { type: Number, default: 0 },
  totalConsumed: { type: Number, default: 0 },
  stockBalance: { type: Number, default: 0 },
});

const MaterialConsumptionSchema = new mongoose.Schema({
  activityName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  // Material-wise consumption (could be expanded)
  cement: { type: Number, default: 0 },
  steel: { type: Number, default: 0 },
  bricks4: { type: Number, default: 0 },
  bricks6: { type: Number, default: 0 },
});

const DailyReportSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    reportDate: { type: Date, default: Date.now },
    workInProgress: [WorkProgressSchema],
    tomorrowPlan: [TomorrowPlanSchema],
    issues: [IssueSchema],
    manpower: [ManpowerDetailSchema],
    materialStock: [MaterialStockSchema],
    materialConsumption: [MaterialConsumptionSchema],
    siteIncharge: { type: String },
    reviewedBy: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

export default mongoose.models.DailyReport ||
  mongoose.model("DailyReport", DailyReportSchema);