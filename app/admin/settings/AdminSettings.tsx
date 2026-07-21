"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";
import { SlideshowSettings } from "@/lib/slideshow-settings";

interface Props {
  initialSettings: SlideshowSettings;
}

export default function AdminSettings({ initialSettings }: Props) {
  const [photosPerSlide, setPhotosPerSlide] = useState(initialSettings.photosPerSlide);
  const [slideDurationMs, setSlideDurationMs] = useState(initialSettings.slideDurationMs);
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
        body: JSON.stringify({ photosPerSlide, slideDurationMs }),
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
  const totalSlides = Math.ceil(100 / photosPerSlide); // rough estimate
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

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
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

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-700 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
