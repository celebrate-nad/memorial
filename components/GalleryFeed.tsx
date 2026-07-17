"use client";

import { useRef, useEffect, useState } from "react";
import type { MediaItem } from "@/lib/media";

interface Props {
  media: MediaItem[];
}

function LazyVideo({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="w-full"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-neutral-800 text-neutral-500">
          <span className="text-3xl">🎬</span>
        </div>
      )}
    </div>
  );
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
            <LazyVideo src={item.url} />
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
