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

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!AUDIO_EXTENSIONS.has(ext)) {
        continue; // Skip non-audio files
      }

      const blob = await put(`music/${file.name}`, file, {
        access: "public",
        contentType: file.type || "audio/mpeg",
      });

      uploaded.push(blob.pathname);
    }

    // Add newly uploaded tracks to the end of the music order
    if (uploaded.length > 0) {
      const currentOrder = await getMusicOrderConfig();
      const updatedOrder = [...currentOrder, ...uploaded];
      await saveMusicOrderConfig(updatedOrder);
    }

    return NextResponse.json({ success: true, uploaded });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
