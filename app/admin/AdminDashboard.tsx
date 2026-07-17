"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MediaItem } from "@/lib/media";

interface Props {
  initialMedia: MediaItem[];
}

export default function AdminDashboard({ initialMedia }: Props) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const router = useRouter();

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

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

    const updated = [...media];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, dragged);
    setMedia(updated);

    dragItem.current = null;
    dragOverItem.current = null;
  }, [media]);

  const saveOrder = async () => {
    setSaving(true);
    try {
      const order = media.map((m) => m.pathname);
      const res = await fetch("/api/admin/reorder", {
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

  const handleDelete = async (pathname: string) => {
    if (!confirm(`Delete ${pathname}? This cannot be undone.`)) return;

    setDeleting(pathname);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setMedia((prev) => prev.filter((m) => m.pathname !== pathname));
      showMessage("success", "Deleted");
    } catch {
      showMessage("error", "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-light text-neutral-200">
            Media Admin
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">
              {media.length} items
            </span>
            <button
              onClick={saveOrder}
              disabled={saving}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Order"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
            >
              Logout
            </button>
          </div>
        </div>

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

        {/* Instructions */}
        <p className="mb-6 text-sm text-neutral-500">
          Drag items to reorder, then click &quot;Save Order&quot; to persist.
          Changes affect the slideshow immediately after saving.
        </p>

        {/* Media grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {media.map((item, index) => (
            <div
              key={item.pathname}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className="group relative cursor-grab overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-neutral-600 active:cursor-grabbing"
            >
              {/* Thumbnail */}
              <div className="aspect-square">
                {item.kind === "photo" ? (
                  <img
                    src={item.url}
                    alt={item.pathname}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-800">
                    <span className="text-3xl">🎬</span>
                  </div>
                )}
              </div>

              {/* Order number badge */}
              <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-neutral-300">
                {index + 1}
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(item.pathname)}
                disabled={deleting === item.pathname}
                className="absolute right-2 top-2 rounded bg-red-900/80 px-2 py-0.5 text-xs text-red-200 opacity-0 transition hover:bg-red-800 group-hover:opacity-100 disabled:opacity-50"
                title="Delete"
              >
                {deleting === item.pathname ? "..." : "✕"}
              </button>

              {/* Filename */}
              <div className="truncate px-2 py-1.5 text-xs text-neutral-500">
                {item.pathname.split("/").pop()}
              </div>
            </div>
          ))}
        </div>

        {media.length === 0 && (
          <div className="py-20 text-center text-neutral-500">
            No media found. Upload photos via the Gmail import.
          </div>
        )}
      </div>
    </main>
  );
}
