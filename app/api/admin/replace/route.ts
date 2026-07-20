import { NextRequest, NextResponse } from "next/server";
import { put, del, list } from "@vercel/blob";
import { getCurationConfig, saveCurationConfig } from "@/lib/curation";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const oldPathname = formData.get("pathname") as string | null;

    console.log("[replace] Request received", { hasFile: !!file, oldPathname });

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
      console.error("[replace] Original blob not found", { oldPathname });
      return NextResponse.json({ error: "Original file not found" }, { status: 404 });
    }

    // Delete the old blob
    await del(oldBlob.url);
    console.log("[replace] Deleted old blob", { url: oldBlob.url });

    // Upload the edited version
    const originalFilename = oldPathname.split("/").pop() || "unknown";
    const timestamp = Date.now();
    const newPathname = `photos/edited-${timestamp}-${originalFilename}`;
    const newBlob = await put(newPathname, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });
    console.log("[replace] Uploaded new blob", { pathname: newBlob.pathname, url: newBlob.url });

    // Update curation config references
    const curation = await getCurationConfig();
    const idx = curation.indexOf(oldPathname);
    if (idx !== -1) {
      curation[idx] = newBlob.pathname;
      await saveCurationConfig(curation);
      console.log("[replace] Updated curation config", { oldPathname, newPathname: newBlob.pathname });
    }

    return NextResponse.json({
      success: true,
      pathname: newBlob.pathname,
      url: newBlob.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to replace photo";
    console.error("[replace] Error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
