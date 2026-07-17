"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-center text-xl font-light text-neutral-200">
          Admin Login
        </h1>

        {error && (
          <p className="rounded bg-red-900/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <label
            htmlFor="username"
            className="block text-sm text-neutral-400"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm text-neutral-400"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-600 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
