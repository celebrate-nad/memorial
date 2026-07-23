import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getMediaItems, getMusicItems } from "@/lib/media";
import { getCurationConfig } from "@/lib/curation";

export const maxDuration = 120; // Allow up to 2 minutes for large archives

export async function GET() {
  try {
    const [allMedia, music, curation] = await Promise.all([
      getMediaItems(),
      getMusicItems(),
      getCurationConfig(),
    ]);

    // Get curated photos in order (or all if no curation)
    let photos;
    if (curation.length > 0) {
      const mediaMap = new Map(allMedia.map((m) => [m.pathname, m]));
      photos = curation
        .map((pathname) => mediaMap.get(pathname))
        .filter((m): m is NonNullable<typeof m> => m != null);
    } else {
      photos = allMedia;
    }

    const zip = new JSZip();
    const photosFolder = zip.folder("photos")!;
    const musicFolder = zip.folder("music")!;

    // Add photos numbered to maintain order
    for (let i = 0; i < photos.length; i++) {
      const item = photos[i];
      const originalName = item.pathname.split("/").pop() || "photo.jpg";
      const paddedNum = String(i + 1).padStart(3, "0");
      const filename = `${paddedNum}-${originalName}`;

      const response = await fetch(item.url);
      const buffer = await response.arrayBuffer();
      photosFolder.file(filename, buffer);
    }

    // Add music numbered to maintain order
    for (let i = 0; i < music.length; i++) {
      const track = music[i];
      const originalName = track.pathname.split("/").pop() || "track.mp3";
      const paddedNum = String(i + 1).padStart(2, "0");
      const filename = `${paddedNum}-${originalName}`;

      const response = await fetch(track.url);
      const buffer = await response.arrayBuffer();
      musicFolder.file(filename, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=memorial-slideshow.zip",
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create download";
    console.error("[download] Error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
