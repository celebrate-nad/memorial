import { NextRequest, NextResponse } from "next/server";
import { del, list } from "@vercel/blob";
import { getMusicOrderConfig, saveMusicOrderConfig } from "@/lib/music-order";

export async function POST(request: NextRequest) {
  try {
    const { pathname } = await request.json();

    if (!pathname || typeof pathname !== "string") {
      return NextResponse.json(
        { error: "pathname is required" },
        { status: 400 },
      );
    }

    // Find the blob URL for this pathname
    const result = await list({ prefix: pathname, limit: 1 });
    const blob = result.blobs.find((b) => b.pathname === pathname);

    if (!blob) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await del(blob.url);

    // Remove from music order config
    const order = await getMusicOrderConfig();
    const updated = order.filter((p) => p !== pathname);
    if (updated.length !== order.length) {
      await saveMusicOrderConfig(updated);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
