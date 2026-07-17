import { getMediaItems } from "@/lib/media";
import { siteConfig } from "@/lib/site-config";
import GalleryFeed from "@/components/GalleryFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  let media: Awaited<ReturnType<typeof getMediaItems>> = [];
  let configError: string | null = null;

  try {
    media = await getMediaItems();
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

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-black/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-light tracking-wide text-neutral-100">
            {siteConfig.name}
          </h1>
          <a
            href="/memorial"
            className="text-sm text-neutral-400 transition hover:text-neutral-200"
          >
            Memorial →
          </a>
        </div>
      </header>

      {/* Feed */}
      <GalleryFeed media={media} />

      {media.length === 0 && (
        <div className="py-20 text-center text-neutral-500">
          No photos or videos have been shared yet.
        </div>
      )}
    </main>
  );
}
