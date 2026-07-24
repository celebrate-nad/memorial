import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import sharp from "sharp";
import { getMediaItems, getMusicItems } from "@/lib/media";
import { getCurationConfig } from "@/lib/curation";
import { getSlideshowSettings } from "@/lib/slideshow-settings";

export const maxDuration = 300; // Allow up to 5 minutes for compositing

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");

  try {
    const [allMedia, music, curation, settings] = await Promise.all([
      getMediaItems(),
      getMusicItems(),
      getCurationConfig(),
      getSlideshowSettings(),
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
    const musicFolder = zip.folder("music")!;

    if (format === "slides") {
      // Composite photos into slide images (2 or 4 per slide at 1920x1080)
      const photosPerSlide = settings.photosPerSlide;
      const slidesFolder = zip.folder("slides")!;

      // Add begin slide if set
      let slideNum = 0;
      if (settings.beginPhoto) {
        slideNum++;
        const response = await fetch(settings.beginPhoto);
        const buffer = Buffer.from(await response.arrayBuffer());
        const resized = await sharp(buffer)
          .resize(1920, 1080, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
          .jpeg({ quality: 90 })
          .toBuffer();
        slidesFolder.file(`${String(slideNum).padStart(3, "0")}-begin.jpg`, resized);
      }

      // Composite photo slides
      for (let i = 0; i < photos.length; i += photosPerSlide) {
        slideNum++;
        const batch = photos.slice(i, i + photosPerSlide);
        const paddedNum = String(slideNum).padStart(3, "0");

        if (batch.length === 1 || photosPerSlide === 1) {
          // Single photo — just resize to fit 1920x1080
          const response = await fetch(batch[0].url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const resized = await sharp(buffer)
            .resize(1920, 1080, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
            .jpeg({ quality: 90 })
            .toBuffer();
          slidesFolder.file(`${paddedNum}-slide.jpg`, resized);
        } else if (photosPerSlide === 2) {
          // Two photos side by side
          const buffers = await Promise.all(
            batch.map(async (item) => {
              const response = await fetch(item.url);
              return Buffer.from(await response.arrayBuffer());
            }),
          );

          const resized = await Promise.all(
            buffers.map((buf) =>
              sharp(buf)
                .resize(940, 1080, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
                .jpeg({ quality: 90 })
                .toBuffer(),
            ),
          );

          // Composite side by side on 1920x1080 black canvas
          const composite = await sharp({
            create: { width: 1920, height: 1080, channels: 3, background: { r: 0, g: 0, b: 0 } },
          })
            .composite([
              { input: resized[0], left: 10, top: 0 },
              ...(resized[1] ? [{ input: resized[1], left: 970, top: 0 }] : []),
            ])
            .jpeg({ quality: 90 })
            .toBuffer();

          slidesFolder.file(`${paddedNum}-slide.jpg`, composite);
        } else {
          // 4 photos in a 2x2 grid
          const buffers = await Promise.all(
            batch.map(async (item) => {
              const response = await fetch(item.url);
              return Buffer.from(await response.arrayBuffer());
            }),
          );

          const resized = await Promise.all(
            buffers.map((buf) =>
              sharp(buf)
                .resize(940, 520, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
                .jpeg({ quality: 90 })
                .toBuffer(),
            ),
          );

          const positions = [
            { left: 10, top: 10 },
            { left: 970, top: 10 },
            { left: 10, top: 550 },
            { left: 970, top: 550 },
          ];

          const composite = await sharp({
            create: { width: 1920, height: 1080, channels: 3, background: { r: 0, g: 0, b: 0 } },
          })
            .composite(
              resized.map((buf, idx) => ({ input: buf, left: positions[idx].left, top: positions[idx].top })),
            )
            .jpeg({ quality: 90 })
            .toBuffer();

          slidesFolder.file(`${paddedNum}-slide.jpg`, composite);
        }
      }

      // Add end slide if set
      if (settings.endPhoto) {
        slideNum++;
        const response = await fetch(settings.endPhoto);
        const buffer = Buffer.from(await response.arrayBuffer());
        const resized = await sharp(buffer)
          .resize(1920, 1080, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
          .jpeg({ quality: 90 })
          .toBuffer();
        slidesFolder.file(`${String(slideNum).padStart(3, "0")}-end.jpg`, resized);
      }
    } else {
      // Original format — individual photos numbered
      const photosFolder = zip.folder("photos")!;
      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        const originalName = item.pathname.split("/").pop() || "photo.jpg";
        const paddedNum = String(i + 1).padStart(3, "0");
        const filename = `${paddedNum}-${originalName}`;

        const response = await fetch(item.url);
        const buffer = await response.arrayBuffer();
        photosFolder.file(filename, buffer);
      }
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
    const downloadName = format === "slides" ? "memorial-slides.zip" : "memorial-slideshow.zip";

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=${downloadName}`,
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
