// app/api/items/drop-collection/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ⚠️ TEMPORARY — DEMO ONLY. Remove this entire route file before production.
const DEMO_RESET_CODE = "0000";

export async function DELETE(req) {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) {
        return NextResponse.json({ success: false, message: "Token missing" }, { status: 401 });
    }

    let user;
    try {
        user = await verifyJWT(token);
        if (!user) throw new Error();
    } catch {
        return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const { code } = await req.json();
    if (code !== DEMO_RESET_CODE) {
        return NextResponse.json({ success: false, message: "Incorrect reset code" }, { status: 403 });
    }

    const targetCompanyId = user.companyId || user.company || user._id;

    // Scoped to this company only — never drops the whole global collection
    const result = await Item.deleteMany({ companyId: targetCompanyId });

    return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} items for this company.`,
        deletedCount: result.deletedCount,
    });
}