import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
        if (!AUDIO_EXTENSIONS.has(ext)) {
          throw new Error(`Invalid file type: .${ext}. Allowed: mp3, m4a, wav, ogg, aac`);
        }

        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/mp4",
            "audio/x-m4a",
            "audio/wav",
            "audio/ogg",
            "audio/aac",
            "audio/mp3",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[music/upload] Upload completed:", blob.pathname);
        try {
          const currentOrder = await getMusicOrderConfig();
          const updatedOrder = [...currentOrder, blob.pathname];
          await saveMusicOrderConfig(updatedOrder);
        } catch (e) {
          // onUploadCompleted can fail silently in some environments
          console.error("[music/upload] Failed to update order:", e);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to handle upload";
    console.error("[music/upload] Error:", message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
