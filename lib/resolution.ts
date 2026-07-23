import { list, put, del } from "@vercel/blob";
import sharp from "sharp";

const RESOLUTION_CACHE_PREFIX = "config/resolution";

export interface ImageDimensions {
  width: number;
  height: number;
}

interface ResolutionCache {
  entries: Record<string, ImageDimensions>; // pathname -> dimensions
}

/**
 * Load cached dimensions from Blob store.
 */
async function loadResolutionCache(): Promise<ResolutionCache> {
  try {
    const result = await list({ prefix: RESOLUTION_CACHE_PREFIX, limit: 10 });
    const blobs = result.blobs
      .filter((b) => b.pathname.startsWith(RESOLUTION_CACHE_PREFIX))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    if (blobs.length === 0) return { entries: {} };

    const response = await fetch(blobs[0].url);
    if (!response.ok) return { entries: {} };

    const data = await response.json();
    return data as ResolutionCache;
  } catch {
    return { entries: {} };
  }
}

/**
 * Save resolution cache to Blob store.
 */
async function saveResolutionCache(cache: ResolutionCache): Promise<void> {
  const result = await list({ prefix: RESOLUTION_CACHE_PREFIX, limit: 10 });
  const oldBlobs = result.blobs.filter((b) => b.pathname.startsWith(RESOLUTION_CACHE_PREFIX));
  if (oldBlobs.length > 0) {
    await del(oldBlobs.map((b) => b.url));
  }

  await put(`${RESOLUTION_CACHE_PREFIX}.json`, JSON.stringify(cache), {
    access: "public",
    contentType: "application/json",
  });
}

/**
 * Get image dimensions using sharp.
 */
async function getImageDimensions(url: string): Promise<ImageDimensions | null> {
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get dimensions for all photos, using cache where available.
 * Returns a map of pathname -> dimensions.
 */
export async function getResolutionMap(
  photos: { pathname: string; url: string }[],
): Promise<Record<string, ImageDimensions>> {
  const cache = await loadResolutionCache();
  const result: Record<string, ImageDimensions> = {};
  let cacheUpdated = false;

  const CONCURRENCY = 5;

  for (let i = 0; i < photos.length; i += CONCURRENCY) {
    const batch = photos.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (photo) => {
        // Check cache
        if (cache.entries[photo.pathname]) {
          result[photo.pathname] = cache.entries[photo.pathname];
          return;
        }

        // Compute dimensions
        const dims = await getImageDimensions(photo.url);
        if (dims) {
          result[photo.pathname] = dims;
          cache.entries[photo.pathname] = dims;
          cacheUpdated = true;
        }
      }),
    );
  }

  // Remove stale entries
  const currentPathnames = new Set(photos.map((p) => p.pathname));
  for (const pathname of Object.keys(cache.entries)) {
    if (!currentPathnames.has(pathname)) {
      delete cache.entries[pathname];
      cacheUpdated = true;
    }
  }

  if (cacheUpdated) {
    await saveResolutionCache(cache);
  }

  return result;
}
