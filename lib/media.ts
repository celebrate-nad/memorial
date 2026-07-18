import { list } from "@vercel/blob";
import { getMusicOrderConfig } from "@/lib/music-order";

export interface MediaItem {
  url: string;
  pathname: string;
  uploadedAt: string;
  kind: "photo" | "video";
}

export interface MusicItem {
  url: string;
  pathname: string;
}

const PHOTO_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "avif",
]);

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v", "avi"]);

const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "ogg", "aac"]);

function extensionOf(pathname: string): string {
  const parts = pathname.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Lists all photos and videos uploaded under the "photos/" and "videos/"
 * prefixes in the Blob store, sorted oldest first so the slideshow plays
 * in the order memories came in.
 */
export async function getMediaItems(): Promise<MediaItem[]> {
  const items: MediaItem[] = [];

  for (const prefix of ["photos/", "videos/"] as const) {
    let cursor: string | undefined;
    do {
      const result = await list({ prefix, cursor, limit: 1000 });
      for (const blob of result.blobs) {
        const ext = extensionOf(blob.pathname);
        const kind = PHOTO_EXTENSIONS.has(ext)
          ? "photo"
          : VIDEO_EXTENSIONS.has(ext)
            ? "video"
            : null;
        if (!kind) continue;
        items.push({
          url: blob.url,
          pathname: blob.pathname,
          uploadedAt: blob.uploadedAt.toISOString(),
          kind,
        });
      }
      cursor = result.cursor;
    } while (cursor);
  }

  // Sort by upload date (oldest first)
  items.sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  );

  return items;
}

/**
 * Lists all tracks uploaded under the "music/" prefix in the Blob store.
 * Respects admin-defined order if one exists, otherwise falls back to
 * alphabetical by filename.
 */
export async function getMusicItems(): Promise<MusicItem[]> {
  const items: MusicItem[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({ prefix: "music/", cursor, limit: 1000 });
    for (const blob of result.blobs) {
      const ext = extensionOf(blob.pathname);
      if (!AUDIO_EXTENSIONS.has(ext)) continue;
      items.push({ url: blob.url, pathname: blob.pathname });
    }
    cursor = result.cursor;
  } while (cursor);

  const order = await getMusicOrderConfig();

  if (order.length > 0) {
    const orderMap = new Map(order.map((pathname, index) => [pathname, index]));
    items.sort((a, b) => {
      const aIdx = orderMap.get(a.pathname) ?? Number.MAX_SAFE_INTEGER;
      const bIdx = orderMap.get(b.pathname) ?? Number.MAX_SAFE_INTEGER;
      if (aIdx === Number.MAX_SAFE_INTEGER && bIdx === Number.MAX_SAFE_INTEGER) {
        return a.pathname.localeCompare(b.pathname);
      }
      return aIdx - bIdx;
    });
  } else {
    items.sort((a, b) => a.pathname.localeCompare(b.pathname));
  }

  return items;
}
