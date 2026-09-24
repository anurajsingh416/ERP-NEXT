import mongoose from "mongoose";

const PurchaseRequestItemSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    uom: { type: String, default: "nos" },
    quantity: { type: Number, required: true },
    weight: { type: Number, default: 0 },
    requiredBy: { type: Date },       // per-line required-by date, as in the reference screens
    remarks: { type: String, default: "" },
});

const PurchaseRequestSchema = new mongoose.Schema(
    {
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

        requestNumber: { type: String, required: true },   // auto-generated, e.g. MAT-MR-2026-00341
        title: { type: String, required: true },            // auto: "Purchase Request for <item>", editable

        purpose: {
            type: String,
            enum: ["Purchase", "Material Transfer", "Material Issue", "Manufacture", "Customer Provided"],
            default: "Purchase",
        },

        transactionDate: { type: Date, default: Date.now, required: true },
        requiredBy: { type: Date },                // header-level required-by (optional, overall)
        priceList: { type: String, default: "Standard Buying" },
        warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },

        items: { type: [PurchaseRequestItemSchema], required: true, validate: v => v.length > 0 },

        status: {
            type: String,
            enum: ["Draft", "Pending", "Quoted", "Ordered", "Partially Ordered", "Received", "Cancelled"],
            default: "Draft",
        },

        // set true once linked to a Purchase Quotation/RFQ later — kept here so this doc
        // is ready to be referenced instead of duplicating fields when RFQ gets built
        linkedQuotationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseQuotation" }],

        remarks: { type: String, default: "" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    },
    { timestamps: true }
);

PurchaseRequestSchema.index({ companyId: 1, requestNumber: 1 }, { unique: true });
PurchaseRequestSchema.index({ companyId: 1, status: 1 });
PurchaseRequestSchema.index({ companyId: 1, title: "text" });

export default mongoose.models.PurchaseRequest ||
    mongoose.model("PurchaseRequest", PurchaseRequestSchema);