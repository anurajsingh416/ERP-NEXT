// lib/pdf/generateInvoiceHtml.js
//
// Generates a complete, self-contained A4 Sales Invoice HTML document.
// Intended for Puppeteer / Chromium PDF generation with BOQ multi-column layout.

const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const formatNumber = (value, decimals = 2) => {
    const number = Number(value || 0);
    return number.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

const esc = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// ──────────────────────────────────────────────────────────────
// Supply / Installation BOQ Merging Logic
// ──────────────────────────────────────────────────────────────
const SUPPLY_INSTALL_SUFFIX = /^(.*?)\s*[\(\[]\s*(Supply|Installation)\s*[\)\]]$/i;

const normalizeStr = (str = '') => {
    return str
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
};

const hasBoqReferenceData = (items = []) => items.some((it) => it.boqReference?.generatedFromBOQ);

const groupInvoiceItemsByBoq = (items = []) => {
    const groups = [];
    const groupIndexByKey = {};

    items.forEach((item) => {
        const ref = item.boqReference || {};
        const key = ref.generatedFromBOQ
            ? `${ref.boqItemCode || ''}::${ref.boqItemName || ''}`
            : `__standalone__${groups.length}`;

        if (ref.generatedFromBOQ && groupIndexByKey[key] !== undefined) {
            groups[groupIndexByKey[key]].lines.push(item);
        } else {
            groups.push({
                boqItemCode: ref.boqItemCode || '',
                boqItemName: ref.boqItemName || item.itemName || '',
                lines: [item],
            });
            if (ref.generatedFromBOQ) groupIndexByKey[key] = groups.length - 1;
        }
    });

    return groups;
};

const groupInvoiceItemsLegacy = (items = []) => {
    const groups = [];
    const groupIndexByKey = {};

    items.forEach((item) => {
        const rawName = normalizeStr(item.itemName || item.item?.itemName || '');
        const match = rawName.match(SUPPLY_INSTALL_SUFFIX);

        const baseName = match ? match[1].trim() : rawName;
        const label = match ? match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase() : null;
        const code = item.item?.itemCode || item.itemCode || '';

        const key = label ? `${code}::${baseName.toLowerCase()}` : `__standalone__${groups.length}`;

        if (label && groupIndexByKey[key] !== undefined) {
            groups[groupIndexByKey[key]].lines.push({ ...item, _label: label });
        } else {
            groups.push({ key, baseName, code, lines: [{ ...item, _label: label }] });
            if (label) groupIndexByKey[key] = groups.length - 1;
        }
    });

    return groups;
};

// ── Row renderers for the boqReference-based (new) layout ──
const renderBoqGroupHeaderRow = (group) => {
    if (!group.boqItemCode) return "";
    const subtotal = group.lines.reduce((s, l) => s + Number(l.totalAmount || 0), 0);
    return `
        <tr class="group-header">
            <td class="center serial">${esc(group.boqItemCode)}</td>
            <td colspan="7" class="item-name" style="font-weight:800">${esc(group.boqItemName)}</td>
            <td class="right font-bold">${formatCurrency(subtotal)}</td>
        </tr>
    `;
};

const renderBoqLineRow = (item) => {
    const srNo = item.boqReference?.boqSrNo || "—";
    const name = esc(item.itemName || item.item?.itemName || "");
    const showDescription = item.itemDescription && item.itemDescription !== item.itemName;
    const unit = esc(item.unit || "Nos.");
    const qty = Number(item.quantity || 0);

    const rateSupply = Number(item.unitRateSupply || 0);
    const rateInstall = Number(item.unitRateInstallation || 0);
    const amtSupply = Number(item.amountSupply || 0);
    const amtInstall = Number(item.amountInstallation || 0);
    const totalAmount = Number(item.totalAmount || 0);

    return `
        <tr class="item-row">
            <td class="center serial">${esc(srNo)}</td>
            <td class="item-cell">
                <div class="item-name">${name}</div>
                ${showDescription ? `<div class="item-code" style="color:#6b7280;font-family:inherit;font-weight:normal">${esc(item.itemDescription)}</div>` : ""}
            </td>
            <td class="center">${unit}</td>
            <td class="center font-bold">${formatNumber(qty, 0)}</td>
            <td class="right">${rateSupply > 0 ? formatCurrency(rateSupply) : "—"}</td>
            <td class="right">${rateInstall > 0 ? formatCurrency(rateInstall) : "—"}</td>
            <td class="right">${amtSupply > 0 ? formatCurrency(amtSupply) : "—"}</td>
            <td class="right">${amtInstall > 0 ? formatCurrency(amtInstall) : "—"}</td>
            <td class="right font-bold total-col">${formatCurrency(totalAmount)}</td>
        </tr>
    `;
};

// ── Row renderers for the legacy (pre-boqReference) layout — unchanged behavior ──
const renderLegacyGroupRows = (group, index) => {
    const isGrouped = group.lines.length > 1;
    const catalogCode = esc(group.code);
    const name = esc(group.baseName);

    if (isGrouped) {
        const supplyLine = group.lines.find((l) => l._label === "Supply") || {};
        const installLine = group.lines.find((l) => l._label === "Installation") || {};

        const qty = supplyLine.quantity || installLine.quantity || 0;
        const unit = esc(supplyLine.unit || installLine.unit || "Nos.");

        const rateSupply = Number(supplyLine.unitPrice || 0);
        const rateInstall = Number(installLine.unitPrice || 0);
        const amtSupply = Number(supplyLine.totalAmount || 0);
        const amtInstall = Number(installLine.totalAmount || 0);
        const totalAmount = amtSupply + amtInstall;

        return `
            <tr class="item-row">
                <td class="center serial">${index + 1}</td>
                <td class="item-cell">
                    <div class="item-name">${name}</div>
                    ${catalogCode ? `<div class="item-code">${catalogCode}</div>` : ""}
                </td>
                <td class="center">${unit}</td>
                <td class="center font-bold">${formatNumber(qty, 0)}</td>
                <td class="right">${formatCurrency(rateSupply)}</td>
                <td class="right">${formatCurrency(rateInstall)}</td>
                <td class="right">${formatCurrency(amtSupply)}</td>
                <td class="right">${formatCurrency(amtInstall)}</td>
                <td class="right font-bold total-col">${formatCurrency(totalAmount)}</td>
            </tr>
        `;
    }

    const item = group.lines[0];
    const qty = Number(item?.quantity || 0);
    const unit = esc(item?.unit || "Nos.");
    const unitPrice = Number(item?.unitPrice || 0);
    const totalAmount = Number(item?.totalAmount || 0);
    const isSupplyOnly = item._label === "Supply";
    const isInstallOnly = item._label === "Installation";

    return `
        <tr class="item-row">
            <td class="center serial">${index + 1}</td>
            <td class="item-cell">
                <div class="item-name">${name}</div>
                ${catalogCode ? `<div class="item-code">${catalogCode}</div>` : ""}
                ${item?.variant?.sku ? `<div class="variant">Variant: ${esc(item.variant.sku)}</div>` : ""}
            </td>
            <td class="center">${unit}</td>
            <td class="center font-bold">${formatNumber(qty, 0)}</td>
            <td class="right">${isInstallOnly ? "—" : formatCurrency(unitPrice)}</td>
            <td class="right">${isSupplyOnly ? "—" : (isInstallOnly ? formatCurrency(unitPrice) : "—")}</td>
            <td class="right">${isInstallOnly ? "—" : formatCurrency(totalAmount)}</td>
            <td class="right">${isSupplyOnly ? "—" : (isInstallOnly ? formatCurrency(totalAmount) : "—")}</td>
            <td class="right font-bold total-col">${formatCurrency(totalAmount)}</td>
        </tr>
    `;
};

const renderItemsTable = (items = []) => {
    if (!items.length) {
        return `
            <tr>
                <td colspan="9" class="center" style="padding:20px;color:#9ca3af">
                    No items found
                </td>
            </tr>
        `;
    }

    if (hasBoqReferenceData(items)) {
        const groups = groupInvoiceItemsByBoq(items);
        return groups
            .map((group) => renderBoqGroupHeaderRow(group) + group.lines.map(renderBoqLineRow).join(""))
            .join("");
    }

    const groups = groupInvoiceItemsLegacy(items);
    return groups.map((group, index) => renderLegacyGroupRows(group, index)).join("");
};
const renderAddress = (address) => {
    if (!address) return `<div class="muted">No address on file</div>`;

    const parts = [];
    if (address.address1) parts.push(esc(address.address1));
    if (address.address2) parts.push(esc(address.address2));

    const cityState = [address.city, address.state].filter(Boolean).map(esc).join(", ");
    if (cityState || address.zip) {
        parts.push(`${cityState}${address.zip ? ` - ${esc(address.zip)}` : ""}`);
    }
    if (address.country) parts.push(esc(address.country));

    if (!parts.length) return `<div class="muted">No address on file</div>`;

    return `<div class="address">${parts.join("<br />")}</div>`;
};


const renderPaymentRow = (payment) => {
    return `
        <tr>
            <td>${esc(payment?.method || "Payment")}</td>
            <td>${formatDate(payment?.paymentDate)}</td>
            <td>${esc(payment?.transactionId || "—")}</td>
            <td class="right"><strong>${formatCurrency(payment?.amount)}</strong></td>
        </tr>
    `;
};

const renderTaxSummary = (invoice) => {
    const items = invoice?.items || [];
    const hasIGST = items.some(item => item?.taxOption === "IGST" && Number(item?.igstAmount || 0) > 0);

    if (hasIGST) {
        const igstAmount = items.reduce((sum, item) => sum + Number(item?.igstAmount || 0), 0);
        const igstRate = items.reduce((sum, item) => sum + Number(item?.igstRate || item?.gstRate || 0), 0) /
            Math.max(items.filter(item => item?.taxOption === "IGST").length, 1);

        return `
            <div class="tax-summary">
                <div class="tax-summary-title">TAX SUMMARY</div>
                <table>
                    <thead>
                        <tr>
                            <th>Tax Type</th>
                            <th class="right">Rate</th>
                            <th class="right">Tax Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>IGST</td>
                            <td class="right">${formatNumber(igstRate, 2)}%</td>
                            <td class="right">${formatCurrency(igstAmount)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    const cgst = items.reduce((sum, item) => sum + Number(item?.cgstAmount || 0), 0);
    const sgst = items.reduce((sum, item) => sum + Number(item?.sgstAmount || 0), 0);

    if (cgst === 0 && sgst === 0) return "";

    return `
        <div class="tax-summary">
            <div class="tax-summary-title">TAX SUMMARY</div>
            <table>
                <thead>
                    <tr>
                        <th>Tax Type</th>
                        <th class="right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>CGST</td>
                        <td class="right">${formatCurrency(cgst)}</td>
                    </tr>
                    <tr>
                        <td>SGST</td>
                        <td class="right">${formatCurrency(sgst)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
};

export function generateInvoiceHtml(invoice) {
    const docNumber = esc(invoice?.invoiceNumber || invoice?.refNumber || "INV-INTERNAL");
    const customerName = esc(invoice?.customerName || "—");

    const isPaid = invoice?.paymentStatus === "Paid" || Number(invoice?.openBalance || 0) === 0;
    const paymentStatus = isPaid ? "PAID" : invoice?.paymentStatus === "Partial" ? "PARTIAL" : "DUE";
    const paymentStatusClass = isPaid ? "paid" : paymentStatus === "PARTIAL" ? "partial" : "due";

    const payments = invoice?.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + Number(p?.amount || 0), 0) || Number(invoice?.paidAmount || 0);

    const openBalance = Number(invoice?.openBalance || 0);
    const grandTotal = Number(invoice?.grandTotal || 0);
    const subtotal = Number(invoice?.totalBeforeDiscount || 0);
    const gstTotal = Number(invoice?.gstTotal || 0);
    const freight = Number(invoice?.freight || 0);
    const rounding = Number(invoice?.rounding || 0);
    const downPayment = Number(invoice?.totalDownPayment || 0);

    const itemsRowsHtml = renderItemsTable(invoice?.items || []);
    const paymentRowsHtml = payments.map(renderPaymentRow).join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sales Invoice ${docNumber}</title>
    <style>
        @page {
            size: A4 landscape; /* Set to landscape to properly fit the wide BOQ columns */
            margin: 0;
        }
        * {
            box-sizing: border-box;
        }
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            background: #ffffff;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            font-size: 9.5px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page {
            width: 297mm;
            min-height: 210mm;
            padding: 12mm 14mm 10mm 14mm;
            position: relative;
            background: #ffffff;
        }

        /* HEADER */
        .invoice-header {
            display: table;
            width: 100%;
            border-bottom: 2px solid #111827;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .company-section, .invoice-title-section {
            display: table-cell;
            vertical-align: top;
        }
        .company-section { width: 60%; }
        .invoice-title-section { width: 40%; text-align: right; }
        .company-name {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            margin: 0 0 2px;
        }
        .company-subtitle {
            font-size: 8.5px;
            color: #6b7280;
            margin: 0;
            line-height: 1.4;
        }
        .invoice-title {
            font-size: 21px;
            font-weight: 800;
            margin: 0;
            color: #111827;
            letter-spacing: 0.3px;
        }
        .invoice-type {
            font-size: 8.5px;
            color: #6b7280;
            margin-top: 2px;
        }

        /* DOCUMENT INFORMATION */
        .document-info {
            width: 100%;
            border: 1px solid #d1d5db;
            margin-bottom: 12px;
        }
        .document-info table {
            width: 100%;
            border-collapse: collapse;
        }
        .document-info td {
            width: 25%;
            padding: 6px 10px;
            border-right: 1px solid #e5e7eb;
        }
        .document-info td:last-child {
            border-right: none;
        }
        .info-label {
            display: block;
            font-size: 6.5px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 2px;
        }
        .info-value {
            font-size: 9.5px;
            font-weight: 700;
            color: #111827;
        }

        /* CUSTOMER SECTION */
        .section-title {
            font-size: 7.5px;
            font-weight: 800;
            color: #374151;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 5px;
        }
        .customer-grid {
            display: table;
            width: 100%;
            margin-bottom: 12px;
        }
        .customer-box {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            border: 1px solid #d1d5db;
            padding: 8px 10px;
        }
        .customer-box + .customer-box {
            border-left: none;
        }
        .customer-name {
            font-size: 11px;
            font-weight: 800;
            margin-bottom: 3px;
        }
        .customer-detail {
            font-size: 8.5px;
            color: #4b5563;
            line-height: 1.4;
        }
        .address {
            font-size: 8.5px;
            line-height: 1.4;
            color: #374151;
        }
        .muted { color: #9ca3af; }

        /* ITEMS TABLE */
        .items-section { margin-top: 4px; }
        table.items {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 14px;
        }
        table.items thead { display: table-header-group; }
        table.items thead tr {
            background: #f8fafc;
            color: #374151;
        }
        table.items th {
            padding: 6px 5px;
            font-size: 7px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            border: 1px solid #d1d5db;
            text-align: center;
        }
        table.items td {
            padding: 6px 5px;
            vertical-align: middle;
            border: 1px solid #e5e7eb;
            font-size: 8px;
        }
        .serial { width: 35px; }
        .item-cell { 
            width: 34%; 
            text-align: left;
        }
        .item-name {
            font-size: 8px;
            font-weight: 500;
            color: #111827;
            line-height: 1.35;
        }
        .item-code {
            font-size: 7px;
            color: #4f46e5;
            font-family: monospace;
            font-weight: bold;
            margin-top: 2px;
        }
        .total-col {
            background-color: #fcfcfd;
        }
            .group-header td {
    background: #eef2ff;
    border-top: 2px solid #c7d2fe;
    padding-top: 7px;
    padding-bottom: 7px;
}
        .center { text-align: center; }
        .right { text-align: right; }
        .font-bold { font-weight: bold; }

        /* LOWER SECTION */
        .lower-section {
            display: table;
            width: 100%;
            margin-top: 4px;
        }
        .lower-left, .lower-right {
            display: table-cell;
            vertical-align: top;
        }
        .lower-left {
            width: 55%;
            padding-right: 20px;
        }
        .lower-right { width: 45%; }

        /* TAX SUMMARY */
        .tax-summary {
            border: 1px solid #d1d5db;
            margin-bottom: 12px;
        }
        .tax-summary-title {
            padding: 5px 8px;
            background: #f3f4f6;
            font-size: 7.5px;
            font-weight: 800;
            letter-spacing: 0.7px;
        }
        .tax-summary table {
            width: 100%;
            border-collapse: collapse;
        }
        .tax-summary th, .tax-summary td {
            padding: 5px 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 7.5px;
        }
        .tax-summary th {
            font-size: 6.5px;
            color: #6b7280;
            text-transform: uppercase;
        }

        /* TOTALS BOX */
        .totals-box {
            width: 100%;
            border: 1px solid #d1d5db;
        }
        .total-row {
            display: table;
            width: 100%;
            padding: 6px 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        .total-label, .total-value {
            display: table-cell;
            font-size: 8.5px;
        }
        .total-value {
            text-align: right;
            font-weight: 600;
        }
        .grand-total {
            display: table;
            width: 100%;
            padding: 9px 10px;
            background: #111827;
            color: #ffffff;
        }
        .grand-total-label, .grand-total-value {
            display: table-cell;
            font-size: 11px;
            font-weight: 800;
        }
        .grand-total-value { text-align: right; }
        .paid-row { color: #059669; }
        .balance-row { color: #dc2626; }

        /* PAYMENT STATUS */
        .status-box {
            border: 1px solid #d1d5db;
            padding: 8px;
            margin-bottom: 12px;
        }
        .status-line { display: table; width: 100%; }
        .status-left, .status-right {
            display: table-cell;
            vertical-align: middle;
        }
        .status-right { text-align: right; }
        .status-label {
            font-size: 6.5px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 2px;
        }
        .status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: 800;
        }
        .status.paid { background: #dcfce7; color: #166534; }
        .status.partial { background: #fef3c7; color: #92400e; }
        .status.due { background: #fee2e2; color: #991b1b; }
        .employee { font-size: 8.5px; font-weight: 700; }

        /* PAYMENT HISTORY */
        .payment-history { margin-top: 12px; margin-bottom: 12px; }
        .payment-history table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d1d5db;
        }
        .payment-history th, .payment-history td {
            padding: 5px 8px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 7.5px;
        }
        .payment-history th {
            background: #f3f4f6;
            font-size: 6.5px;
            text-transform: uppercase;
            color: #6b7280;
            text-align: left;
        }
        .payment-history tr:last-child td { border-bottom: none; }

        /* REMARKS */
        .remarks {
            margin-top: 12px;
            border: 1px solid #d1d5db;
            padding: 8px;
            page-break-inside: avoid;
        }
        .remarks-text {
            font-size: 8px;
            line-height: 1.4;
            color: #374151;
            white-space: pre-wrap;
        }

        /* FOOTER */
        .footer {
            border-top: 1px solid #d1d5db;
            margin-top: 18px;
            padding-top: 8px;
            display: table;
            width: 100%;
        }
        .footer-left, .footer-right {
            display: table-cell;
            vertical-align: top;
            font-size: 7px;
            color: #6b7280;
        }
        .footer-right { text-align: right; }
        .footer-title {
            font-size: 7.5px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 2px;
        }
        .computer-generated {
            margin-top: 6px;
            text-align: center;
            font-size: 6.5px;
            color: #9ca3af;
        }

        @media print {
            body { margin: 0; padding: 0; }
            .page { margin: 0; }
            .items-section { page-break-before: auto; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
<div class="page">
    <!-- HEADER -->
    <div class="invoice-header">
        <div class="company-section">
            <div class="company-name">ERP Exprees</div>
            <p class="company-subtitle">Sales &amp; Services</p>
            <p class="company-subtitle">Tax Invoice</p>
        </div>
        <div class="invoice-title-section">
            <h1 class="invoice-title">TAX INVOICE</h1>
            <div class="invoice-type">Original for Recipient</div>
        </div>
    </div>

    <!-- DOCUMENT INFO -->
    <div class="document-info">
        <table>
            <tr>
                <td>
                    <span class="info-label">Invoice Number</span>
                    <span class="info-value">${docNumber}</span>
                </td>
                <td>
                    <span class="info-label">Invoice Date</span>
                    <span class="info-value">${formatDate(invoice?.invoiceDate)}</span>
                </td>
                <td>
                    <span class="info-label">Due Date</span>
                    <span class="info-value">${formatDate(invoice?.dueDate)}</span>
                </td>
                <td>
                    <span class="info-label">Reference</span>
                    <span class="info-value">${esc(invoice?.refNumber || "—")}</span>
                </td>
            </tr>
        </table>
    </div>

    <!-- CUSTOMER + BILLING -->
    <div class="customer-grid">
        <div class="customer-box">
            <div class="section-title">Bill To</div>
            <div class="customer-name">${customerName}</div>
            ${invoice?.customerCode ? `<div class="customer-detail">Customer Code: ${esc(invoice.customerCode)}</div>` : ""}
            ${invoice?.contactPerson ? `<div class="customer-detail">Contact Person: ${esc(invoice.contactPerson)}</div>` : ""}
            ${invoice?.billingAddress ? `<div style="margin-top:5px">${renderAddress(invoice.billingAddress)}</div>` : ""}
        </div>
        <div class="customer-box">
            <div class="section-title">Ship To</div>
            ${invoice?.shippingAddress ? renderAddress(invoice.shippingAddress) : `<div class="muted">Same as billing address</div>`}
            ${invoice?.salesEmployee ? `
                <div style="margin-top:8px">
                    <span class="info-label">Sales Employee</span>
                    <span class="info-value">${esc(invoice.salesEmployee)}</span>
                </div>
            ` : ""}
        </div>
    </div>

    <!-- BOQ ITEMS TABLE -->
    <div class="items-section">
        <div class="section-title">Itemized Statement</div>
        <table class="items">
            <thead>
                <tr>
                    <th style="width:35px">SR. NO.</th>
                    <th style="width:34%; text-align:left">DESCRIPTION</th>
                    <th style="width:40px">UNIT</th>
                    <th style="width:40px">QTY</th>
                    <th style="width:70px">RATE<br/>(SUPPLY)</th>
                    <th style="width:70px">RATE<br/>(INSTALL)</th>
                    <th style="width:80px">AMT<br/>(SUPPLY)</th>
                    <th style="width:80px">AMT<br/>(INSTALL)</th>
                    <th style="width:90px">TOTAL<br/>AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRowsHtml}
            </tbody>
        </table>
    </div>

    <!-- LOWER SECTION -->
    <div class="lower-section">
        <div class="lower-left">
            ${renderTaxSummary(invoice)}
            ${invoice?.remarks ? `
                <div class="remarks">
                    <div class="section-title">Notes / Special Instructions</div>
                    <div class="remarks-text">${esc(invoice.remarks)}</div>
                </div>
            ` : ""}
        </div>

        <div class="lower-right">
            <div class="totals-box">
                <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value">${formatCurrency(subtotal)}</span>
                </div>
                ${freight > 0 ? `
                    <div class="total-row">
                        <span class="total-label">Freight</span>
                        <span class="total-value">${formatCurrency(freight)}</span>
                    </div>
                ` : ""}
                <div class="total-row">
                    <span class="total-label">GST</span>
                    <span class="total-value">${formatCurrency(gstTotal)}</span>
                </div>
                ${rounding !== 0 ? `
                    <div class="total-row">
                        <span class="total-label">Rounding</span>
                        <span class="total-value">${formatCurrency(rounding)}</span>
                    </div>
                ` : ""}
                ${downPayment > 0 ? `
                    <div class="total-row">
                        <span class="total-label">Down Payment</span>
                        <span class="total-value">${formatCurrency(downPayment)}</span>
                    </div>
                ` : ""}
                <div class="grand-total">
                    <span class="grand-total-label">GRAND TOTAL</span>
                    <span class="grand-total-value">${formatCurrency(grandTotal)}</span>
                </div>
                ${totalPaid > 0 ? `
                    <div class="total-row paid-row">
                        <span class="total-label">Total Paid</span>
                        <span class="total-value">${formatCurrency(totalPaid)}</span>
                    </div>
                ` : ""}
                ${openBalance > 0 ? `
                    <div class="total-row balance-row">
                        <span class="total-label">Balance Due</span>
                        <span class="total-value">${formatCurrency(openBalance)}</span>
                    </div>
                ` : ""}
            </div>
        </div>
    </div>

    <!-- PAYMENT STATUS -->
    <div class="status-box">
        <div class="status-line">
            <div class="status-left">
                <div class="status-label">Payment Status</div>
                <span class="status ${paymentStatusClass}">${paymentStatus}</span>
            </div>
            ${invoice?.salesEmployee ? `
                <div class="status-right">
                    <div class="status-label">Sales Employee</div>
                    <div class="employee">${esc(invoice.salesEmployee)}</div>
                </div>
            ` : ""}
        </div>
    </div>

    <!-- PAYMENT HISTORY -->
    ${paymentRowsHtml ? `
        <div class="payment-history">
            <div class="section-title">Payment History</div>
            <table>
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Date</th>
                        <th>Transaction / Reference</th>
                        <th class="right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${paymentRowsHtml}
                </tbody>
            </table>
        </div>
    ` : ""}

    <!-- FOOTER -->
    <div class="footer">
        <div class="footer-left">
            <div class="footer-title">Terms &amp; Conditions</div>
            <div>Goods/services are subject to the agreed terms and conditions.</div>
        </div>
        <div class="footer-right">
            <div class="footer-title">For YOUR COMPANY NAME</div>
            <div>Authorized Signatory</div>
        </div>
    </div>

    <div class="computer-generated">
        This is a computer-generated invoice and does not require a physical signature.
    </div>
</div>
</body>
</html>
    `;
}