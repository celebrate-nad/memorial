import { NextRequest, NextResponse } from "next/server";
import { put, del, list, copy } from "@vercel/blob";
import { getCurationConfig, saveCurationConfig } from "@/lib/curation";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const oldPathname = formData.get("pathname") as string | null;

    if (!file || !oldPathname) {
      return NextResponse.json(
        { error: "file and pathname are required" },
        { status: 400 },
      );
    }

    // Find the original blob
    const result = await list({ prefix: oldPathname, limit: 1 });
    const oldBlob = result.blobs.find((b) => b.pathname === oldPathname);

    if (!oldBlob) {
      return NextResponse.json({ error: "Original file not found" }, { status: 404 });
    }

    // Archive the original to originals/ prefix
    const originalFilename = oldPathname.split("/").pop() || "unknown";
    await copy(oldBlob.url, `originals/${originalFilename}`, { access: "public" });

    // Delete the old blob
    await del(oldBlob.url);

    // Upload the edited version
    const timestamp = Date.now();
    const newPathname = `photos/edited-${timestamp}-${originalFilename}`;
    const newBlob = await put(newPathname, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });

    // Update curation config references
    const curation = await getCurationConfig();
    const idx = curation.indexOf(oldPathname);
    if (idx !== -1) {
      curation[idx] = newBlob.pathname;
      await saveCurationConfig(curation);
    }

    return NextResponse.json({
      success: true,
      pathname: newBlob.pathname,
      url: newBlob.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to replace photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
