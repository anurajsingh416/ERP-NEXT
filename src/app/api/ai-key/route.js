import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanySettings from "@/models/CompanySettings";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
    await dbConnect();
    const token = getTokenFromHeader(req);
    const user = await verifyJWT(token);

    if (!user) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const settings = await CompanySettings.findOne({ companyId: user.companyId }).lean();
        const rawKey = settings?.anthropicApiKey || "";

        const maskedKey = rawKey.length > 8
            ? `${rawKey.slice(0, 7)}...${rawKey.slice(-4)}`
            : rawKey ? "configured" : "";

        return NextResponse.json({
            success: true,
            isConfigured: Boolean(rawKey),
            maskedKey,
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    const token = getTokenFromHeader(req);
    const user = await verifyJWT(token);

    if (!user) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { apiKey } = await req.json();
        const cleanKey = (apiKey || "").trim();

        if (cleanKey && !cleanKey.startsWith("sk-ant-")) {
            return NextResponse.json(
                { success: false, message: "Invalid Anthropic API key format. Must start with sk-ant-" },
                { status: 400 }
            );
        }

        await CompanySettings.findOneAndUpdate(
            { companyId: user.companyId },
            { anthropicApiKey: cleanKey, updatedBy: user.id },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            message: "Anthropic API Key saved successfully",
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}