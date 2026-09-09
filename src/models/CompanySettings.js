import mongoose from "mongoose";

const CompanySettingsSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            unique: true,
        },
        anthropicApiKey: {
            type: String,
            default: "",
            trim: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CompanyUser",
        },
    },
    { timestamps: true }
);

export default mongoose.models.CompanySettings ||
    mongoose.model("CompanySettings", CompanySettingsSchema);