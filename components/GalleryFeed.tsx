"use client";

import type { MediaItem } from "@/lib/media";

interface Props {
  media: MediaItem[];
}

export default function GalleryFeed({ media }: Props) {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      {media.map((item) => (
        <article
          key={item.pathname}
          className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
        >
          {item.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              className="w-full"
              loading="lazy"
            />
          ) : (
            <video
              src={item.url}
              controls
              playsInline
              preload="metadata"
              className="w-full"
            />
          )}
          <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-500">
            <span>{item.pathname.split("/").pop()}</span>
            <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
