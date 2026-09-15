"use client";

import { useState } from "react";
import Spinner from "@/components/ui/Spinner";

interface BulkDeleteModalProps {
  count: number;
  onCancel: () => void;
  onConfirm: (password: string) => Promise<{ success: boolean; message?: string }>;
}

export default function BulkDeleteModal({ count, onCancel, onConfirm }: BulkDeleteModalProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !password) return;
    setSubmitting(true);
    setError(null);

    const result = await onConfirm(password);

    if (!result.success) {
      setError(result.message || "Something went wrong. Please try again.");
      setPassword("");
      setSubmitting(false);
    }
    // On success the parent unmounts this modal, so no need to reset state here.
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm animate-pop-in rounded-2xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900 p-6 shadow-premium"
      >
        <h2 id="bulk-delete-title" className="text-lg font-semibold text-neutral-900 dark:text-ink-100">
          Delete {count} participant{count === 1 ? "" : "s"}?
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-ink-300">
          This permanently deletes {count === 1 ? "this participant" : "these participants"} and returns{" "}
          {count === 1 ? "their" : "each of their"} awarded prize to the available inventory, making it
          winnable again.
        </p>

        <div className="mt-4">
          <label htmlFor="bulk-delete-password" className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-ink-200">
            Confirm your admin password
          </label>
          <input
            id="bulk-delete-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-4 py-2.5 text-sm text-neutral-900 dark:text-ink-100 outline-none focus:border-gold-400/70 focus:ring-2 focus:ring-gold-400/50"
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-ink-600 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-ink-200 transition-colors hover:border-neutral-400 dark:hover:border-ink-500 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !password}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-red-500 to-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Spinner />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
