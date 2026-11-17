import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/concierge/knowledge";
import type { ChatTurn, Profile } from "@/lib/concierge/types";

/**
 * POST /api/chat — Elena, the AI property concierge.
 *
 * Uses the first configured provider:
 *   ANTHROPIC_API_KEY  (model: ANTHROPIC_MODEL,  default claude-sonnet-5-5)
 *   OPENAI_API_KEY     (model: OPENAI_MODEL,     default gpt-4.1-mini)
 *   OPENROUTER_API_KEY (model: OPENROUTER_MODEL, default openrouter/auto)
 *
 * With no key configured it answers { fallback: true } and the widget switches to the
 * built-in conversation engine, so the public demo always works.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Provider = { name: "anthropic" | "openai" | "openrouter"; key: string; model: string };

function resolveProvider(): Provider | null {
  if (process.env.ANTHROPIC_API_KEY)
    return { name: "anthropic", key: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5" };
  if (process.env.OPENAI_API_KEY)
    return { name: "openai", key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4.1-mini" };
  if (process.env.OPENROUTER_API_KEY)
    return { name: "openrouter", key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || "openrouter/auto" };
  return null;
}

/* ---------------- Basic per-IP rate limit (per server instance) ---------------- */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

/* ---------------- Input hygiene ---------------- */
function sanitizeMessages(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: ChatTurn[] = [];
  for (const m of raw.slice(-20)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, 1200);
    if (!content) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content += `\n${content}`; // providers want alternating roles
    else turns.push({ role: m.role, content });
  }
  while (turns.length && turns[0].role !== "user") turns.shift(); // must start with the visitor
  if (!turns.length || turns[turns.length - 1].role !== "user") return null;
  return turns;
}

function sanitizeProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : undefined);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  return {
    intent: ["Buy", "Sell", "Tour", "Rent"].includes(r.intent as string) ? (r.intent as Profile["intent"]) : undefined,
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    budgetMin: num(r.budgetMin),
    budgetMax: num(r.budgetMax),
    locations: Array.isArray(r.locations) ? r.locations.filter((x): x is string => typeof x === "string").slice(0, 6) : undefined,
    type: ["Villa", "Apartment", "Penthouse"].includes(r.type as string) ? (r.type as Profile["type"]) : undefined,
    minBeds: num(r.minBeds),
    timeline: str(r.timeline),
    tourDay: str(r.tourDay),
    wantsTour: r.wantsTour === true,
    propertyId: str(r.propertyId),
    sellAddress: str(r.sellAddress),
  };
}

/** Plain text, no markdown/bullets, max ~3 short sentences per bubble. */
function tidy(text: string) {
  return text
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 900);
}

/* ---------------- Providers ---------------- */
async function callAnthropic(p: Provider, system: string, messages: ChatTurn[], signal: AbortSignal) {
  const base = process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") || "https://api.anthropic.com";
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-api-key": p.key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: p.model, max_tokens: 350, system, messages }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

async function callOpenAICompatible(p: Provider, system: string, messages: ChatTurn[], signal: AbortSignal) {
  const isRouter = p.name === "openrouter";
  const url = isRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : `${process.env.OPENAI_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1"}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${p.key}`,
      ...(isRouter ? { "X-Title": "AuraEstate Concierge" } : {}),
    },
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: "system", content: system }, ...messages],
      ...(isRouter ? { max_tokens: 350 } : { max_completion_tokens: 350 }),
    }),
  });
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/* ---------------- Handlers ---------------- */
export async function GET() {
  const p = resolveProvider();
  return NextResponse.json({ ai: !!p, provider: p?.name ?? null });
}

export async function POST(req: Request) {
  const provider = resolveProvider();
  if (!provider) return NextResponse.json({ fallback: true, reason: "no_api_key" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return NextResponse.json({ fallback: true, reason: "rate_limited" }, { status: 429 });

  let body: { messages?: unknown; profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const messages = sanitizeMessages(body.messages);
  if (!messages) return NextResponse.json({ error: "invalid_messages" }, { status: 400 });

  const system = buildSystemPrompt(sanitizeProfile(body.profile));
  try {
    const signal = AbortSignal.timeout(15_000);
    const text =
      provider.name === "anthropic"
        ? await callAnthropic(provider, system, messages, signal)
        : await callOpenAICompatible(provider, system, messages, signal);
    const reply = tidy(text);
    if (!reply) throw new Error("empty reply");
    return NextResponse.json({ reply, provider: provider.name });
  } catch (err) {
    console.error("[api/chat] provider error:", err instanceof Error ? err.message : err);
    // Let the widget fall back to the local engine rather than show an error to a visitor.
    return NextResponse.json({ fallback: true, reason: "provider_error" });
  }
}
