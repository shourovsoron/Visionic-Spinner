import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const PARTICIPANT_COOKIE = "spin_participant";
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year — campaign-scoped "already played" hint

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set. Add it to .env.local.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * This cookie is a convenience only — it lets the UI skip straight to the result
 * screen after a refresh. It grants no access and is never trusted for eligibility;
 * the participants collection (keyed by email/phone) is the actual source of truth.
 */
export function createParticipantToken(participantId: string): string {
  const payload = JSON.stringify({ pid: participantId, exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function readParticipantId(req: NextRequest): string | null {
  const token = req.cookies.get(PARTICIPANT_COOKIE)?.value;
  if (!token) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSig = sign(payloadB64);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    return typeof payload.pid === "string" ? payload.pid : null;
  } catch {
    return null;
  }
}
