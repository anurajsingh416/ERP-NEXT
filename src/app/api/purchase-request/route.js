import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseRequest from "@/models/PurchaseRequestModel";
import Counter from "@/models/Counter";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ GET - List Purchase Requests (with filters, matching the List View screen)
export async function GET(req) {
    await dbConnect();
    try {
        const token = getTokenFromHeader(req);
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        const decoded = verifyJWT(token);
        if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status");
        const purpose = searchParams.get("purpose");
        const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
        const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 2500);

        const peek = searchParams.get("peekSeries") === "true";
        if (peek) {
            const year = new Date().getFullYear();
            const key = `PurchaseRequest_${decoded.companyId}_${year}`;
            const counter = await Counter.findOne({ id: key, companyId: decoded.companyId });
            const nextSeq = (counter?.seq || 0) + 1;
            const preview = `PR-${year}-${String(nextSeq).padStart(5, "0")}`;
            return NextResponse.json({ success: true, preview });
        }
        if (id) {
            const doc = await PurchaseRequest.findOne({ _id: id, companyId: decoded.companyId }).lean();
            if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
            return NextResponse.json({ success: true, data: doc });
        }

        const query = { companyId: decoded.companyId };
        if (status && status !== "All") query.status = status;
        if (purpose && purpose !== "All") query.purpose = purpose;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { requestNumber: { $regex: search, $options: "i" } },
            ];
        }

        const total = await PurchaseRequest.countDocuments(query);
        const data = await PurchaseRequest.find(query)
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, data, total, page, limit });
    } catch (err) {
        console.error("GET purchase-request error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}

// ✅ POST - Create Purchase Request
export async function POST(req) {
    await dbConnect();
    try {
        const token = getTokenFromHeader(req);
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        const decoded = verifyJWT(token);
        if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });

        const body = await req.json();

        if (!body.items || body.items.length === 0) {
            return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 422 });
        }

        // Auto-generate requestNumber: MAT-MR-YYYY-NNNNN, matching the screenshot series
        const year = new Date().getFullYear();
        const key = `PurchaseRequest_${decoded.companyId}_${year}`;

        let counter, retries = 3;
        while (retries > 0) {
            try {
                counter = await Counter.findOneAndUpdate(
                    { id: key, companyId: decoded.companyId },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                await new Promise((r) => setTimeout(r, 100));
            }
        }
        const paddedSeq = String(counter.seq).padStart(5, "0");
        const requestNumber = `PR-${year}-${paddedSeq}`;

        const title = body.title || `Purchase Request for ${body.items[0]?.itemName || "Materials"}`;

        const doc = await PurchaseRequest.create({
            companyId: decoded.companyId,
            requestNumber,
            title,
            purpose: body.purpose || "Purchase",
            transactionDate: body.transactionDate || new Date(),
            requiredBy: body.requiredBy || undefined,
            priceList: body.priceList || "Standard Buying",
            warehouse: body.warehouse || undefined,
            items: body.items,
            status: body.status || "Draft",
            remarks: body.remarks || "",
            createdBy: decoded.id,
        });

        return NextResponse.json({ success: true, data: doc }, { status: 201 });
    } catch (err) {
        console.error("POST purchase-request error:", err);
        return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
    }
}