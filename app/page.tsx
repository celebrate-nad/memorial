import { getMediaItems, getMusicItems } from "@/lib/media";
import { siteConfig } from "@/lib/site-config";
import Slideshow from "@/components/Slideshow";

// Always fetch the latest list of photos/videos/music on each request
// instead of caching it at build time, so newly uploaded memories show
// up without needing a redeploy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  let media: Awaited<ReturnType<typeof getMediaItems>> = [];
  let music: Awaited<ReturnType<typeof getMusicItems>> = [];
  let configError: string | null = null;

  try {
    [media, music] = await Promise.all([getMediaItems(), getMusicItems()]);
  } catch (error) {
    // Most commonly this means BLOB_READ_WRITE_TOKEN is missing or the
    // Blob store isn't connected to this project yet. Show a friendly
    // message instead of a crash page.
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

  return (
    <Slideshow
      media={media}
      music={music}
      name={siteConfig.name}
      dates={siteConfig.dates}
      message={siteConfig.message}
      photoDurationMs={siteConfig.photoDurationMs}
      maxVideoDurationMs={siteConfig.maxVideoDurationMs}
    />
  );
}
