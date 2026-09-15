"use client";

import { useEffect, useState } from "react";
import SpinForm, { type SpinSuccessPayload } from "@/components/spin/SpinForm";
import PrizeWheel from "@/components/spin/PrizeWheel";
import SpinResult from "@/components/spin/SpinResult";
import Spinner from "@/components/ui/Spinner";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { isPrizeType, type PrizeType } from "@/lib/prizeTypes";

type ViewState =
  | { step: "checking" }
  | { step: "form" }
  | { step: "already_participated" }
  | { step: "exhausted" }
  | { step: "spinning"; prize: PrizeType; couponCode: string | null }
  | { step: "result"; prize: PrizeType; couponCode: string | null };

export default function SpinPage() {
  const [view, setView] = useState<ViewState>({ step: "checking" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/spin", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (data.participated && isPrizeType(data.prize)) {
          setView({ step: "result", prize: data.prize, couponCode: data.couponCode ?? null });
        } else if (data.exhausted) {
          setView({ step: "exhausted" });
        } else {
          setView({ step: "form" });
        }
      } catch {
        if (!cancelled) setView({ step: "form" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSuccess(payload: SpinSuccessPayload) {
    if (!isPrizeType(payload.prize)) return;
    setView({ step: "spinning", prize: payload.prize, couponCode: payload.couponCode });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <BackgroundGlow />

      <ThemeToggle className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6" />

      <div className="relative z-10 flex w-full flex-col items-center">
        <header className="mb-10 max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">
            Limited-Time Campaign
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-ink-100 sm:text-4xl">
            Spin &amp; Win
          </h1>
          <p className="mt-3 text-sm text-neutral-600 dark:text-ink-300 sm:text-base">
            Fill out your details for a chance to win a flight ticket, a T-shirt, or an exclusive
            discount coupon.
          </p>
        </header>

        {view.step === "checking" && (
          <div
            className="flex flex-col items-center gap-3 py-12 text-sm text-neutral-500 dark:text-ink-400"
            role="status"
            aria-live="polite"
          >
            <Spinner size="md" className="text-gold-600 dark:text-gold-400" />
            Loading...
          </div>
        )}

        {view.step === "form" && (
          <SpinForm
            onSuccess={handleSuccess}
            onAlreadyParticipated={() => setView({ step: "already_participated" })}
            onExhausted={() => setView({ step: "exhausted" })}
          />
        )}

        {view.step === "already_participated" && (
          <MessageCard title="You're already in!" message="You have already participated in this campaign." />
        )}

        {view.step === "exhausted" && (
          <MessageCard
            title="Campaign complete"
            message="All spins have been claimed. Thank you for participating!"
          />
        )}

        {view.step === "spinning" && (
          <PrizeWheel
            targetPrize={view.prize}
            onSettled={() =>
              setView((current) =>
                current.step === "spinning"
                  ? { step: "result", prize: current.prize, couponCode: current.couponCode }
                  : current
              )
            }
          />
        )}

        {view.step === "result" && <SpinResult prize={view.prize} couponCode={view.couponCode} />}
      </div>
    </main>
  );
}

function MessageCard({ title, message }: { title: string; message: string }) {
  return (
    <div
      role="status"
      className="w-full max-w-md animate-fade-up rounded-2xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/70 p-8 text-center shadow-premium"
    >
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-ink-100">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-ink-300">{message}</p>
    </div>
  );
}

function BackgroundGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
      <div className="absolute left-1/2 top-[-10%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[120px]" />
      <div className="absolute bottom-[-15%] right-[-10%] h-[360px] w-[360px] rounded-full bg-neutral-100 dark:bg-ink-600/20 blur-[120px]" />
    </div>
  );
}
