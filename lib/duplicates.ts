import { list, put, del } from "@vercel/blob";
import { createHash } from "crypto";

const HASH_CACHE_PREFIX = "config/hashes";

interface HashEntry {
  pathname: string;
  hash: string;
  url: string;
  uploadedAt: string;
  size: number;
}

interface HashCache {
  entries: Record<string, string>; // pathname -> hash
}

export interface DuplicateGroup {
  hash: string;
  items: { pathname: string; url: string; uploadedAt: string; size: number }[];
}

/**
 * Load cached hashes from Blob store.
 */
async function loadHashCache(): Promise<HashCache> {
  try {
    const result = await list({ prefix: HASH_CACHE_PREFIX, limit: 10 });
    const blobs = result.blobs
      .filter((b) => b.pathname.startsWith(HASH_CACHE_PREFIX))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    if (blobs.length === 0) return { entries: {} };

    const response = await fetch(blobs[0].url);
    if (!response.ok) return { entries: {} };

    const data = await response.json();
    return data as HashCache;
  } catch {
    return { entries: {} };
  }
}

/**
 * Save hash cache to Blob store.
 */
async function saveHashCache(cache: HashCache): Promise<void> {
  // Delete old cache blobs
  const result = await list({ prefix: HASH_CACHE_PREFIX, limit: 10 });
  const oldBlobs = result.blobs.filter((b) => b.pathname.startsWith(HASH_CACHE_PREFIX));
  if (oldBlobs.length > 0) {
    await del(oldBlobs.map((b) => b.url));
  }

  await put(`${HASH_CACHE_PREFIX}.json`, JSON.stringify(cache), {
    access: "public",
    contentType: "application/json",
  });
}

/**
 * Compute SHA-256 hash of a blob by downloading its content.
 */
async function hashBlob(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const hash = createHash("sha256");
  hash.update(Buffer.from(buffer));
  return hash.digest("hex");
}

/**
 * Detect duplicate media items by computing SHA-256 hashes of their content.
 * Uses a cache to avoid re-downloading already-hashed files.
 * Returns groups of items that share the same content hash.
 */
export async function detectDuplicates(): Promise<DuplicateGroup[]> {
  // Get all media blobs
  const allBlobs: { pathname: string; url: string; uploadedAt: string; size: number }[] = [];

  for (const prefix of ["photos/", "videos/"] as const) {
    let cursor: string | undefined;
    do {
      const result = await list({ prefix, cursor, limit: 1000 });
      for (const blob of result.blobs) {
        allBlobs.push({
          pathname: blob.pathname,
          url: blob.url,
          uploadedAt: blob.uploadedAt.toISOString(),
          size: blob.size,
        });
      }
      cursor = result.cursor;
    } while (cursor);
  }

  // Load cached hashes
  const cache = await loadHashCache();

  // Hash all blobs (using cache where possible)
  const entries: HashEntry[] = [];
  const CONCURRENCY = 5;
  let cacheUpdated = false;

  for (let i = 0; i < allBlobs.length; i += CONCURRENCY) {
    const batch = allBlobs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (blob) => {
        let hash = cache.entries[blob.pathname];
        if (!hash) {
          hash = await hashBlob(blob.url);
          cache.entries[blob.pathname] = hash;
          cacheUpdated = true;
        }
        return { ...blob, hash };
      }),
    );
    entries.push(...results);
  }

  // Remove stale cache entries (deleted blobs)
  const currentPathnames = new Set(allBlobs.map((b) => b.pathname));
  for (const pathname of Object.keys(cache.entries)) {
    if (!currentPathnames.has(pathname)) {
      delete cache.entries[pathname];
      cacheUpdated = true;
    }
  }

  // Save updated cache
  if (cacheUpdated) {
    await saveHashCache(cache);
  }

  // Group by hash
  const hashGroups = new Map<string, HashEntry[]>();
  for (const entry of entries) {
    const group = hashGroups.get(entry.hash) || [];
    group.push(entry);
    hashGroups.set(entry.hash, group);
  }

  // Return only groups with duplicates (2+ items), sorted largest first within each group
  const duplicates: DuplicateGroup[] = [];
  for (const [hash, items] of hashGroups) {
    if (items.length < 2) continue;
    items.sort((a, b) => b.size - a.size); // Largest file first (highest resolution)
    duplicates.push({
      hash,
      items: items.map(({ pathname, url, uploadedAt, size }) => ({ pathname, url, uploadedAt, size })),
    });
  }

  return duplicates;
}
