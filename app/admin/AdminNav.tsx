"use client";

import Link from "next/link";

interface Props {
  active: "select" | "reorder" | "duplicates" | "music";
}

export default function AdminNav({ active }: Props) {
  return (
    <nav className="mb-6 flex gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-1">
      <Link
        href="/admin"
        className={`rounded-md px-4 py-2 text-sm transition ${
          active === "select"
            ? "bg-neutral-700 text-neutral-100"
            : "text-neutral-400 hover:text-neutral-200"
        }`}
      >
        Select Photos
      </Link>
      <Link
        href="/admin/reorder"
        className={`rounded-md px-4 py-2 text-sm transition ${
          active === "reorder"
            ? "bg-neutral-700 text-neutral-100"
            : "text-neutral-400 hover:text-neutral-200"
        }`}
      >
        Reorder Memorial
      </Link>
      <Link
        href="/admin/duplicates"
        className={`rounded-md px-4 py-2 text-sm transition ${
          active === "duplicates"
            ? "bg-neutral-700 text-neutral-100"
            : "text-neutral-400 hover:text-neutral-200"
        }`}
      >
        Duplicates
      </Link>
      <Link
        href="/admin/music"
        className={`rounded-md px-4 py-2 text-sm transition ${
          active === "music"
            ? "bg-neutral-700 text-neutral-100"
            : "text-neutral-400 hover:text-neutral-200"
        }`}
      >
        Music
      </Link>
    </nav>
  );
}
