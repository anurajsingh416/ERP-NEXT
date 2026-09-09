// import mongoose from "mongoose";

// const QualityCheckSchema = new mongoose.Schema({
//   srNo:      { type: String },
//   parameter: { type: String },
//   min:       { type: String },
//   max:       { type: String },
// });

// const POSConfigSchema = new mongoose.Schema(
//   {
//     barcode:            { type: String, trim: true },
//     posPrice:           { type: Number },
//     allowDiscount:      { type: Boolean, default: true },
//     maxDiscountPercent: { type: Number, default: 100 },
//     taxableInPOS:       { type: Boolean, default: true },
//     showInPOS:          { type: Boolean, default: true },
//   },
//   { _id: false }
// );

// /**
//  * Variant Schema
//  * Each item can have multiple variants (e.g. size, diameter, grade).
//  * Variant-level `price` overrides the base `salesPrice`.
//  * Variant-level `attributes` is a key→value map (e.g. { Size: "10mm" }).
//  */
// const VariantSchema = new mongoose.Schema(
//   {
//     sku:        { type: String, trim: true },
//     attributes: { type: Map, of: String, default: {} },  // { Size: "10mm", Grade: "Fe500D" }
//     price:      { type: Number },       // overrides base salesPrice if set
//     quantity:   { type: Number, default: 0 },
//     imageUrl:   { type: String },
//     barcode:    { type: String, trim: true },
//     posPrice:   { type: Number },
//   },
//   { _id: true, timestamps: false }
// );

// const ItemSchema = new mongoose.Schema(
//   {
//     // ── Identity ────────────────────────────────────────────────
//     companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
//     itemCode:    { type: String, required: true },
//     serialNumber: { type: String, default: "" },
//     itemName:    { type: String, required: true },
//     description: { type: String },

//     // ── Category & Classification ────────────────────────────────
//     category:  { type: String, required: true },
//     itemGroup: { type: String },   // 📱 Mobile: category display & filter

//     // ── Pricing ─────────────────────────────────────────────────
//     unitPrice:  { type: Number, required: true },
//     salesPrice: { type: Number },  // 📱 Mobile: store-facing selling price
//     mrp:        { type: Number },  // 📱 Mobile: MRP for discount % calculation

//     // ── Units & Measurement ──────────────────────────────────────
//     unit:           { type: String, default: "piece" },  // 📱 Mobile: piece, kg, metre, etc.
//     weightPerPiece: { type: Number },                    // 📱 Mobile: for weight calculator
//     length:         { type: Number },
//     width:          { type: Number },
//     height:         { type: Number },
//     weight:         { type: Number },

//     // ── Stock ────────────────────────────────────────────────────
//     quantity:      { type: Number, default: 0 },
//     stockQuantity: { type: Number, default: 0 },         // 📱 Mobile: current stock count
//     inStock:       { type: Boolean, default: true },     // 📱 Mobile: available for purchase
//     reorderLevel:  { type: Number },
//     leadTime:      { type: Number },

//     // ── Images ──────────────────────────────────────────────────
//     imageUrl: { type: String },
//     images:   [{ type: String }],  // 📱 Mobile: array of image URLs

//     // ── Mobile Store Flags ───────────────────────────────────────
//     isFeatured: { type: Boolean, default: false },  // 📱 Mobile: show in featured carousel

//     // ── Variants ────────────────────────────────────────────────
//     variants:    [VariantSchema],
//     variantType: { type: String },  // 📱 Mobile: axis label e.g. "Size", "Grade", "Diameter"

//     // ── Item Classification ──────────────────────────────────────
//     itemType:       { type: String },
//     uom:            { type: String },
//     managedBy:      { type: String },
//     managedValue:   { type: String },
//     batchNumber:    { type: String },
//     expiryDate:     { type: Date },
//     manufacturer:   { type: String },
//     tags:           [{ type: String }],

//     // ── Workflow Flags ───────────────────────────────────────────
//     gnr:               { type: Boolean, default: false },
//     delivery:          { type: Boolean, default: false },
//     productionProcess: { type: Boolean, default: false },

//     // ── POS ──────────────────────────────────────────────────────
//     posEnabled: { type: Boolean, default: false },
//     posConfig:  { type: POSConfigSchema, default: {} },

//     // ── Quality Checks ───────────────────────────────────────────
//     includeQualityCheck: { type: Boolean, default: false },
//     qualityCheckDetails: [QualityCheckSchema],

//     // ── GST ──────────────────────────────────────────────────────
//     includeGST:  { type: Boolean, default: true },
//     includeIGST: { type: Boolean, default: false },
//     gstCode:     { type: String },
//     gstName:     { type: String },
//     gstRate:     { type: Number },
//     cgstRate:    { type: Number },
//     sgstRate:    { type: Number },
//     igstCode:    { type: String },
//     igstName:    { type: String },
//     igstRate:    { type: Number },

//     // ── Marketplace ───────────────────────────────────────────────
//     vendorId:          { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
//     commissionPercent: { type: Number, default: 0 },
//     isMarketplace:     { type: Boolean, default: false },
//     bookingSlots: [
//       {
//         date:            Date,
//         startTime:       String,
//         endTime:         String,
//         maxBookings:     Number,
//         currentBookings: { type: Number, default: 0 },
//       },
//     ],

//     // ── Status ────────────────────────────────────────────────────
//     status: { type: String, enum: ["active", "inactive"], default: "active" },
//     active: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// // ── Indexes ────────────────────────────────────────────────────────────────
// ItemSchema.index({ companyId: 1, posEnabled: 1, active: 1 });
// ItemSchema.index({ companyId: 1, "posConfig.barcode": 1 });
// ItemSchema.index({ companyId: 1, itemCode: 1 }, { unique: true });       // fast slug lookup
// ItemSchema.index({ companyId: 1, itemGroup: 1, status: 1 });            // category filter
// ItemSchema.index({ companyId: 1, isFeatured: 1, status: 1 });           // featured query

// export default mongoose.models.Item || mongoose.model("Item", ItemSchema);


import mongoose from "mongoose";

// ── Quality & POS Sub-Schemas ──────────────────────────────────────────────
const QualityCheckSchema = new mongoose.Schema({
  srNo: { type: String },
  parameter: { type: String },
  min: { type: String },
  max: { type: String },
});

const POSConfigSchema = new mongoose.Schema(
  {
    barcode: { type: String, trim: true },
    posPrice: { type: Number },
    allowDiscount: { type: Boolean, default: true },
    maxDiscountPercent: { type: Number, default: 100 },
    taxableInPOS: { type: Boolean, default: true },
    showInPOS: { type: Boolean, default: true },
  },
  { _id: false }
);

// ── Variant Schema ─────────────────────────────────────────────────────────
const VariantSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true },
    attributes: { type: Map, of: String, default: {} },
    price: { type: Number },
    quantity: { type: Number, default: 0 },
    imageUrl: { type: String },
    barcode: { type: String, trim: true },
    posPrice: { type: Number },
  },
  { _id: true, timestamps: false }
);

// ── 1. Sub-Schema: Detailed Descriptions (Quantities & Rates from BOQs) ─────
const ItemDescriptionSchema = new mongoose.Schema(
  {
    srNo: {
      type: String,
      trim: true,
      default: "", // e.g. "1001", "1002.1"
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "nos",
    },
    uom: {
      type: String,
      trim: true,
      default: "nos",
    },
    quantity: {
      type: Number,
      default: 0,
    },
    // Unit Rates
    unitRateSupply: {
      type: Number,
      default: 0,
    },
    unitRateInstallation: {
      type: Number,
      default: 0,
    },
    // Calculated Totals
    amountSupply: {
      type: Number,
      default: 0,
    },
    amountInstallation: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    isRateOnly: {
      type: Boolean,
      default: false,
    },
    sourceBOQ: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BOQ",
      default: null,
    },
  },
  { _id: true, timestamps: true }
);

// ── 2. Sub-Schema: Raw Materials / BOM Recipe Requirement ──────────────────
const MaterialRequirementSchema = new mongoose.Schema(
  {
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item", // Links to the raw material's master Item record
      required: true,
    },
    rawMaterialName: {
      type: String,
      trim: true,
    },
    quantityPerUnit: {
      type: Number,
      required: true,
      default: 1,
    },
    unit: {
      type: String,
      trim: true,
      default: "nos",
    },
    uom: {
      type: String,
      trim: true,
      default: "nos",
    },
    unitRateSupply: {
      type: Number,
      default: 0,
    },
    unitRateInstallation: {
      type: Number,
      default: 0,
    },
    unitRate: {
      type: Number,
      default: 0,
    },
    amountSupply: {
      type: Number,
      default: 0,
    },
    amountInstallation: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

// ── 3. Main Item Schema ────────────────────────────────────────────────────
const ItemSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    itemCode: { type: String, required: true },
    serialNumber: { type: String, default: "" }, // Stores Excel section/row serials like 1000, 1100
    itemName: { type: String, required: true },
    description: { type: String, default: "" }, // Primary standard specification / scope

    // ── BOQ Detailed Descriptions & Rates ────────────────────────
    descriptions: [ItemDescriptionSchema],

    // ── BOM / Raw Materials ──────────────────────────────────────
    rawMaterials: [MaterialRequirementSchema],

    // ── Category & Classification ────────────────────────────────
    category: { type: String, default: "" },
    itemGroup: { type: String },

    // ── Direct Unit, Rates & Amount Breakdown ────────────────────
    unit: { type: String, default: "piece" }, // Unit
    uom: { type: String, default: "nos" },
    quantity: { type: Number, default: 0 },       // Qty
    stockQuantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    unitRateSupply: { type: Number, default: 0 },       // Rate (Supply)
    unitRateInstallation: { type: Number, default: 0 },       // Rate (Install)
    amountSupply: { type: Number, default: 0 },       // Amt (Supply)
    amountInstallation: { type: Number, default: 0 },       // Amt (Install)
    totalAmount: { type: Number, default: 0 },       // Total Amount
    isRateOnly: { type: Boolean, default: false },

    // Additional Pricing
    salesPrice: { type: Number },
    mrp: { type: Number },

    // ── Units & Measurement ──────────────────────────────────────
    weightPerPiece: { type: Number },
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    weight: { type: Number },

    // ── Stock ────────────────────────────────────────────────────
    inStock: { type: Boolean, default: true },
    reorderLevel: { type: Number },
    leadTime: { type: Number },

    // ── Images ──────────────────────────────────────────────────
    imageUrl: { type: String },
    images: [{ type: String }],

    // ── Mobile Store Flags ───────────────────────────────────────
    isFeatured: { type: Boolean, default: false },

    // ── Variants ────────────────────────────────────────────────
    variants: [VariantSchema],
    variantType: { type: String },

    // ── Item Classification ──────────────────────────────────────
    itemType: { type: String, default: "Product" }, // "Product", "Service", "Raw Material", "Assembly"
    managedBy: { type: String },
    managedValue: { type: String },
    batchNumber: { type: String },
    expiryDate: { type: Date },
    manufacturer: { type: String },
    tags: [{ type: String }],

    // ── Workflow Flags ───────────────────────────────────────────
    gnr: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },
    productionProcess: { type: Boolean, default: false },

    // ── POS ──────────────────────────────────────────────────────
    posEnabled: { type: Boolean, default: false },
    posConfig: { type: POSConfigSchema, default: {} },

    // ── Quality Checks ───────────────────────────────────────────
    includeQualityCheck: { type: Boolean, default: false },
    qualityCheckDetails: [QualityCheckSchema],

    // ── GST ──────────────────────────────────────────────────────
    includeGST: { type: Boolean, default: true },
    includeIGST: { type: Boolean, default: false },
    gstCode: { type: String },
    gstName: { type: String },
    gstRate: { type: Number },
    cgstRate: { type: Number },
    sgstRate: { type: Number },
    igstCode: { type: String },
    igstName: { type: String },
    igstRate: { type: Number },

    // ── Marketplace ─────────────────────────────────────────────
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    commissionPercent: { type: Number, default: 0 },
    isMarketplace: { type: Boolean, default: false },
    bookingSlots: [
      {
        date: Date,
        startTime: String,
        endTime: String,
        maxBookings: Number,
        currentBookings: { type: Number, default: 0 },
      },
    ],

    // ── Status ──────────────────────────────────────────────────
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Pre-Save Hook for Auto Calculations ────────────────────────────────────
ItemSchema.pre("save", function () {
  const qty = Number(this.quantity || 0);
  const rateSupply = Number(this.unitRateSupply || 0);
  const rateInstall = Number(this.unitRateInstallation || 0);

  if (this.isRateOnly) {
    this.amountSupply = rateSupply;
    this.amountInstallation = rateInstall;
  } else {
    this.amountSupply = qty * rateSupply;
    this.amountInstallation = qty * rateInstall;
  }

  this.totalAmount = this.amountSupply + this.amountInstallation;

  // Fallback: sync unitPrice if unassigned
  if (!this.unitPrice && (rateSupply || rateInstall)) {
    this.unitPrice = rateSupply + rateInstall;
  }
});

// ── Indexes ────────────────────────────────────────────────────────────────
ItemSchema.index({ companyId: 1, posEnabled: 1, active: 1 });
ItemSchema.index({ companyId: 1, "posConfig.barcode": 1 });
ItemSchema.index({ companyId: 1, itemCode: 1 }, { unique: true });
ItemSchema.index({ companyId: 1, itemName: 1, itemType: 1 }); // Deduplication composite index
ItemSchema.index({ companyId: 1, itemGroup: 1, status: 1 });
ItemSchema.index({ companyId: 1, isFeatured: 1, status: 1 });

export default mongoose.models.Item || mongoose.model("Item", ItemSchema);