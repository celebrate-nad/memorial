import { getMediaItems, getMusicItems } from "@/lib/media";
import { getCurationConfig } from "@/lib/curation";
import { getSlideshowSettings } from "@/lib/slideshow-settings";
import { siteConfig } from "@/lib/site-config";
import Slideshow from "@/components/Slideshow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemorialPage() {
  let allMedia: Awaited<ReturnType<typeof getMediaItems>> = [];
  let music: Awaited<ReturnType<typeof getMusicItems>> = [];
  let configError: string | null = null;
  let photosPerSlide = 1;
  let slideDurationMs = siteConfig.photoDurationMs;
  let coverPhoto: string | null = null;
  let coverText = "";
  let coverSubtext = "";

  try {
    const [mediaResult, musicResult, curation, settings] = await Promise.all([
      getMediaItems(),
      getMusicItems(),
      getCurationConfig(),
      getSlideshowSettings(),
    ]);

    allMedia = mediaResult;
    music = musicResult;
    photosPerSlide = settings.photosPerSlide;
    slideDurationMs = settings.slideDurationMs;
    coverPhoto = settings.coverPhoto;
    coverText = settings.coverText;
    coverSubtext = settings.coverSubtext;

    // Filter to only curated items, in curated order
    if (curation.length > 0) {
      const mediaMap = new Map(allMedia.map((m) => [m.pathname, m]));
      allMedia = curation
        .map((pathname) => mediaMap.get(pathname))
        .filter((m): m is NonNullable<typeof m> => m != null);
    }
  } catch (error) {
    configError =
      error instanceof Error ? error.message : "Failed to load media.";
  }

  if (configError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-neutral-300">
        <h1 className="mb-4 text-2xl font-light">Site isn&apos;t set up yet</h1>
        <p className="max-w-lg text-neutral-400">
          Couldn&apos;t connect to the media storage. If you&apos;re the
          site owner, check that a Vercel Blob store is created and
          connected to this project (see the README).
        </p>
      </main>
    );
  }

  if (allMedia.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-neutral-200">
        <h1 className="mb-4 text-2xl font-light tracking-wide">{siteConfig.name}</h1>
        <p className="max-w-md text-neutral-400">
          No memorial photos have been selected yet. An admin can curate
          the slideshow from the admin panel.
        </p>
        <a
          href="/"
          className="mt-6 text-sm text-neutral-500 transition hover:text-neutral-300"
        >
          ← View all photos
        </a>
      </main>
    );
  }

  return (
    <Slideshow
      media={allMedia}
      music={music}
      name={siteConfig.name}
      dates={siteConfig.dates}
      message={siteConfig.message}
      photoDurationMs={slideDurationMs}
      maxVideoDurationMs={siteConfig.maxVideoDurationMs}
      photosPerSlide={photosPerSlide}
      coverPhoto={coverPhoto}
      coverText={coverText}
      coverSubtext={coverSubtext}
    />
  );
}
