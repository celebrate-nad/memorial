import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const PHOTO_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif",
]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v", "avi"]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded: { pathname: string; url: string; kind: string }[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      let prefix: string;
      let kind: string;
      if (PHOTO_EXTENSIONS.has(ext)) {
        prefix = "photos";
        kind = "photo";
      } else if (VIDEO_EXTENSIONS.has(ext)) {
        prefix = "videos";
        kind = "video";
      } else {
        continue; // Skip unsupported files
      }

      const blob = await put(`${prefix}/${file.name}`, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });

      uploaded.push({ pathname: blob.pathname, url: blob.url, kind });
    }

    return NextResponse.json({ success: true, uploaded });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
