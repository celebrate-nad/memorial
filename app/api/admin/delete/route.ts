import { NextRequest, NextResponse } from "next/server";
import { del, list } from "@vercel/blob";
import { getCurationConfig, saveCurationConfig } from "@/lib/curation";

export async function POST(request: NextRequest) {
  try {
    const { pathname } = await request.json();

    if (!pathname || typeof pathname !== "string") {
      return NextResponse.json(
        { error: "pathname is required" },
        { status: 400 },
      );
    }

    // Find the blob URL for this pathname so we can delete it
    const result = await list({ prefix: pathname, limit: 1 });
    const blob = result.blobs.find((b) => b.pathname === pathname);

    if (!blob) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await del(blob.url);

    // Also remove from curation config if present
    const curation = await getCurationConfig();
    const updated = curation.filter((p) => p !== pathname);
    if (updated.length !== curation.length) {
      await saveCurationConfig(updated);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
