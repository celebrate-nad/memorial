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
  const [beginPhoto, setBeginPhoto] = useState<string | null>(initialSettings.beginPhoto);
  const [endPhoto, setEndPhoto] = useState<string | null>(initialSettings.endPhoto);
  const [picker, setPicker] = useState<"begin" | "end" | null>(null);
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
        body: JSON.stringify({ photosPerSlide, slideDurationMs, beginPhoto, endPhoto }),
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

  const totalSlides = Math.ceil(100 / photosPerSlide);
  const totalMinutes = (totalSlides * slideDurationMs) / 1000 / 60;

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

        {/* Beginning & Ending Slides */}
        <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-6 text-lg font-light text-neutral-200">Beginning &amp; Ending Slides</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Beginning slide */}
            <div>
              <label className="mb-2 block text-sm text-neutral-400">First Slide</label>
              {beginPhoto ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beginPhoto}
                    alt="Beginning slide"
                    className="w-full rounded-lg border border-neutral-700 object-cover"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setPicker("begin")}
                      className="text-xs text-neutral-400 transition hover:text-neutral-200"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => setBeginPhoto(null)}
                      className="text-xs text-red-400 transition hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setPicker("begin")}
                  className="w-full rounded border border-dashed border-neutral-600 px-4 py-8 text-sm text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-200"
                >
                  Choose first slide image
                </button>
              )}
            </div>

            {/* Ending slide */}
            <div>
              <label className="mb-2 block text-sm text-neutral-400">Last Slide</label>
              {endPhoto ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={endPhoto}
                    alt="Ending slide"
                    className="w-full rounded-lg border border-neutral-700 object-cover"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setPicker("end")}
                      className="text-xs text-neutral-400 transition hover:text-neutral-200"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => setEndPhoto(null)}
                      className="text-xs text-red-400 transition hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setPicker("end")}
                  className="w-full rounded border border-dashed border-neutral-600 px-4 py-8 text-sm text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-200"
                >
                  Choose last slide image
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Photo picker modal */}
        {picker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg text-neutral-200">
                  Choose {picker === "begin" ? "first" : "last"} slide
                </h3>
                <button
                  onClick={() => setPicker(null)}
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
                      if (picker === "begin") setBeginPhoto(photo.url);
                      else setEndPhoto(photo.url);
                      setPicker(null);
                    }}
                    className="overflow-hidden rounded-lg border border-neutral-700 transition hover:border-neutral-500"
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

        {/* Slideshow Settings */}
        <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-6 text-lg font-light text-neutral-200">Slideshow Settings</h2>

          {/* Photos per slide */}
          <div className="mb-6">
            <label className="mb-2 block text-sm text-neutral-400">Photos per slide</label>
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
          </div>

          {/* Slide duration */}
          <div className="mb-6">
            <label className="mb-2 block text-sm text-neutral-400">Duration per slide (seconds)</label>
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
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-neutral-400">
                Pre-composited slides (2-per-page at 1920×1080) + music. Ready to import into Canva as a video.
              </p>
              <a
                href="/api/admin/download?format=slides"
                className="inline-block rounded bg-blue-700 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
              >
                Download Slides + Music ZIP
              </a>
            </div>
            <div>
              <p className="mb-2 text-sm text-neutral-400">
                Individual photos (numbered) + music. For custom editing.
              </p>
              <a
                href="/api/admin/download"
                className="inline-block rounded bg-neutral-700 px-6 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-600"
              >
                Download Raw Photos + Music ZIP
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
