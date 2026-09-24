// app/api/sales-invoice/[id]/pdf/route.js
import dbConnect from "@/lib/db";
import SalesInvoice from "@/models/SalesInvoice";
import jwt from "jsonwebtoken";
import { generateInvoiceHtml } from "@/lib/pdf/generateInvoiceHtml";

export const runtime = "nodejs";
export const maxDuration = 30;

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let browserPromise = null;
async function getBrowser() {
    if (!browserPromise) {
        browserPromise = (isServerless
            ? (async () => {
                const chromium = (await import("@sparticuz/chromium")).default;
                const puppeteerCore = (await import("puppeteer-core")).default;
                return puppeteerCore.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(),
                    headless: chromium.headless,
                });
            })()
            : (async () => {
                const puppeteer = (await import("puppeteer")).default;
                return puppeteer.launch({
                    headless: "new",
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                });
            })()
        ).catch((err) => {
            browserPromise = null;
            throw err;
        });
    }
    return browserPromise;
}

function getTokenFromRequest(req) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
    const { searchParams } = new URL(req.url);
    return searchParams.get("token");
}

export async function GET(req, { params }) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            return new Response(JSON.stringify({ success: false, error: "No authentication token" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const { id } = await params;

        await dbConnect();

        // Populate items.item so item.item.itemCode ("ITEM-XXXXX") is available in generateInvoiceHtml
        const invoice = await SalesInvoice.findById(id)
            .populate({
                path: "items.item",
                select: "itemCode itemName",
            })
            .lean();

        if (!invoice) {
            return new Response(JSON.stringify({ success: false, error: "Invoice not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        const html = generateInvoiceHtml(invoice);

        const browser = await getBrowser();
        const page = await browser.newPage();
        try {
            await page.setContent(html, { waitUntil: "networkidle0" });
            const pdfBuffer = await page.pdf({
                format: "A4",
                landscape: true, // Enables wide layout for Supply & Installation columns
                printBackground: true,
                margin: { top: "0", right: "0", bottom: "0", left: "0" }, // Prevents page.pdf margins from interfering with the CSS margins
            });

            const docNumber = invoice.invoiceNumber || invoice.refNumber || "INV-INTERNAL";

            return new Response(pdfBuffer, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="Sales-Invoice-${docNumber}.pdf"`,
                },
            });
        } finally {
            await page.close();
        }
    } catch (err) {
        console.error("PDF generation failed:", err);
        return new Response(JSON.stringify({ success: false, error: "Failed to generate PDF" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}