import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Broker login for the CRM dashboard.
 *
 * The PIN lives only on the server (BROKER_PIN env var) so it never ships in the JS bundle.
 * A successful login sets an httpOnly, HMAC-signed session cookie for 8 hours.
 * In development, an unset BROKER_PIN falls back to "2468"; in production an unset PIN
 * disables broker login entirely (the CRM is then reachable only in Demo Mode).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "aura_broker";
const TTL_SECONDS = 8 * 60 * 60;

function configuredPin(): string | null {
  const pin = process.env.BROKER_PIN?.trim();
  if (pin) return pin;
  return process.env.NODE_ENV === "production" ? null : "2468";
}

const secret = (pin: string) => process.env.BROKER_AUTH_SECRET || `auraestate-broker:${pin}`;
const sign = (exp: number, pin: string) => createHmac("sha256", secret(pin)).update(String(exp)).digest("hex");
const digest = (s: string) => createHash("sha256").update(s).digest();

function isAuthed(cookieValue: string | undefined, pin: string | null) {
  if (!cookieValue || !pin) return false;
  const [expStr, sig] = cookieValue.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  return timingSafeEqual(digest(sig), digest(sign(exp, pin)));
}

const readCookie = (req: Request) =>
  req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);

/* Brute-force protection: 5 attempts per 5 minutes per IP (per server instance). */
const attempts = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 5 * 60_000);
  attempts.set(ip, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length >= 5;
}

export async function GET(req: Request) {
  const pin = configuredPin();
  return NextResponse.json({ authed: isAuthed(readCookie(req), pin), configured: !!pin });
}

export async function POST(req: Request) {
  const pin = configuredPin();
  if (!pin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooMany(ip)) return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });

  let given = "";
  try {
    const body = (await req.json()) as { pin?: unknown };
    given = typeof body.pin === "string" ? body.pin.trim().slice(0, 64) : "";
  } catch {
    /* fall through as wrong PIN */
  }

  if (!given || !timingSafeEqual(digest(given), digest(pin))) {
    attempts.get(ip)!.push(Date.now());
    return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 401 });
  }

  attempts.delete(ip);
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, `${exp}.${sign(exp, pin)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
