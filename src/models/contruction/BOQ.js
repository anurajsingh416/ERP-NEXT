import mongoose from "mongoose";

const BOQItemSchema = new mongoose.Schema({

  // ✅ Required – frontend always sends it
  itemName: {
    type: String,

    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  unit: {
    type: String,
    default: "nos",
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  rate: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  section: {
    type: String,
    default: "Other Work",
    trim: true,
  },
  subSection: {
    type: String,
    default: "Main",
    trim: true,
  },
  subSectionIndex: {
    type: Number,
    default: 1,
  },
  isRateOnly: {
    type: Boolean,
    default: false,
  },
  consumedQty: {
    type: Number,
    default: 0,
    min: 0,
  },
  consumedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  type: {
    type: String,
    enum: ["material", "labour", "equipment", "subcontract", "other"],
    default: "material",
  },
});
const MaterialSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",

    default: null,
  },
  itemName: {
    type: String,
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  unit: {
    type: String,
    default: "nos",
    trim: true,
  },  
  rate: {
    type: Number,
    default: 0,
    min: 0,
  },
  amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  section: {
    type: String,
    default: "Other Work",
    trim: true,
  },
  subSection: {
    type: String,
    default: "Main",
    trim: true,
  },
  subSectionIndex: {
    type: Number,
    default: 1,
  },
  isRateOnly: { 
    type: Boolean,
    default: false,

  },
  consumedQty: {
    type: Number, 
    default: 0,
    min: 0,
  },
  consumedAmount: {
    type: Number,
    default: 0, 
    min: 0,
  },
  type: {
    type: String,
    enum: ["material", "labour", "equipment", "subcontract", "other"],  
  default: "material",
  },
});


const BOQSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    boqNumber: { type: String, required: true, trim: true },
    phase: { type: String, enum: ["I", "II", "III", "IV"], default: "I" },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ["draft", "submitted", "approved", "rejected"], default: "draft" },
    remarks: { type: String, trim: true, default: "" },
    items: [BOQItemSchema],
    materials:[MaterialSchema],
    sectionSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    totalAmount: { type: Number, default: 0, min: 0 },
    taxVAT: { type: Number, default: 0, min: 0 },
    taxService: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

BOQSchema.index({ companyId: 1, boqNumber: 1 }, { unique: true });
BOQSchema.index({ companyId: 1, project: 1 });
BOQSchema.index({ companyId: 1, status: 1 });

// ─── Pre‑save hook: recalc amounts and totals ──────────────────────────
BOQSchema.pre("save", function (next) {
  this.items.forEach((item) => {
    if (!item.isRateOnly) {
      item.amount = (item.quantity || 0) * (item.rate || 0);
    } else {
      item.amount = item.rate || 0;
    }
  });

  this.totalAmount = this.items
    .filter((item) => !item.isRateOnly)
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const sectionMap = {};
  this.items
    .filter((item) => !item.isRateOnly)
    .forEach((item) => {
      const sec = item.section || "Other Work";
      sectionMap[sec] = (sectionMap[sec] || 0) + (item.amount || 0);
    });
  this.sectionSummary = sectionMap;

  this.grandTotal =
    (this.totalAmount || 0) + (this.taxVAT || 0) + (this.taxService || 0);

  next();
});

export default mongoose.models.BOQ || mongoose.model("BOQ", BOQSchema);

// import mongoose from "mongoose";

// const BOQItemSchema = new mongoose.Schema({
//   itemId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "InventoryItem",
//     default: null,
//   },
//   itemName: {
//     type: String,
    
//     trim: true,
//   },
//   description: {
//     type: String,
//     trim: true,
//     default: "",
//   },
//   unit: {
//     type: String,
//     default: "nos",
//     trim: true,
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     default: 0,
//     min: 0,
//   },
//   rate: {
//     type: Number,
//     required: true,
//     default: 0,
//     min: 0,
//   },
//   amount: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   section: {
//     type: String,
//     default: "Other Work",
//     trim: true,
//   },
//   // ✅ NEW: sub‑section fields
//   subSection: {
//     type: String,
//     default: "Main",
//     trim: true,
//   },
//   subSectionIndex: {
//     type: Number,
//     default: 1,
//   },
//   // Flag for items that are rate-only (no quantity)
//   isRateOnly: {
//     type: Boolean,
//     default: false,
//   },
// });

// const BOQSchema = new mongoose.Schema(
//   {
//     company: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Company",
//       required: true,
//     },
//     project: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Project",
//       required: true,
//     },
//     contractor: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Supplier",
//       default: null,
//     },
//     boqNumber: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     phase: {
//       type: String,
//       enum: ["I", "II", "III", "IV"],
//       default: "I",
//     },
//     date: {
//       type: Date,
//       default: Date.now,
//     },
//     status: {
//       type: String,
//       enum: ["draft", "submitted", "approved", "rejected"],
//       default: "draft",
//     },
//     remarks: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//     items: {
//       type: [BOQItemSchema],
//       validate: {
//         validator: (items) => Array.isArray(items) && items.length > 0,
//         message: "BOQ must contain at least one item.",
//       },
//     },
//     sectionSummary: {
//       type: mongoose.Schema.Types.Mixed,
//       default: {},
//     },
//     totalAmount: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     taxVAT: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     taxService: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     grandTotal: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "CompanyUser",
//       required: true,
//     },
//     version: {
//       type: Number,
//       default: 1,
//     },
//   },
//   { timestamps: true }
// );

// // ─── Indexes ──────────────────────────────────────────────────────────────
// BOQSchema.index({ company: 1, boqNumber: 1 }, { unique: true });
// BOQSchema.index({ company: 1, project: 1 });
// BOQSchema.index({ company: 1, status: 1 });

// // ─── Pre‑save middleware ────────────────────────────────────────────────
// BOQSchema.pre("save", function (next) {
//   // Recalculate item amounts
//   this.items.forEach((item) => {
//     if (!item.isRateOnly) {
//       const qty = item.quantity || 0;
//       const rate = item.rate || 0;
//       item.amount = qty * rate;
//     } else {
//       item.amount = item.rate || 0;
//     }
//   });

//   // Total amount (excluding rate-only)
//   this.totalAmount = this.items
//     .filter((item) => !item.isRateOnly)
//     .reduce((sum, item) => sum + (item.amount || 0), 0);

//   // Section summary (by section only, sub‑sections are not summarized automatically)
//   const sectionMap = {};
//   this.items
//     .filter((item) => !item.isRateOnly)
//     .forEach((item) => {
//       const sec = item.section || "Other Work";
//       sectionMap[sec] = (sectionMap[sec] || 0) + (item.amount || 0);
//     });
//   this.sectionSummary = sectionMap;

//   // Grand total
//   this.grandTotal =
//     (this.totalAmount || 0) + (this.taxVAT || 0) + (this.taxService || 0);

//   next();
// });

// export default mongoose.models.BOQ || mongoose.model("BOQ", BOQSchema);
