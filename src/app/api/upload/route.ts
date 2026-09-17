import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "AGENCY_ADMIN", "AGENT"];

export const dynamic = "force-dynamic";

/**
 * POST /api/upload
 * Accepts a multipart file, converts it to a base64 data URL, and returns it.
 * The base64 URL is then stored in PropertyMedia.url directly in the database.
 * This approach avoids needing a cloud storage service and works on Vercel.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Enforce 5MB limit on raw file
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Please use an image under 5MB." },
        { status: 413 }
      );
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ success: true, url: dataUrl }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json(
      { error: "Failed to process file", details: error.message },
      { status: 500 }
    );
  }
}
