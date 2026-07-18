import { put, del, list } from "@vercel/blob";

const MUSIC_ORDER_PREFIX = "config/music-order";

/**
 * Reads the music order config from the Blob store.
 * Returns an ordered array of pathnames for track playback order.
 */
export async function getMusicOrderConfig(): Promise<string[]> {
  try {
    const result = await list({ prefix: MUSIC_ORDER_PREFIX, limit: 10 });
    const blobs = result.blobs
      .filter((b) => b.pathname.startsWith(MUSIC_ORDER_PREFIX))
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
 * Saves the music order config to the Blob store.
 * Deletes any previous config blobs, then writes the new one.
 */
export async function saveMusicOrderConfig(order: string[]): Promise<void> {
  const result = await list({ prefix: MUSIC_ORDER_PREFIX, limit: 10 });
  const oldBlobs = result.blobs.filter((b) => b.pathname.startsWith(MUSIC_ORDER_PREFIX));
  if (oldBlobs.length > 0) {
    await del(oldBlobs.map((b) => b.url));
  }

  await put(`${MUSIC_ORDER_PREFIX}.json`, JSON.stringify(order), {
    access: "public",
    contentType: "application/json",
  });
}
