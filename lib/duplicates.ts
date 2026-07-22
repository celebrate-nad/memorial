import { list, put, del } from "@vercel/blob";
import { createHash } from "crypto";
import sharp from "sharp";

const HASH_CACHE_PREFIX = "config/hashes";

interface HashEntry {
  pathname: string;
  hash: string;
  phash: string; // perceptual hash
  url: string;
  uploadedAt: string;
  size: number;
}

interface HashCache {
  entries: Record<string, { hash: string; phash: string }>; // pathname -> hashes
}

export interface DuplicateGroup {
  hash: string;
  type: "exact" | "similar";
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
    // Handle old cache format (string values) by treating them as needing recomputation
    if (data.entries) {
      const entries: HashCache["entries"] = {};
      for (const [key, value] of Object.entries(data.entries)) {
        if (typeof value === "string") {
          // Old format - needs phash recomputation
          entries[key] = { hash: value, phash: "" };
        } else {
          entries[key] = value as { hash: string; phash: string };
        }
      }
      return { entries };
    }
    return { entries: {} };
  } catch {
    return { entries: {} };
  }
}

/**
 * Save hash cache to Blob store.
 */
async function saveHashCache(cache: HashCache): Promise<void> {
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
 * Compute SHA-256 hash and perceptual hash (dHash) of a blob.
 */
async function hashBlob(url: string): Promise<{ hash: string; phash: string }> {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  // SHA-256
  const sha = createHash("sha256");
  sha.update(buffer);
  const hash = sha.digest("hex");

  // Perceptual hash (dHash): resize to 9x8 grayscale, compare adjacent pixels
  let phash = "";
  try {
    const pixels = await sharp(buffer)
      .resize(9, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();

    // dHash: for each row, compare pixel to its right neighbor
    const bits: number[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = pixels[y * 9 + x];
        const right = pixels[y * 9 + x + 1];
        bits.push(left < right ? 1 : 0);
      }
    }
    // Convert 64 bits to hex string
    phash = "";
    for (let i = 0; i < 64; i += 4) {
      const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
      phash += nibble.toString(16);
    }
  } catch {
    // If sharp fails (e.g. for videos), use empty phash
    phash = "";
  }

  return { hash, phash };
}

/**
 * Compute hamming distance between two hex-encoded hashes.
 */
function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64; // Max distance if incomparable
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    // Count bits in xor
    distance += ((xor >> 3) & 1) + ((xor >> 2) & 1) + ((xor >> 1) & 1) + (xor & 1);
  }
  return distance;
}

/**
 * Detect duplicate media items using both exact (SHA-256) and perceptual (dHash) matching.
 * Returns groups of items that are either exact or visually similar duplicates.
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
        const cached = cache.entries[blob.pathname];
        let hash: string;
        let phash: string;

        if (cached && cached.hash && cached.phash) {
          hash = cached.hash;
          phash = cached.phash;
        } else {
          const result = await hashBlob(blob.url);
          hash = result.hash;
          phash = result.phash;
          cache.entries[blob.pathname] = { hash, phash };
          cacheUpdated = true;
        }

        return { ...blob, hash, phash };
      }),
    );
    entries.push(...results);
  }

  // Remove stale cache entries
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

  // Step 1: Find exact duplicates (same SHA-256)
  const exactGroups = new Map<string, HashEntry[]>();
  for (const entry of entries) {
    const group = exactGroups.get(entry.hash) || [];
    group.push(entry);
    exactGroups.set(entry.hash, group);
  }

  const duplicates: DuplicateGroup[] = [];
  const usedInExact = new Set<string>();

  for (const [hash, items] of exactGroups) {
    if (items.length < 2) continue;
    items.sort((a, b) => b.size - a.size);
    duplicates.push({
      hash,
      type: "exact",
      items: items.map(({ pathname, url, uploadedAt, size }) => ({ pathname, url, uploadedAt, size })),
    });
    for (const item of items) {
      usedInExact.add(item.pathname);
    }
  }

  // Step 2: Find near-duplicates via perceptual hash (hamming distance <= 5)
  // Only consider photos not already in an exact duplicate group
  const photoEntries = entries.filter(
    (e) => !usedInExact.has(e.pathname) && e.phash && e.pathname.startsWith("photos/"),
  );

  const MAX_HAMMING_DISTANCE = 5;
  const usedInSimilar = new Set<string>();
  const similarGroups: HashEntry[][] = [];

  for (let i = 0; i < photoEntries.length; i++) {
    if (usedInSimilar.has(photoEntries[i].pathname)) continue;

    const group: HashEntry[] = [photoEntries[i]];

    for (let j = i + 1; j < photoEntries.length; j++) {
      if (usedInSimilar.has(photoEntries[j].pathname)) continue;

      const dist = hammingDistance(photoEntries[i].phash, photoEntries[j].phash);
      if (dist <= MAX_HAMMING_DISTANCE) {
        group.push(photoEntries[j]);
        usedInSimilar.add(photoEntries[j].pathname);
      }
    }

    if (group.length >= 2) {
      usedInSimilar.add(photoEntries[i].pathname);
      similarGroups.push(group);
    }
  }

  for (const items of similarGroups) {
    items.sort((a, b) => b.size - a.size);
    duplicates.push({
      hash: `similar-${items[0].phash}`,
      type: "similar",
      items: items.map(({ pathname, url, uploadedAt, size }) => ({ pathname, url, uploadedAt, size })),
    });
  }

  return duplicates;
}
