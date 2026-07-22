"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MusicItem } from "@/lib/media";
import AdminNav from "../AdminNav";

interface Props {
  initialMusic: MusicItem[];
}

export default function AdminMusic({ initialMusic }: Props) {
  const [tracks, setTracks] = useState<MusicItem[]>(initialMusic);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch("/api/admin/music", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = `Upload failed (${res.status})`;
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } else {
          const text = await res.text();
          errorMsg = text.slice(0, 150) || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      showMessage("success", `Uploaded ${data.uploaded.length} track(s)`);

      // Refresh the track list
      const listRes = await fetch("/api/admin/music");
      if (listRes.ok) {
        const listData = await listRes.json();
        setTracks(listData.music);
      }
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete
  const handleDelete = async (pathname: string) => {
    if (!confirm(`Delete ${pathname.split("/").pop()}?`)) return;

    setDeleting(pathname);
    try {
      const res = await fetch("/api/admin/music/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setTracks((prev) => prev.filter((t) => t.pathname !== pathname));
      if (playing === pathname) {
        audioRef.current?.pause();
        setPlaying(null);
      }
      showMessage("success", "Deleted");
    } catch {
      showMessage("error", "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  // Drag reorder
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const updated = [...tracks];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, dragged);
    setTracks(updated);

    dragItem.current = null;
    dragOverItem.current = null;
  }, [tracks]);

  // Save order
  const saveOrder = async () => {
    setSaving(true);
    try {
      const order = tracks.map((t) => t.pathname);
      const res = await fetch("/api/admin/music/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error("Failed to save");
      showMessage("success", "Order saved");
    } catch {
      showMessage("error", "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  // Preview playback
  const togglePlay = (track: MusicItem) => {
    if (playing === track.pathname) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play();
      }
      setPlaying(track.pathname);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

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

        <AdminNav active="music" />

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

        {/* Upload zone */}
        <div className="mb-8 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900 p-8 text-center">
          <p className="mb-3 text-sm text-neutral-400">
            Upload audio files (mp3, m4a, wav, ogg, aac)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            id="music-upload"
          />
          <label
            htmlFor="music-upload"
            className={`inline-block cursor-pointer rounded bg-neutral-700 px-6 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-600 ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {uploading ? "Uploading..." : "Choose Files"}
          </label>
        </div>

        {/* Action bar */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {tracks.length} track(s). Drag to reorder.
          </p>
          <button
            onClick={saveOrder}
            disabled={saving}
            className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>

        {/* Track list */}
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div
              key={track.pathname}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className="flex cursor-grab items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 transition hover:border-neutral-600 active:cursor-grabbing"
            >
              {/* Order number */}
              <span className="w-6 text-center text-sm text-neutral-500">
                {index + 1}
              </span>

              {/* Drag handle */}
              <span className="text-neutral-600">⠿</span>

              {/* Track name */}
              <span className="flex-1 truncate text-sm text-neutral-300">
                {track.pathname.split("/").pop()}
              </span>

              {/* Play/Pause */}
              <button
                onClick={() => togglePlay(track)}
                className="rounded px-3 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
              >
                {playing === track.pathname ? "⏸ Pause" : "▶ Play"}
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(track.pathname)}
                disabled={deleting === track.pathname}
                className="rounded px-3 py-1 text-xs text-red-400 transition hover:bg-red-900/30 hover:text-red-300 disabled:opacity-50"
              >
                {deleting === track.pathname ? "..." : "Delete"}
              </button>
            </div>
          ))}
        </div>

        {tracks.length === 0 && (
          <div className="py-12 text-center text-neutral-500">
            No music uploaded yet. Use the upload area above to add tracks.
          </div>
        )}

        {/* Hidden audio element for preview */}
        <audio
          ref={audioRef}
          onEnded={() => setPlaying(null)}
          className="hidden"
        />
      </div>
    </main>
  );
}
