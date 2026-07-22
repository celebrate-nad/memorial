"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";

interface DuplicateItem {
  pathname: string;
  url: string;
  uploadedAt: string;
  size: number;
}

interface DuplicateGroup {
  hash: string;
  items: DuplicateItem[];
}

export default function AdminDuplicates() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/duplicates");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setDuplicates(data.duplicates);
      } catch {
        showMessage("error", "Failed to detect duplicates");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDelete = async (pathname: string, groupHash: string) => {
    setDeleting(pathname);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });
      if (!res.ok) throw new Error("Failed to delete");

      // Remove from local state
      setDuplicates((prev) =>
        prev
          .map((group) => {
            if (group.hash !== groupHash) return group;
            return {
              ...group,
              items: group.items.filter((item) => item.pathname !== pathname),
            };
          })
          .filter((group) => group.items.length >= 2),
      );
      showMessage("success", "Deleted");
    } catch {
      showMessage("error", "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAllDuplicates = async () => {
    // For each group, delete everything except the first item (oldest)
    const toDelete: { pathname: string; groupHash: string }[] = [];
    for (const group of duplicates) {
      for (let i = 1; i < group.items.length; i++) {
        toDelete.push({ pathname: group.items[i].pathname, groupHash: group.hash });
      }
    }

    if (
      !confirm(
        `Delete ${toDelete.length} duplicate(s), keeping the highest resolution copy of each? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting("all");
    let deleted = 0;
    for (const { pathname } of toDelete) {
      try {
        const res = await fetch("/api/admin/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathname }),
        });
        if (res.ok) deleted++;
      } catch {
        // continue deleting others
      }
    }

    showMessage("success", `Deleted ${deleted} duplicate(s)`);
    setDuplicates([]);
    setDeleting(null);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  const totalDuplicates = duplicates.reduce(
    (sum, group) => sum + group.items.length - 1,
    0,
  );

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="mx-auto max-w-6xl">
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

        <AdminNav active="duplicates" />

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

        {loading ? (
          <div className="py-20 text-center text-neutral-500">
            <p className="mb-2">Scanning for duplicates...</p>
            <p className="text-xs">This may take a moment on first run as files are hashed.</p>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="py-20 text-center text-neutral-500">
            No duplicates found. All photos are unique.
          </div>
        ) : (
          <>
            {/* Action bar */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Found {duplicates.length} group(s) with {totalDuplicates} duplicate(s).
                The highest resolution (largest file) in each group is marked &quot;Keep&quot;.
              </p>
              <button
                onClick={handleDeleteAllDuplicates}
                disabled={deleting !== null}
                className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting === "all" ? "Deleting..." : "Remove All Duplicates"}
              </button>
            </div>

            {/* Duplicate groups */}
            <div className="space-y-8">
              {duplicates.map((group) => (
                <div
                  key={group.hash}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
                >
                  <p className="mb-3 text-xs text-neutral-500">
                    {group.items.length} copies &middot; hash: {group.hash.slice(0, 12)}...
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {group.items.map((item, idx) => (
                      <div
                        key={item.pathname}
                        className="relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800"
                      >
                        <div className="aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={item.pathname}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        {/* Keep / Delete badge */}
                        {idx === 0 ? (
                          <div className="absolute left-2 top-2 rounded bg-green-800/80 px-2 py-0.5 text-xs text-green-200">
                            Keep
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(item.pathname, group.hash)}
                            disabled={deleting === item.pathname}
                            className="absolute right-2 top-2 rounded bg-red-900/80 px-2 py-0.5 text-xs text-red-200 transition hover:bg-red-800 disabled:opacity-50"
                          >
                            {deleting === item.pathname ? "..." : "Delete"}
                          </button>
                        )}

                        <div className="px-2 py-1.5">
                          <div className="truncate text-xs text-neutral-500">
                            {item.pathname.split("/").pop()}
                          </div>
                          <div className="text-xs text-neutral-600">
                            {(item.size / 1024).toFixed(0)} KB &middot; {new Date(item.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
