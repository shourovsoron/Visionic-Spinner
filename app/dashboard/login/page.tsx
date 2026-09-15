"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError(data.message || "Invalid username or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-ink-950 px-4">
      <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/70 p-8 shadow-premium"
      >
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-ink-100">Admin Login</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-ink-400">Spin &amp; Win campaign dashboard</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-ink-200">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-4 py-2.5 text-sm text-neutral-900 dark:text-ink-100 outline-none focus:border-gold-400/70 focus:ring-2 focus:ring-gold-400/50"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-ink-200">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-4 py-2.5 text-sm text-neutral-900 dark:text-ink-100 outline-none focus:border-gold-400/70 focus:ring-2 focus:ring-gold-400/50"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-6 py-3 text-sm font-semibold text-ink-950 shadow-glow transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Spinner />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </main>
  );
}
