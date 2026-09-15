"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatsOverview from "./StatsOverview";
import ParticipantsTable from "./ParticipantsTable";
import InventoryPanel from "./InventoryPanel";
import Spinner from "@/components/ui/Spinner";
import ThemeToggle from "@/components/ui/ThemeToggle";

type Tab = "overview" | "participants" | "inventory";

export default function DashboardApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/dashboard/login");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-ink-950 px-4 py-10 text-neutral-900 dark:text-ink-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">
              Spin &amp; Win
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Campaign Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-ink-600 bg-neutral-100 dark:bg-ink-800/70 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-ink-200 transition-colors hover:border-neutral-400 dark:hover:border-ink-500 disabled:opacity-60"
            >
              {loggingOut ? (
                <>
                  <Spinner />
                  Logging out...
                </>
              ) : (
                "Log Out"
              )}
            </button>
          </div>
        </div>

        <nav className="mb-8 flex gap-2 rounded-xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/60 p-1.5" aria-label="Dashboard sections">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            Overview
          </TabButton>
          <TabButton active={tab === "participants"} onClick={() => setTab("participants")}>
            Participants
          </TabButton>
          <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
            Inventory
          </TabButton>
        </nav>

        {tab === "overview" && <StatsOverview />}
        {tab === "participants" && <ParticipantsTable />}
        {tab === "inventory" && <InventoryPanel />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
        active ? "bg-gold-400/15 text-gold-600 dark:text-gold-300" : "text-neutral-600 dark:text-ink-300 hover:text-neutral-900 dark:hover:text-ink-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
