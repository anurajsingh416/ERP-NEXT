import mongoose from "mongoose";

const LabourAttendanceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    labour: { type: mongoose.Schema.Types.ObjectId, ref: "Labour", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "holiday"],
      default: "present",
    },
    checkInTime: { type: String }, // e.g., "09:30 AM"
    checkOutTime: { type: String }, // e.g., "06:00 PM"
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

// Ensure one attendance per labour per day per project
LabourAttendanceSchema.index(
  { companyId: 1, labour: 1, date: 1, project: 1 },
  { unique: true }
);

export default mongoose.models.LabourAttendance ||
  mongoose.model("LabourAttendance", LabourAttendanceSchema);
