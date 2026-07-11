import mongoose from "mongoose";

const TenderEvaluationSchema = new mongoose.Schema(
  {
    tender: { type: mongoose.Schema.Types.ObjectId, ref: "Tender", required: true },
    bid: { type: mongoose.Schema.Types.ObjectId, ref: "TenderBid", required: true },
    evaluator: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    technicalScore: Number,
    commercialScore: Number,
    remarks: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.TenderEvaluation || mongoose.model("TenderEvaluation", TenderEvaluationSchema);