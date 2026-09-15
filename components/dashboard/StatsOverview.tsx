"use client";

import { useEffect, useState } from "react";
import { PRIZE_LABELS, type PrizeType } from "@/lib/prizeTypes";
import Spinner from "@/components/ui/Spinner";

interface InventoryRow {
  prizeType: PrizeType;
  totalQuantity: number;
  remainingQuantity: number;
}

interface StatsResponse {
  totalSpins: number;
  totalCampaignSpins: number;
  spinsRemaining: number;
  inventory: InventoryRow[];
}

export default function StatsOverview() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/dashboard/login";
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.message || "Failed to load statistics.");
          return;
        }
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError("Failed to load statistics.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!stats)
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-neutral-500 dark:text-ink-400" role="status" aria-live="polite">
        <Spinner className="text-gold-600 dark:text-gold-400" />
        Loading statistics...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Spins" value={`${stats.totalSpins} / ${stats.totalCampaignSpins}`} />
        <StatCard label="Spins Remaining" value={String(stats.spinsRemaining)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.inventory.map((row) => (
          <StatCard
            key={row.prizeType}
            label={PRIZE_LABELS[row.prizeType]}
            value={`${row.remainingQuantity} / ${row.totalQuantity}`}
            sublabel="Remaining"
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/60 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-ink-100">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-neutral-400 dark:text-ink-500">{sublabel}</p>}
    </div>
  );
}
