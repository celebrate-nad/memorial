import { put, del, list } from "@vercel/blob";

const CURATION_PREFIX = "config/curation";

/**
 * Reads the curated memorial selection from the Blob store.
 * Returns an ordered array of pathnames that should appear in the memorial slideshow.
 */
export async function getCurationConfig(): Promise<string[]> {
  try {
    const result = await list({ prefix: CURATION_PREFIX, limit: 10 });
    const blobs = result.blobs
      .filter((b) => b.pathname.startsWith(CURATION_PREFIX))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    if (blobs.length === 0) return [];

    const response = await fetch(blobs[0].url);
    if (!response.ok) return [];

    const data = await response.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

/**
 * Saves the curated memorial selection to the Blob store.
 * Deletes any previous config blobs, then writes the new one.
 */
export async function saveCurationConfig(selection: string[]): Promise<void> {
  // Delete old config blobs
  const result = await list({ prefix: CURATION_PREFIX, limit: 10 });
  const oldBlobs = result.blobs.filter((b) => b.pathname.startsWith(CURATION_PREFIX));
  if (oldBlobs.length > 0) {
    await del(oldBlobs.map((b) => b.url));
  }

  // Write new config
  await put(`${CURATION_PREFIX}.json`, JSON.stringify(selection), {
    access: "public",
    contentType: "application/json",
  });
}
