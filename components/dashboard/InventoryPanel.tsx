"use client";

import { useEffect, useState } from "react";
import { PRIZE_LABELS, PRIZE_TYPES, TOTAL_CAMPAIGN_SPINS, type PrizeType } from "@/lib/prizeTypes";
import Spinner from "@/components/ui/Spinner";

interface InventoryRow {
  prizeType: PrizeType;
  totalQuantity: number;
  remainingQuantity: number;
}

export default function InventoryPanel() {
  const [inventory, setInventory] = useState<InventoryRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/inventory", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/dashboard/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load inventory.");
        return;
      }
      setError(null);
      setInventory(data.inventory);
      setDrafts(
        Object.fromEntries((data.inventory as InventoryRow[]).map((r) => [r.prizeType, String(r.totalQuantity)]))
      );
    } catch {
      setError("Failed to load inventory.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const draftTotal = PRIZE_TYPES.reduce((sum, type) => sum + (Number(drafts[type]) || 0), 0);
  const draftValid = draftTotal === TOTAL_CAMPAIGN_SPINS;

  async function handleSave() {
    if (!draftValid || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: PRIZE_TYPES.map((prizeType) => ({
            prizeType,
            totalQuantity: Number(drafts[prizeType]) || 0,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to update inventory.");
        return;
      }

      setMessage("Inventory updated.");
      await load();
    } catch {
      setError("Failed to update inventory.");
    } finally {
      setSaving(false);
    }
  }

  if (!inventory) {
    if (error) {
      return (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      );
    }
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-neutral-500 dark:text-ink-400" role="status" aria-live="polite">
        <Spinner className="text-gold-600 dark:text-gold-400" />
        Loading inventory...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/60 p-5">
        <p className="text-sm text-neutral-600 dark:text-ink-300">
          Total inventory across all prize types must always equal exactly{" "}
          <span className="font-semibold text-gold-600 dark:text-gold-400">{TOTAL_CAMPAIGN_SPINS}</span>. A total can never be
          set below the number of that prize already awarded.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {inventory.map((row) => (
            <div key={row.prizeType} className="rounded-lg border border-neutral-200 dark:border-ink-700/60 bg-neutral-100 dark:bg-ink-800/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-ink-400">
                {PRIZE_LABELS[row.prizeType]}
              </p>
              <p className="mt-1 text-xs text-neutral-400 dark:text-ink-500">Remaining: {row.remainingQuantity}</p>
              <label htmlFor={`total-${row.prizeType}`} className="mt-3 block text-xs text-neutral-500 dark:text-ink-400">
                Total
              </label>
              <input
                id={`total-${row.prizeType}`}
                type="number"
                min={0}
                value={drafts[row.prizeType] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [row.prizeType]: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-3 py-2 text-sm text-neutral-900 dark:text-ink-100 outline-none focus:border-gold-400/70"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className={`text-sm ${draftValid ? "text-neutral-500 dark:text-ink-400" : "text-red-600 dark:text-red-400"}`}>
            Sum: {draftTotal} / {TOTAL_CAMPAIGN_SPINS}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={!draftValid || saving}
            className="ml-auto flex items-center gap-2 rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Spinner />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {message && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      </div>
    </div>
  );
}
