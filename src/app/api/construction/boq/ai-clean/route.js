import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanySettings from "@/models/CompanySettings";
import { batchCorrectItemsWithClaude } from "@/lib/claudeCorrect";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {   
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const settings = await CompanySettings.findOne({ companyId: user.companyId }).lean();
        const hasKey = Boolean(settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY);

        if (!hasKey) {
            return NextResponse.json(
                { success: false, message: "Anthropic API key is not configured. Please add your key." },
                { status: 400 }
            );
        }

        const { items } = await req.json();
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ success: false, message: "No items found to clean" }, { status: 400 });
        }

        // Chunk size of 15 items per prompt
        const CHUNK_SIZE = 15;
        const allCleanedResults = [];

        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
            const chunk = items.slice(i, i + CHUNK_SIZE);
            const cleanedBatch = await batchCorrectItemsWithClaude(user.companyId, chunk);
            allCleanedResults.push(...cleanedBatch);
        }

        return NextResponse.json({ success: true, data: allCleanedResults });
    } catch (err) {
        console.error("AI clean route error:", err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}