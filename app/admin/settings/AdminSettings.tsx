"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";
import { SlideshowSettings } from "@/lib/slideshow-settings";
import { MediaItem } from "@/lib/media";

interface Props {
  initialSettings: SlideshowSettings;
  photos: MediaItem[];
}

export default function AdminSettings({ initialSettings, photos }: Props) {
  const [photosPerSlide, setPhotosPerSlide] = useState(initialSettings.photosPerSlide);
  const [slideDurationMs, setSlideDurationMs] = useState(initialSettings.slideDurationMs);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(initialSettings.coverPhoto);
  const [coverText, setCoverText] = useState(initialSettings.coverText);
  const [coverSubtext, setCoverSubtext] = useState(initialSettings.coverSubtext);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photosPerSlide, slideDurationMs, coverPhoto, coverText, coverSubtext }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      showMessage("success", "Settings saved");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  // Calculate estimated total time
  const totalSlides = Math.ceil(100 / photosPerSlide);
  const totalMinutes = (totalSlides * slideDurationMs) / 1000 / 60;

  const selectedCoverPhoto = photos.find((p) => p.url === coverPhoto);

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-light text-neutral-200">Media Admin</h1>
          <button
            onClick={handleLogout}
            className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
          >
            Logout
          </button>
        </div>

        <AdminNav active="settings" />

        {/* Message toast */}
        {message && (
          <div
            className={`mb-4 rounded px-4 py-2 text-sm ${
              message.type === "success"
                ? "bg-green-900/30 text-green-300"
                : "bg-red-900/30 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Cover Page Section */}
        <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-6 text-lg font-light text-neutral-200">Cover Page</h2>

          {/* Cover photo picker */}
          <div className="mb-4">
            <label className="mb-2 block text-sm text-neutral-400">Cover Photo</label>
            {coverPhoto ? (
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPhoto}
                  alt="Cover"
                  className="h-32 w-48 rounded-lg border border-neutral-700 object-cover"
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowPhotoPicker(true)}
                    className="text-sm text-neutral-400 transition hover:text-neutral-200"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => setCoverPhoto(null)}
                    className="text-sm text-red-400 transition hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPhotoPicker(true)}
                className="rounded border border-dashed border-neutral-600 px-6 py-4 text-sm text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-200"
              >
                Choose a cover photo
              </button>
            )}
          </div>

          {/* Cover text */}
          <div className="mb-4">
            <label className="mb-2 block text-sm text-neutral-400">
              Main Text
            </label>
            <input
              type="text"
              value={coverText}
              onChange={(e) => setCoverText(e.target.value)}
              placeholder="In Loving Memory of..."
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm text-neutral-400">
              Subtext
            </label>
            <input
              type="text"
              value={coverSubtext}
              onChange={(e) => setCoverSubtext(e.target.value)}
              placeholder="December 21, 1979 – July 17, 2026"
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          {/* Preview */}
          {(coverPhoto || coverText) && (
            <div className="mt-4 overflow-hidden rounded-lg border border-neutral-700">
              <div className="relative flex aspect-video items-center justify-center bg-black">
                {coverPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPhoto}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-50"
                  />
                )}
                <div className="relative z-10 text-center px-6">
                  {coverText && (
                    <p className="text-2xl font-light text-white">{coverText}</p>
                  )}
                  {coverSubtext && (
                    <p className="mt-2 text-sm text-neutral-300">{coverSubtext}</p>
                  )}
                </div>
              </div>
              <div className="bg-neutral-800 px-3 py-1.5 text-xs text-neutral-500">
                Cover page preview
              </div>
            </div>
          )}
        </div>

        {/* Photo picker modal */}
        {showPhotoPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg text-neutral-200">Choose cover photo</h3>
                <button
                  onClick={() => setShowPhotoPicker(false)}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {photos.map((photo) => (
                  <button
                    key={photo.pathname}
                    onClick={() => {
                      setCoverPhoto(photo.url);
                      setShowPhotoPicker(false);
                    }}
                    className={`overflow-hidden rounded-lg border transition ${
                      coverPhoto === photo.url
                        ? "border-blue-500 ring-2 ring-blue-500/30"
                        : "border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Slideshow Settings Section */}
        <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-6 text-lg font-light text-neutral-200">Slideshow Settings</h2>

          {/* Photos per slide */}
          <div className="mb-6">
            <label className="mb-2 block text-sm text-neutral-400">
              Photos per slide
            </label>
            <div className="flex gap-3">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setPhotosPerSlide(n)}
                  className={`rounded-lg border px-6 py-3 text-sm font-medium transition ${
                    photosPerSlide === n
                      ? "border-blue-500 bg-blue-900/30 text-blue-200"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                  }`}
                >
                  {n === 1 ? "1 (full screen)" : `${n} (grid)`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              {photosPerSlide === 1 && "Each photo takes up the full screen."}
              {photosPerSlide === 2 && "Two photos side by side per slide."}
              {photosPerSlide === 4 && "Four photos in a 2×2 grid per slide."}
            </p>
          </div>

          {/* Slide duration */}
          <div className="mb-6">
            <label className="mb-2 block text-sm text-neutral-400">
              Duration per slide (seconds)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={slideDurationMs / 1000}
                onChange={(e) => setSlideDurationMs(Number(e.target.value) * 1000)}
                className="w-64"
              />
              <span className="w-16 text-sm text-neutral-300">
                {(slideDurationMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Estimate */}
          <div className="mb-6 rounded bg-neutral-800 px-4 py-3 text-sm text-neutral-400">
            With {photosPerSlide} photo(s) per slide at {(slideDurationMs / 1000).toFixed(1)}s each,
            100 photos would take ~{totalMinutes.toFixed(1)} minutes.
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-700 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save All Settings"}
        </button>

        {/* Download */}
        <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-lg font-light text-neutral-200">Download</h2>
          <p className="mb-4 text-sm text-neutral-400">
            Download all curated photos (numbered in order) and music tracks as a ZIP file.
          </p>
          <a
            href="/api/admin/download"
            className="inline-block rounded bg-neutral-700 px-6 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-600"
          >
            Download ZIP
          </a>
        </div>
      </div>
    </main>
  );
}
