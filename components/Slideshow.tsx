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
  photosPerSlide: number;
}

export default function Slideshow({
  media,
  music,
  name,
  dates,
  message,
  photoDurationMs,
  maxVideoDurationMs,
  photosPerSlide,
}: SlideshowProps) {
  const [started, setStarted] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group media into slides based on photosPerSlide
  // Videos always get their own slide (full screen)
  const slides: MediaItem[][] = [];
  let photoBuffer: MediaItem[] = [];

  for (const item of media) {
    if (item.kind === "video") {
      // Flush any buffered photos first
      if (photoBuffer.length > 0) {
        while (photoBuffer.length > 0) {
          slides.push(photoBuffer.splice(0, photosPerSlide));
        }
      }
      slides.push([item]);
    } else {
      photoBuffer.push(item);
      if (photoBuffer.length === photosPerSlide) {
        slides.push(photoBuffer.splice(0, photosPerSlide));
      }
    }
  }
  // Flush remaining photos
  if (photoBuffer.length > 0) {
    slides.push(photoBuffer);
  }

  const totalSlides = slides.length;
  const currentSlide = slides[slideIndex] || [];
  const isVideoSlide = currentSlide.length === 1 && currentSlide[0].kind === "video";

  const goToNext = useCallback(() => {
    setSlideIndex((prev) => {
      if (totalSlides === 0) return 0;
      // Stop at the last slide instead of looping
      if (prev >= totalSlides - 1) return prev;
      return prev + 1;
    });
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setSlideIndex((prev) => (prev <= 0 ? 0 : prev - 1));
  }, []);

  // Advance the slideshow
  useEffect(() => {
    if (!started || currentSlide.length === 0 || paused) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isVideoSlide) {
      if (maxVideoDurationMs) {
        timerRef.current = setTimeout(goToNext, maxVideoDurationMs);
      }
    } else {
      timerRef.current = setTimeout(goToNext, photoDurationMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [started, slideIndex, currentSlide, isVideoSlide, paused, photoDurationMs, maxVideoDurationMs, goToNext]);

  // Play video when it becomes active
  useEffect(() => {
    if (started && isVideoSlide && videoRef.current) {
      if (paused) {
        videoRef.current.pause();
      } else {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [started, slideIndex, isVideoSlide, paused]);

  // Pause/resume audio
  useEffect(() => {
    if (!audioRef.current) return;
    if (paused) {
      audioRef.current.pause();
    } else if (started) {
      audioRef.current.play().catch(() => {});
    }
  }, [paused, started]);

  // Advance music
  const goToNextTrack = useCallback(() => {
    setTrackIndex((prev) => (music.length === 0 ? 0 : (prev + 1) % music.length));
  }, [music.length]);

  useEffect(() => {
    if (started && audioRef.current && music.length > 0) {
      audioRef.current.play().catch(() => {});
    }
  }, [started, trackIndex, music.length]);

  function handleBegin() {
    setStarted(true);
  }

  // Keyboard controls: arrow keys for forward/back, F for fullscreen, space for pause
  useEffect(() => {
    if (!started) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, goToNext, goToPrev]);

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

  const togglePause = () => setPaused((p) => !p);

  return (
    <main
      onClick={togglePause}
      className="relative flex min-h-screen cursor-pointer items-center justify-center bg-black"
    >
      {isVideoSlide ? (
        <video
          key={currentSlide[0].pathname}
          ref={videoRef}
          src={currentSlide[0].url}
          className="max-h-screen max-w-full object-contain"
          muted={muted}
          playsInline
          onEnded={goToNext}
        />
      ) : currentSlide.length === 1 ? (
        // Single photo — full screen
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={currentSlide[0].pathname}
          src={currentSlide[0].url}
          alt=""
          className="max-h-screen max-w-full object-contain"
        />
      ) : currentSlide.length === 2 ? (
        // Two photos side by side
        <div key={slideIndex} className="flex h-screen w-full items-center justify-center gap-2 p-4">
          {currentSlide.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.pathname}
              src={item.url}
              alt=""
              className="max-h-full max-w-[49%] object-contain"
            />
          ))}
        </div>
      ) : (
        // 4 photos in a 2x2 grid
        <div key={slideIndex} className="grid h-screen w-full grid-cols-2 grid-rows-2 gap-2 p-4">
          {currentSlide.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.pathname}
              src={item.url}
              alt=""
              className="h-full w-full object-contain"
            />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-neutral-300">
        <span>{name}</span>
        <span>
          {slideIndex + 1} / {totalSlides}
        </span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-2 text-xs text-neutral-200 hover:bg-black/70"
      >
        {muted ? "Video muted" : "Video sound on"}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }}
        aria-label="Toggle fullscreen"
        className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-2 text-xs text-neutral-200 hover:bg-black/70"
      >
        Fullscreen
      </button>

      {/* Pause indicator */}
      {paused && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-6">
          <span className="text-4xl text-white">⏸</span>
        </div>
      )}

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
