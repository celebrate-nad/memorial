"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem, MusicItem } from "@/lib/media";

interface SlideshowProps {
  media: MediaItem[];
  music: MusicItem[];
  name: string;
  dates: string;
  message: string;
  photoDurationMs: number;
  maxVideoDurationMs: number | null;
}

export default function Slideshow({
  media,
  music,
  name,
  dates,
  message,
  photoDurationMs,
  maxVideoDurationMs,
}: SlideshowProps) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = media[index];

  const goToNext = useCallback(() => {
    setIndex((prev) => (media.length === 0 ? 0 : (prev + 1) % media.length));
  }, [media.length]);

  // Advance the slideshow: photos advance on a timer, videos advance when
  // they finish playing (or after maxVideoDurationMs, whichever is first).
  useEffect(() => {
    if (!started || !current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (current.kind === "photo") {
      timerRef.current = setTimeout(goToNext, photoDurationMs);
    } else if (current.kind === "video" && maxVideoDurationMs) {
      timerRef.current = setTimeout(goToNext, maxVideoDurationMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [started, current, index, photoDurationMs, maxVideoDurationMs, goToNext]);

  // Play the current video from the start whenever it becomes active.
  useEffect(() => {
    if (started && current?.kind === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        /* ignore autoplay rejection; user has already interacted via Begin */
      });
    }
  }, [started, current]);

  // Advance the music playlist track by track, looping back to the start.
  const goToNextTrack = useCallback(() => {
    setTrackIndex((prev) => (music.length === 0 ? 0 : (prev + 1) % music.length));
  }, [music.length]);

  useEffect(() => {
    if (started && audioRef.current && music.length > 0) {
      audioRef.current.play().catch(() => {
        /* ignore autoplay rejection */
      });
    }
  }, [started, trackIndex, music.length]);

  function handleBegin() {
    setStarted(true);
  }

  const currentTrack = music[trackIndex];

  if (media.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-neutral-200">
        <h1 className="mb-4 text-2xl font-light tracking-wide">{name}</h1>
        <p className="max-w-md text-neutral-400">
          No photos or videos have been added yet. Once memories arrive by
          email, they will appear here automatically.
        </p>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
        <h1 className="mb-3 text-3xl font-light tracking-wide text-neutral-100 sm:text-4xl">
          {name}
        </h1>
        <p className="mb-6 text-neutral-400">{dates}</p>
        <p className="mb-10 max-w-lg text-neutral-300">{message}</p>
        <button
          onClick={handleBegin}
          className="rounded-full border border-neutral-500 px-8 py-3 text-neutral-100 transition-colors hover:bg-neutral-800"
        >
          Begin
        </button>
        <p className="mt-4 text-xs text-neutral-500">
          Plays photos, videos, and music
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black">
      {current.kind === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current.pathname}
          src={current.url}
          alt=""
          className="max-h-screen max-w-full object-contain"
        />
      ) : (
        <video
          key={current.pathname}
          ref={videoRef}
          src={current.url}
          className="max-h-screen max-w-full object-contain"
          muted={muted}
          playsInline
          onEnded={goToNext}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-neutral-300">
        <span>{name}</span>
        <span>
          {index + 1} / {media.length}
        </span>
      </div>

      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-2 text-xs text-neutral-200 hover:bg-black/70"
      >
        {muted ? "Video muted" : "Video sound on"}
      </button>

      {music.length > 0 && currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.url}
          onEnded={goToNextTrack}
          autoPlay
        />
      )}
    </main>
  );
}
