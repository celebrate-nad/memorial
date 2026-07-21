import { put, del, list } from "@vercel/blob";

const SETTINGS_PREFIX = "config/slideshow-settings";

export interface SlideshowSettings {
  photosPerSlide: number; // 1, 2, or 4
  slideDurationMs: number; // milliseconds per slide
}

const DEFAULTS: SlideshowSettings = {
  photosPerSlide: 1,
  slideDurationMs: 4000,
};

/**
 * Reads slideshow settings from the Blob store.
 * Returns defaults if no config exists.
 */
export async function getSlideshowSettings(): Promise<SlideshowSettings> {
  try {
    const result = await list({ prefix: SETTINGS_PREFIX, limit: 10 });
    const blobs = result.blobs
      .filter((b) => b.pathname.startsWith(SETTINGS_PREFIX))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    if (blobs.length === 0) return DEFAULTS;

    const response = await fetch(blobs[0].url);
    if (!response.ok) return DEFAULTS;

    const data = await response.json();
    return {
      photosPerSlide: data.photosPerSlide ?? DEFAULTS.photosPerSlide,
      slideDurationMs: data.slideDurationMs ?? DEFAULTS.slideDurationMs,
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Saves slideshow settings to the Blob store.
 */
export async function saveSlideshowSettings(settings: SlideshowSettings): Promise<void> {
  const result = await list({ prefix: SETTINGS_PREFIX, limit: 10 });
  const oldBlobs = result.blobs.filter((b) => b.pathname.startsWith(SETTINGS_PREFIX));
  if (oldBlobs.length > 0) {
    await del(oldBlobs.map((b) => b.url));
  }

  await put(`${SETTINGS_PREFIX}.json`, JSON.stringify(settings), {
    access: "public",
    contentType: "application/json",
  });
}
