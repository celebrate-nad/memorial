import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getMusicItems } from "@/lib/media";
import { getMusicOrderConfig, saveMusicOrderConfig } from "@/lib/music-order";

const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "ogg", "aac"]);

export async function GET() {
  try {
    const music = await getMusicItems();
    return NextResponse.json({ music });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list music";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    console.log("[music/upload] Files received:", files.length, files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded: string[] = [];
    const skipped: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!AUDIO_EXTENSIONS.has(ext)) {
        console.log("[music/upload] Skipping non-audio file:", file.name, ext);
        skipped.push(file.name);
        continue;
      }

      console.log("[music/upload] Uploading:", file.name, "size:", file.size);
      const blob = await put(`music/${file.name}`, file, {
        access: "public",
        contentType: file.type || "audio/mpeg",
      });
      console.log("[music/upload] Uploaded:", blob.pathname);

      uploaded.push(blob.pathname);
    }

    // Add newly uploaded tracks to the end of the music order
    if (uploaded.length > 0) {
      const currentOrder = await getMusicOrderConfig();
      const updatedOrder = [...currentOrder, ...uploaded];
      await saveMusicOrderConfig(updatedOrder);
    }

    return NextResponse.json({ success: true, uploaded, skipped });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload";
    console.error("[music/upload] Error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
