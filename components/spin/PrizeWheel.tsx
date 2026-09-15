"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PRIZE_LABELS, type PrizeType } from "@/lib/prizeTypes";

interface WheelSegment {
  prize: PrizeType;
  centerAngle: number;
  color: string;
}

const SEGMENTS: WheelSegment[] = [
  { prize: "flight_ticket", centerAngle: 45, color: "#ff6933" },
  { prize: "tshirt", centerAngle: 135, color: "#1b222b" },
  { prize: "coupon_20", centerAngle: 225, color: "#ff875c" },
  { prize: "coupon_15", centerAngle: 315, color: "#12171e" },
];

const CONIC_GRADIENT = `conic-gradient(from 0deg, ${SEGMENTS.map((s, i) => {
  const start = i * 90;
  const end = start + 90;
  return `${s.color} ${start}deg ${end}deg`;
}).join(", ")})`;

const BEZEL_GRADIENT =
  "conic-gradient(from 200deg, #e03c00, #ffb094 25%, #e03c00 50%, #ff875c 75%, #e03c00)";

const BULB_COUNT = 16;
const BULBS = Array.from({ length: BULB_COUNT }, (_, i) => (360 / BULB_COUNT) * i);

const SPIN_DURATION_MS = 4600;
const REDUCED_MOTION_DURATION_MS = 500;

interface PrizeWheelProps {
  targetPrize: PrizeType;
  onSettled: () => void;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  return reduced;
}

export default function PrizeWheel({ targetPrize, onSettled }: PrizeWheelProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [rotation, setRotation] = useState(0);
  const [settled, setSettled] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const targetRotation = useMemo(() => {
    const segment = SEGMENTS.find((s) => s.prize === targetPrize) ?? SEGMENTS[0];
    const jitter = (Math.random() - 0.5) * 44; // stay within the 90deg segment, clear of edges
    const targetPointAngle = segment.centerAngle + jitter;
    const extraSpins = reducedMotion ? 1 : 7;
    return extraSpins * 360 + ((360 - targetPointAngle) % 360);
  }, [targetPrize, reducedMotion]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setRotation(targetRotation);
    });
    const duration = reducedMotion ? REDUCED_MOTION_DURATION_MS : SPIN_DURATION_MS;
    const timeout = setTimeout(() => {
      setSettled(true);
      onSettled();
    }, duration + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRotation]);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="relative aspect-square w-full max-w-[320px] sm:max-w-[380px]"
        role="status"
        aria-live="polite"
        aria-label={settled ? `Wheel landed on ${PRIZE_LABELS[targetPrize]}` : "Spinning the prize wheel"}
      >
        <div
          className={`pointer-events-none absolute inset-[-14px] rounded-full bg-gold-400/25 blur-2xl transition-opacity duration-700 ${
            settled ? "opacity-100" : "opacity-40"
          }`}
          aria-hidden="true"
        />

        {/* Pointer: gem cap + gradient wedge, mounted on the bezel */}
        <div className="absolute left-1/2 top-[-14px] z-30 -translate-x-1/2" aria-hidden="true">
          <svg width="36" height="42" viewBox="0 0 36 42" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]">
            <defs>
              <linearGradient id="pointerFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd2c2" />
                <stop offset="55%" stopColor="#ff6933" />
                <stop offset="100%" stopColor="#e03c00" />
              </linearGradient>
              <radialGradient id="pointerGem" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffe5db" />
                <stop offset="55%" stopColor="#ff875c" />
                <stop offset="100%" stopColor="#e03c00" />
              </radialGradient>
            </defs>
            <path
              d="M18 42 L5 15 A13 13 0 0 1 31 15 Z"
              fill="url(#pointerFill)"
              stroke="#07090c"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="11" r="10" fill="url(#pointerGem)" stroke="#07090c" strokeWidth="1" />
          </svg>
        </div>

        {/* Outer metal bezel */}
        <div
          className="absolute inset-0 rounded-full shadow-premium"
          style={{
            background: BEZEL_GRADIENT,
            boxShadow:
              "inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.55), 0 10px 24px rgba(0,0,0,0.5)",
          }}
        >
          {/* Recessed groove between bezel and wheel face */}
          <div
            className="absolute inset-[13px] rounded-full bg-[#07090c]"
            style={{ boxShadow: "inset 0 3px 8px rgba(0,0,0,0.85), inset 0 -1px 2px rgba(255,255,255,0.05)" }}
          />

          <div
            ref={wheelRef}
            className="absolute inset-[18px] overflow-hidden rounded-full"
            style={{
              background: CONIC_GRADIENT,
              transform: `rotate(${rotation}deg)`,
              transition: `transform ${reducedMotion ? REDUCED_MOTION_DURATION_MS : SPIN_DURATION_MS}ms cubic-bezier(0.1, 0.65, 0.15, 1)`,
            }}
          />

          {/* Marquee bulb lights around the rim, mounted above the wheel face */}
          <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
            {BULBS.map((angle, i) => (
              <div
                key={angle}
                className="absolute left-1/2 top-1/2 h-0 w-[47.5%] origin-left"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="absolute right-0 top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full animate-twinkle"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #fff0eb, #ffb094 55%, #e03c00 100%)",
                    boxShadow: "0 0 6px rgba(255,135,92,0.85), 0 0 2px rgba(255,255,255,0.9)",
                    animationDelay: `${(i % 8) * 0.15}s`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Glossy center hub */}
          <div
            className="absolute left-1/2 top-1/2 z-10 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full p-[3px] sm:h-[84px] sm:w-[84px]"
            style={{ background: "linear-gradient(135deg, #ffd2c2, #e03c00)" }}
          >
            <div
              className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
              style={{
                background: "radial-gradient(circle at 32% 28%, #2a2116, #0c1015 72%)",
                boxShadow: "inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -5px 10px rgba(0,0,0,0.7)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "radial-gradient(ellipse 55% 32% at 32% 22%, rgba(255,255,255,0.32), transparent 70%)",
                }}
                aria-hidden="true"
              />
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-gold-600 dark:text-gold-400" fill="none" aria-hidden="true">
                <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-neutral-600 dark:text-ink-300" aria-hidden="true">
        {settled ? "" : "Good luck..."}
      </p>
    </div>
  );
}
