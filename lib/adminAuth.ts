import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set. Add it to .env.local.");
  }
  return secret;
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createAdminSessionToken(username: string): string {
  const payload = JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = base64url(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expectedSig = sign(payloadB64);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/** Re-verifies the admin password alone — used to gate destructive actions like bulk delete. */
export function verifyAdminPassword(password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedPassword) return false;
  return timingSafeStringEqual(password, expectedPassword);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedUsername || !expectedPassword) return false;

  const userMatches = timingSafeStringEqual(username, expectedUsername);
  const passMatches = timingSafeStringEqual(password, expectedPassword);

  return userMatches && passMatches;
}

/** For Route Handlers: reads the session cookie off the incoming request. */
export function isAuthenticatedRequest(req: NextRequest): boolean {
  return verifyToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

/** For Server Components: reads the session cookie via next/headers. */
export async function isAuthenticatedPage(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
