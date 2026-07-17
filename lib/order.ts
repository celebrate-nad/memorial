import { put, del, list } from "@vercel/blob";

const ORDER_PREFIX = "config/order";

/**
 * Reads the ordering config from the Blob store.
 * Returns an array of pathnames in display order, or an empty array
 * if no config exists yet.
 */
export async function getOrderConfig(): Promise<string[]> {
  try {
    const result = await list({ prefix: ORDER_PREFIX, limit: 10 });
    // Find the most recently uploaded config blob
    const blobs = result.blobs
      .filter((b) => b.pathname.startsWith(ORDER_PREFIX))
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
 * Saves the ordering config to the Blob store.
 * Deletes any previous config blobs, then writes the new one.
 */
export async function saveOrderConfig(order: string[]): Promise<void> {
  // Delete old config blobs
  const result = await list({ prefix: ORDER_PREFIX, limit: 10 });
  const oldBlobs = result.blobs.filter((b) => b.pathname.startsWith(ORDER_PREFIX));
  if (oldBlobs.length > 0) {
    await del(oldBlobs.map((b) => b.url));
  }

  // Write new config (addRandomSuffix defaults to true, which always works)
  await put(`${ORDER_PREFIX}.json`, JSON.stringify(order), {
    access: "public",
    contentType: "application/json",
  });
}
