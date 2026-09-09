import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(req, { params }) {
    try {
        const { filename } = await params;

        const sanitizedFilename = path.basename(filename);
        const filePath = path.join(LOCAL_UPLOAD_DIR, sanitizedFilename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, message: "Image not found" }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);

        const ext = path.extname(sanitizedFilename).toLowerCase();
        let contentType = "application/octet-stream";
        if (ext === ".png") contentType = "image/png";
        else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
        else if (ext === ".webp") contentType = "image/webp";
        else if (ext === ".gif") contentType = "image/gif";

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error serving local upload:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}