"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reflects whatever the no-flash init script in the document head already applied.
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage may be unavailable (private browsing, blocked cookies) — theme
      // still applies for this page view, it just won't persist.
    }
  }

  // Avoid rendering a possibly-wrong icon before we've read the real state on mount.
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle dark mode"
        disabled
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 dark:border-ink-600 opacity-0 ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-ink-600 dark:bg-ink-800/70 dark:text-ink-300 dark:hover:border-ink-500 dark:hover:text-ink-100 ${className}`}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20.5 14.2a8.5 8.5 0 1 1-9.7-11 7 7 0 0 0 9.7 11z"
          />
        </svg>
      )}
    </button>
  );
}
