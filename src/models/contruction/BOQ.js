// import mongoose from "mongoose";

// const BOQItemSchema = new mongoose.Schema({

//   // ✅ Required – frontend always sends it
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
//   subSection: {
//     type: String,
//     default: "Main",
//     trim: true,
//   },
//   subSectionIndex: {
//     type: Number,
//     default: 1,
//   },
//   isRateOnly: {
//     type: Boolean,
//     default: false,
//   },
//   consumedQty: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   consumedAmount: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   type: {
//     type: String,
//     enum: ["material", "labour", "equipment", "subcontract", "other"],
//     default: "material",
//   },
// });
// const MaterialSchema = new mongoose.Schema({
//   itemId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Item",

//     default: null,
//   },
//   itemName: {
//     type: String,
//   },
//   quantity: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   unit: {
//     type: String,
//     default: "nos",
//     trim: true,
//   },  
//   rate: {
//     type: Number,
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
//   subSection: {
//     type: String,
//     default: "Main",
//     trim: true,
//   },
//   subSectionIndex: {
//     type: Number,
//     default: 1,
//   },
//   isRateOnly: { 
//     type: Boolean,
//     default: false,

//   },
//   consumedQty: {
//     type: Number, 
//     default: 0,
//     min: 0,
//   },
//   consumedAmount: {
//     type: Number,
//     default: 0, 
//     min: 0,
//   },
//   type: {
//     type: String,
//     enum: ["material", "labour", "equipment", "subcontract", "other"],  
//   default: "material",
//   },
// });


// const BOQSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
//     contractor: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
//     customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
//     boqNumber: { type: String, required: true, trim: true },
//     phase: { type: String, enum: ["I", "II", "III", "IV"], default: "I" },
//     date: { type: Date, default: Date.now },
//     status: { type: String, enum: ["draft", "submitted", "approved", "rejected"], default: "draft" },
//     remarks: { type: String, trim: true, default: "" },
//     items: [BOQItemSchema],
//     materials:[MaterialSchema],
//     sectionSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
//     totalAmount: { type: Number, default: 0, min: 0 },
//     taxVAT: { type: Number, default: 0, min: 0 },
//     taxService: { type: Number, default: 0, min: 0 },
//     grandTotal: { type: Number, default: 0, min: 0 },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
//     version: { type: Number, default: 1 },
//   },
//   { timestamps: true }
// );

// BOQSchema.index({ companyId: 1, boqNumber: 1 }, { unique: true });
// BOQSchema.index({ companyId: 1, project: 1 });
// BOQSchema.index({ companyId: 1, status: 1 });

// // ─── Pre‑save hook: recalc amounts and totals ──────────────────────────
// BOQSchema.pre("save", function (next) {
//   this.items.forEach((item) => {
//     if (!item.isRateOnly) {
//       item.amount = (item.quantity || 0) * (item.rate || 0);
//     } else {
//       item.amount = item.rate || 0;
//     }
//   });

//   this.totalAmount = this.items
//     .filter((item) => !item.isRateOnly)
//     .reduce((sum, item) => sum + (item.amount || 0), 0);

//   const sectionMap = {};
//   this.items
//     .filter((item) => !item.isRateOnly)
//     .forEach((item) => {
//       const sec = item.section || "Other Work";
//       sectionMap[sec] = (sectionMap[sec] || 0) + (item.amount || 0);
//     });
//   this.sectionSummary = sectionMap;

//   this.grandTotal =
//     (this.totalAmount || 0) + (this.taxVAT || 0) + (this.taxService || 0);

//   next();
// });

// export default mongoose.models.BOQ || mongoose.model("BOQ", BOQSchema);

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
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DESCRIPTION LINE (Tender child item / Material Line)
// ─────────────────────────────────────────────────────────────────────────────

const BOQLineMaterialSchema = new mongoose.Schema(
  {
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    rawMaterialName: { type: String, trim: true, default: "" },
    quantityPerUnit: { type: Number, default: 1 },
    uom: { type: String, trim: true, default: "nos" },
    unitRate: { type: Number, default: 0 },
    notes: { type: String, trim: true },

    // ── NEW: hierarchy fields for multi-tier BOM (Sheet2) ──
    componentCode: { type: String, trim: true, default: "" },   // e.g. "SUB-1000.1-A", "RM-VCB-01"
    parentLink: { type: String, trim: true, default: "" },      // e.g. "1000.1" or "SUB-1000.1-A"
    classification: {
      type: String,
      enum: ["Raw Material", "Sub-Assembly (FG)"],
      default: "Raw Material",
    },
    sourcingChannel: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const BOQDescriptionLineSchema = new mongoose.Schema(
  {
    // Item Master reference for line-level catalog linking
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    isAdHoc: {
      type: Boolean,
      default: false,
    },

    srNo: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      required: true,
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
      default: 0,
      min: 0,
    },

    unitRateSupply: {
      type: Number,
      default: 0,
      min: 0,
    },

    unitRateInstallation: {
      type: Number,
      default: 0,
      min: 0,
    },

    amountSupply: {
      type: Number,
      default: 0,
      min: 0,
    },

    amountInstallation: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Both aliases supported so UI and calculations never mismatch
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isRateOnly: {
      type: Boolean,
      default: false,
    },

    // Raw material requirements breakdown for this specific line item
    materials: {
      type: [BOQLineMaterialSchema],
      default: [],
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. PARENT BOQ ITEM (Section / Parent Grouping Header)
// ─────────────────────────────────────────────────────────────────────────────

const BOQItemSchema = new mongoose.Schema(
  {
    // Optional Item Master reference (null when acting purely as section header)
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    // Excel parent number: 1000, 1100, 1800, etc.
    itemSerialNo: {
      type: String,
      trim: true,
      default: "",
    },
    itemCode: {
      type: String,
      trim: true,
      default: "",
    },

    // Section name or parent group title
    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    section: {
      type: String,
      default: "Other Work",
      trim: true,
    },

    // General scope / technical specification block (e.g., 1800 narrative)
    sectionSpecification: {
      type: String,
      default: "",
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

    // All detailed tender description lines under this parent
    descriptions: {
      type: [BOQDescriptionLineSchema],
      validate: {
        validator: (lines) => Array.isArray(lines) && lines.length > 0,
        message: "Each item must have at least one description line.",
      },
    },

    itemTotalSupply: {
      type: Number,
      default: 0,
      min: 0,
    },

    itemTotalInstallation: {
      type: Number,
      default: 0,
      min: 0,
    },

    itemTotalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. GLOBAL MATERIALS / CONSUMABLES
// ─────────────────────────────────────────────────────────────────────────────

const MaterialSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    itemName: {
      type: String,
      trim: true,
      default: "",
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
  },
  { _id: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN BOQ SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const BOQSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
      default: null,
    },

    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    boqNumber: {
      type: String,
      required: true,
      trim: true,
    },

    phase: {
      type: String,
      enum: ["I", "II", "III", "IV"],
      default: "I",
    },

    date: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    items: {
      type: [BOQItemSchema],
      default: [],
    },

    materials: {
      type: [MaterialSchema],
      default: [],
    },

    sectionSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxVAT: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxService: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
    },

    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

BOQSchema.index({ companyId: 1, boqNumber: 1 }, { unique: true });
BOQSchema.index({ companyId: 1, project: 1 });
BOQSchema.index({ companyId: 1, status: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// PRE-SAVE CALCULATION HOOK
// ─────────────────────────────────────────────────────────────────────────────

BOQSchema.pre("save", function () {
  let overallTotal = 0;
  const sectionMap = {};

  // ── 1. Parent Items & Detailed Descriptions ──
  if (Array.isArray(this.items)) {
    this.items.forEach((item) => {
      let supplyTotal = 0;
      let installationTotal = 0;
      let itemTotal = 0;

      if (Array.isArray(item.descriptions)) {
        item.descriptions.forEach((desc) => {
          const qty = Number(desc.quantity || 0);
          const supplyRate = Number(desc.unitRateSupply || 0);
          const installationRate = Number(desc.unitRateInstallation || 0);

          if (desc.isRateOnly) {
            desc.amountSupply = supplyRate;
            desc.amountInstallation = installationRate;
          } else {
            desc.amountSupply = qty * supplyRate;
            desc.amountInstallation = qty * installationRate;
          }

          const lineTotal = desc.amountSupply + desc.amountInstallation;
          desc.amount = lineTotal;
          desc.totalAmount = lineTotal;

          supplyTotal += desc.amountSupply;
          installationTotal += desc.amountInstallation;
          itemTotal += lineTotal;
        });
      }

      item.itemTotalSupply = supplyTotal;
      item.itemTotalInstallation = installationTotal;
      item.itemTotalAmount = itemTotal;

      overallTotal += itemTotal;

      const section = item.section || "Other Work";
      sectionMap[section] = (sectionMap[section] || 0) + itemTotal;
    });
  }

  // ── 2. Materials ──
  let materialsTotal = 0;
  if (Array.isArray(this.materials)) {
    this.materials.forEach((material) => {
      if (material.isRateOnly) {
        material.amount = Number(material.rate || 0);
      } else {
        material.amount = Number(material.quantity || 0) * Number(material.rate || 0);
      }
      materialsTotal += material.amount || 0;
    });
  }

  // ── 3. Final Summaries & Taxes ──
  this.totalAmount = overallTotal + materialsTotal;
  this.sectionSummary = sectionMap;

  this.grandTotal =
    (this.totalAmount || 0) +
    (this.taxVAT || 0) +
    (this.taxService || 0);
});

export default mongoose.models.BOQ || mongoose.model("BOQ", BOQSchema);