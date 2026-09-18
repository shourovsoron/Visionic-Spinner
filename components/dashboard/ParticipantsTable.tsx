"use client";

import { useCallback, useEffect, useState } from "react";
import { PRIZE_TYPES, type PrizeType } from "@/lib/prizeTypes";
import Spinner from "@/components/ui/Spinner";
import BulkDeleteModal from "./BulkDeleteModal";

interface ParticipantRow {
  _id: string;
  fullName: string;
  phone: string;
  email: string;
  customerType: "individual" | "business";
  website?: string;
  lookingForDesign: "yes" | "no";
  referralPartnership: "yes" | "no";
  prize: PrizeType;
  couponCode?: string;
  createdAt: string;
}

interface ParticipantsResponse {
  items: ParticipantRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const SORT_OPTIONS = [
  { value: "createdAt", label: "Date/Time" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "prize", label: "Prize" },
  { value: "customerType", label: "Customer Type" },
];

function summarizeRestored(
  restoredByPrize: Partial<Record<PrizeType, number>>,
  labels: Record<PrizeType, string>
): string {
  const parts = PRIZE_TYPES.filter((p) => restoredByPrize[p]).map(
    (p) => `${labels[p]} +${restoredByPrize[p]}`
  );
  return parts.length ? ` Restored to inventory: ${parts.join(", ")}.` : "";
}

const FALLBACK_LABELS = Object.fromEntries(PRIZE_TYPES.map((p) => [p, p])) as Record<PrizeType, string>;

export default function ParticipantsTable() {
  const [data, setData] = useState<ParticipantsResponse | null>(null);
  const [labels, setLabels] = useState<Record<PrizeType, string>>(FALLBACK_LABELS);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [prizeFilter, setPrizeFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadParticipants = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      search,
      prize: prizeFilter,
      customerType: customerTypeFilter,
      sortField,
      sortDir,
    });

    try {
      const res = await fetch(`/api/admin/participants?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/dashboard/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Failed to load participants.");
        return;
      }
      setError(null);
      setData(json);
    } catch {
      setError("Failed to load participants.");
    }
  }, [search, prizeFilter, customerTypeFilter, sortField, sortDir, page]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadParticipants();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadParticipants]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/inventory", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const map = Object.fromEntries(
          (json.inventory as { prizeType: PrizeType; label: string }[]).map((r) => [r.prizeType, r.label])
        ) as Record<PrizeType, string>;
        setLabels(map);
      } catch {
        // Keep fallback labels.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  function resetSelectionAndFilter<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
      setSelectedIds(new Set());
    };
  }

  const items = data?.items ?? [];
  const allOnPageSelected = items.length > 0 && items.every((row) => selectedIds.has(row._id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allOnPageSelected) {
        const next = new Set(prev);
        items.forEach((row) => next.delete(row._id));
        return next;
      }
      const next = new Set(prev);
      items.forEach((row) => next.add(row._id));
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteOne(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }

    setDeletingId(id);
    setConfirmingId(null);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedback({ type: "error", message: json.message || "Failed to delete participant." });
        return;
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setFeedback({
        type: "success",
        message: `Participant deleted.${summarizeRestored(json.restoredByPrize, labels)}`,
      });
      await loadParticipants();
    } catch {
      setFeedback({ type: "error", message: "Failed to delete participant." });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete(password: string): Promise<{ success: boolean; message?: string }> {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/participants/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), password }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "Failed to delete participants." };
      }

      setBulkModalOpen(false);
      setSelectedIds(new Set());
      setFeedback({
        type: "success",
        message: `Deleted ${json.deletedCount} participant${json.deletedCount === 1 ? "" : "s"}.${summarizeRestored(
          json.restoredByPrize,
          labels
        )}`,
      });
      await loadParticipants();
      return { success: true };
    } catch {
      return { success: false, message: "Failed to delete participants." };
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/60 p-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="search" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-ink-400">
            Search (name, email, or phone)
          </label>
          <input
            id="search"
            value={search}
            onChange={(e) => resetSelectionAndFilter(setSearch)(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-3 py-2 text-sm text-neutral-900 dark:text-ink-100 outline-none focus:border-gold-400/70"
          />
        </div>

        <div>
          <label htmlFor="prizeFilter" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-ink-400">
            Prize
          </label>
          <select
            id="prizeFilter"
            value={prizeFilter}
            onChange={(e) => resetSelectionAndFilter(setPrizeFilter)(e.target.value)}
            className="rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-3 py-2 text-sm text-neutral-900 dark:text-ink-100 outline-none focus:border-gold-400/70"
          >
            <option value="">All prizes</option>
            {PRIZE_TYPES.map((p) => (
              <option key={p} value={p}>
                {labels[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="customerTypeFilter" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-ink-400">
            Customer Type
          </label>
          <select
            id="customerTypeFilter"
            value={customerTypeFilter}
            onChange={(e) => resetSelectionAndFilter(setCustomerTypeFilter)(e.target.value)}
            className="rounded-lg border border-neutral-300 dark:border-ink-600 bg-white dark:bg-ink-800/80 px-3 py-2 text-sm text-neutral-900 dark:text-ink-100 outline-none focus:border-gold-400/70"
          >
            <option value="">All</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </select>
        </div>

        <a
          href="/api/admin/export"
          className="ml-auto rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow transition-all hover:brightness-105"
        >
          Export CSV
        </a>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold-400/30 bg-gold-400/10 px-4 py-3">
          <span className="text-sm font-medium text-gold-600 dark:text-gold-300">{selectedIds.size} selected</span>
          <p className="text-xs text-neutral-600 dark:text-ink-300">Deleting winners returns their prizes to the available inventory.</p>
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="ml-auto rounded-lg bg-gradient-to-b from-red-500 to-red-700 px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-105"
          >
            Delete Selected
          </button>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/60">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-ink-700/60 text-xs uppercase tracking-wide text-neutral-500 dark:text-ink-400">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all participants on this page"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-neutral-400 dark:border-ink-500 accent-gold-400"
                />
              </th>
              <SortableHeader field="fullName" label="Full Name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHeader field="phone" label="Phone" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHeader field="email" label="Email" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHeader
                field="customerType"
                label="Customer Type"
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">Design Services</th>
              <th className="px-4 py-3 font-medium">Referral/Partnership</th>
              <SortableHeader field="prize" label="Prize" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 font-medium">Coupon Code</th>
              <SortableHeader
                field="createdAt"
                label="Date/Time"
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row._id} className="border-b border-neutral-200 dark:border-ink-800/60 text-neutral-700 dark:text-ink-200">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.email}`}
                    checked={selectedIds.has(row._id)}
                    onChange={() => toggleSelectOne(row._id)}
                    className="h-4 w-4 rounded border-neutral-400 dark:border-ink-500 accent-gold-400"
                  />
                </td>
                <td className="px-4 py-3">{row.fullName}</td>
                <td className="px-4 py-3">{row.phone}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3 capitalize">{row.customerType}</td>
                <td className="px-4 py-3">
                  {row.website ? (
                    <a href={row.website} target="_blank" rel="noreferrer" className="text-gold-600 dark:text-gold-400 hover:underline">
                      {row.website}
                    </a>
                  ) : (
                    <span className="text-neutral-400 dark:text-ink-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize">{row.lookingForDesign}</td>
                <td className="px-4 py-3 capitalize">{row.referralPartnership}</td>
                <td className="px-4 py-3">{labels[row.prize]}</td>
                <td className="px-4 py-3">{row.couponCode ?? <span className="text-neutral-400 dark:text-ink-500">—</span>}</td>
                <td className="px-4 py-3 text-neutral-500 dark:text-ink-400">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(row._id)}
                    onBlur={() => setConfirmingId((c) => (c === row._id ? null : c))}
                    disabled={deletingId === row._id}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                      confirmingId === row._id
                        ? "border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300"
                        : "border-neutral-300 dark:border-ink-600 text-neutral-600 dark:text-ink-300 hover:border-red-500/50 hover:text-red-700 dark:text-red-300"
                    }`}
                  >
                    {deletingId === row._id ? (
                      <>
                        <Spinner />
                        Deleting...
                      </>
                    ) : confirmingId === row._id ? (
                      "Confirm?"
                    ) : (
                      "Delete"
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {data && items.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-neutral-400 dark:text-ink-500">
                  No participants match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-ink-400">
          <span>
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                setSelectedIds(new Set());
              }}
              className="rounded-lg border border-neutral-300 dark:border-ink-600 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => {
                setPage((p) => Math.min(data.totalPages, p + 1));
                setSelectedIds(new Set());
              }}
              className="rounded-lg border border-neutral-300 dark:border-ink-600 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {bulkModalOpen && (
        <BulkDeleteModal
          count={selectedIds.size}
          onCancel={() => {
            if (!bulkDeleting) setBulkModalOpen(false);
          }}
          onConfirm={handleBulkDelete}
        />
      )}
    </div>
  );
}

function SortableHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: string;
  label: string;
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const active = sortField === field;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 ${active ? "text-gold-600 dark:text-gold-400" : ""}`}
      >
        {label}
        {active && <span aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
