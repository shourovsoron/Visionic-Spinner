"use client";

import { useState } from "react";

interface SpinResultProps {
  prizeLabel: string;
  couponCode: string | null;
}

export default function SpinResult({ prizeLabel, couponCode }: SpinResultProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!couponCode) return;
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-md animate-pop-in rounded-2xl border border-gold-400/30 bg-white dark:bg-ink-900/80 p-8 text-center shadow-premium"
    >
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold-400/50 bg-gold-400/10 shadow-glow">
        <span className="text-3xl" aria-hidden="true">
          🎉
        </span>
      </div>

      <p className="text-sm font-medium uppercase tracking-widest text-gold-600 dark:text-gold-400">Congratulations!</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-ink-100 sm:text-3xl">
        You Won {prizeLabel}!
      </h2>

      {couponCode && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-ink-400">Your Coupon Code</p>
          <div className="flex items-center justify-center gap-2 rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-4 py-3">
            <code className="text-lg font-semibold tracking-wider text-gold-600 dark:text-gold-300">{couponCode}</code>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 w-full rounded-lg border border-gold-400/50 bg-gold-400/10 px-4 py-2.5 text-sm font-semibold text-gold-600 dark:text-gold-300 transition-colors hover:bg-gold-400/20"
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
      )}

      {!couponCode && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-ink-300">
          Our team will reach out with details on redeeming your prize.
        </p>
      )}

      <p className="mt-6 text-xs text-neutral-400 dark:text-ink-500">You&apos;ve already claimed your spin for this campaign.</p>
    </div>
  );
}
