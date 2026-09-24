import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseRequest from "@/models/PurchaseRequestModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function authCompany(req) {
    const token = getTokenFromHeader(req);
    if (!token) return { error: "Unauthorized", status: 401 };
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return { error: "Invalid company ID", status: 401 };
    return { decoded };
}

export async function GET(req, { params }) {
    await dbConnect();
    const { decoded, error, status } = await authCompany(req);
    if (error) return NextResponse.json({ success: false, error }, { status });

    const doc = await PurchaseRequest.findOne({ _id: params.id, companyId: decoded.companyId }).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
}

export async function PUT(req, { params }) {
    await dbConnect();
    const { decoded, error, status } = await authCompany(req);
    if (error) return NextResponse.json({ success: false, error }, { status });

    const body = await req.json();
    delete body._id;
    delete body.companyId;
    delete body.requestNumber; // never editable after generation

    const doc = await PurchaseRequest.findOneAndUpdate(
        { _id: params.id, companyId: decoded.companyId },
        { ...body, updatedBy: decoded.id },
        { new: true, runValidators: true }
    );
    if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
}

export async function DELETE(req, { params }) {
    await dbConnect();
    const { decoded, error, status } = await authCompany(req);
    if (error) return NextResponse.json({ success: false, error }, { status });

    const doc = await PurchaseRequest.findOneAndDelete({ _id: params.id, companyId: decoded.companyId });
    if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
}