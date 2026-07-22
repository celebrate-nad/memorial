"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaItem } from "@/lib/media";
import AdminNav from "./AdminNav";
import PhotoEditor from "./PhotoEditor";

interface Props {
  initialMedia: MediaItem[];
  initialCuration: string[];
}

export default function AdminSelect({ initialMedia, initialCuration }: Props) {
  const [selection, setSelection] = useState<string[]>(initialCuration);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleSelection = (pathname: string) => {
    setSelection((prev) => {
      if (prev.includes(pathname)) {
        return prev.filter((p) => p !== pathname);
      }
      // Add to end — order determined by check order
      return [...prev, pathname];
    });
  };

  const saveSelection = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection }),
      });
      if (!res.ok) throw new Error("Failed to save");
      showMessage("success", `Saved ${selection.length} items to memorial`);
    } catch {
      showMessage("error", "Failed to save selection");
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
      setSelection((prev) => prev.filter((p) => p !== pathname));
      showMessage("success", "Deleted");
    } catch {
      showMessage("error", "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (item: MediaItem) => {
    setEditing(item);
  };

  const handleSaveEdit = async (pathname: string, blob: Blob) => {
    console.log("[AdminSelect] handleSaveEdit called", { pathname, blobSize: blob.size, blobType: blob.type });
    const formData = new FormData();
    formData.append("file", blob, "edited.jpg");
    formData.append("pathname", pathname);

    const res = await fetch("/api/admin/replace", {
      method: "POST",
      body: formData,
    });

    let data;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("[AdminSelect] Non-JSON response from /api/admin/replace", { status: res.status, text: text.slice(0, 500) });
      throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
    }

    console.log("[AdminSelect] /api/admin/replace response", { ok: res.ok, status: res.status, data });

    if (!res.ok) {
      showMessage("error", `Failed to save edit: ${data.error || res.status}`);
      throw new Error(data.error || "Failed to save edit");
    }

    // Update local media state with new pathname/url
    setMedia((prev) =>
      prev.map((m) =>
        m.pathname === pathname
          ? { ...m, pathname: data.pathname, url: data.url }
          : m,
      ),
    );

    // Update selection if the old pathname was selected
    setSelection((prev) =>
      prev.map((p) => (p === pathname ? data.pathname : p)),
    );

    setEditing(null);
    showMessage("success", "Photo saved");
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch("/api/admin/upload-photos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      // Add newly uploaded items to the media list
      const newItems: MediaItem[] = data.uploaded.map((item: { pathname: string; url: string; kind: string }) => ({
        pathname: item.pathname,
        url: item.url,
        uploadedAt: new Date().toISOString(),
        kind: item.kind as "photo" | "video",
      }));
      setMedia((prev) => [...prev, ...newItems]);
      showMessage("success", `Uploaded ${data.uploaded.length} file(s)`);
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-light text-neutral-200">
            Media Admin
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
            >
              Logout
            </button>
          </div>
        </div>

        <AdminNav active="select" />

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
        <div className="mb-6 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900 p-6 text-center">
          <p className="mb-3 text-sm text-neutral-400">
            Upload photos or videos
          </p>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`inline-block cursor-pointer rounded bg-neutral-700 px-6 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-600 ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {uploading ? "Uploading..." : "Choose Files"}
          </label>
        </div>

        {/* Action bar */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {selection.length} of {media.length} selected for memorial.
            Check photos in the order you want them to appear.
          </p>
          <button
            onClick={saveSelection}
            disabled={saving}
            className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Memorial Selection"}
          </button>
        </div>

        {/* Media grid with checkboxes */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {media.map((item) => {
            const isSelected = selection.includes(item.pathname);
            const orderIndex = selection.indexOf(item.pathname);

            return (
              <div
                key={item.pathname}
                className={`group relative overflow-hidden rounded-lg border transition ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : "border-neutral-800 hover:border-neutral-600"
                } bg-neutral-900`}
              >
                {/* Checkbox area — clicking the image toggles selection */}
                <button
                  onClick={() => toggleSelection(item.pathname)}
                  className="aspect-square w-full cursor-pointer"
                  type="button"
                >
                  {item.kind === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
                </button>

                {/* Selection badge with order number */}
                {isSelected && (
                  <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {orderIndex + 1}
                  </div>
                )}

                {/* Unchecked indicator */}
                {!isSelected && (
                  <div className="absolute left-2 top-2 h-6 w-6 rounded-full border-2 border-neutral-500 bg-black/50" />
                )}

                {/* Edit button (photos only) */}
                {item.kind === "photo" && (
                  <button
                    onClick={() => handleEdit(item)}
                    className="absolute right-2 top-8 rounded bg-neutral-800/80 px-2 py-0.5 text-xs text-neutral-200 opacity-0 transition hover:bg-neutral-700 group-hover:opacity-100"
                    title="Edit (crop/rotate)"
                  >
                    ✎
                  </button>
                )}

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(item.pathname)}
                  disabled={deleting === item.pathname}
                  className="absolute right-2 top-2 rounded bg-red-900/80 px-2 py-0.5 text-xs text-red-200 opacity-0 transition hover:bg-red-800 group-hover:opacity-100 disabled:opacity-50"
                  title="Delete permanently"
                >
                  {deleting === item.pathname ? "..." : "✕"}
                </button>

                {/* Filename */}
                <div className="truncate px-2 py-1.5 text-xs text-neutral-500">
                  {item.pathname.split("/").pop()}
                </div>
              </div>
            );
          })}
        </div>

        {media.length === 0 && (
          <div className="py-20 text-center text-neutral-500">
            No media found. Upload photos via the Gmail import.
          </div>
        )}
      </div>

      {/* Photo editor modal */}
      {editing && (
        <PhotoEditor
          imageUrl={editing.url}
          pathname={editing.pathname}
          onSave={handleSaveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
