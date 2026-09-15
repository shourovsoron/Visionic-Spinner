import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Spin & Win",
  description: "Enter your details for a chance to win.",
};

// Runs before paint so the page never flashes the wrong theme. Default is light —
// dark only applies once the visitor has explicitly toggled it (stored in localStorage).
const THEME_INIT_SCRIPT = `(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-neutral-50 dark:bg-ink-950 font-sans text-neutral-900 dark:text-ink-100 antialiased">{children}</body>
    </html>
  );
}
