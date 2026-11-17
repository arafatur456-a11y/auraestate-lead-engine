import { PROPERTIES, formatPrice } from "@/lib/data";
import type { LeadStatus, NewLead } from "@/context/CRMContext";
import type { Profile } from "./types";

/** 0–99 lead score from what the visitor has shared and how engaged they are. */
export function scoreProfile(p: Profile, userTurns: number): number {
  let s = 20;
  if (p.name) s += 5;
  if (p.email) s += 10;
  if (p.phone) s += 15;
  if (p.budgetMax || p.budgetMin || p.sellEstimate) s += 8;
  const value = p.budgetMax ?? p.sellEstimate ?? 0;
  if (value >= 10_000_000) s += 10;
  else if (value >= 5_000_000) s += 7;
  else if (value >= 2_000_000) s += 4;
  if (p.locations?.length || p.sellAddress) s += 5;
  if (p.timeline === "ASAP") s += 18;
  else if (p.timeline === "1–3 months") s += 12;
  else if (p.timeline === "3–6 months") s += 6;
  if (p.wantsTour) s += 12;
  if (p.propertyId) s += 4;
  s += Math.min(8, userTurns * 1.5);
  return Math.max(1, Math.min(99, Math.round(s)));
}

export function budgetLabel(p: Profile): string {
  if (p.intent === "Sell") return p.sellEstimate ? `Est. ${formatPrice(p.sellEstimate)}` : "—";
  if (p.budgetMin && p.budgetMax) return `${formatPrice(p.budgetMin)} – ${formatPrice(p.budgetMax)}`;
  if (p.budgetMax) return `Up to ${formatPrice(p.budgetMax)}`;
  if (p.budgetMin) return `${formatPrice(p.budgetMin)}+`;
  const prop = PROPERTIES.find((x) => x.id === p.propertyId);
  return prop ? `~${formatPrice(prop.price)}` : "—";
}

export function statusFor(p: Profile): LeadStatus {
  if (p.wantsTour && p.intent !== "Sell") return "Tour Requested";
  if (p.intent === "Sell") return "New Seller Lead";
  const hasContact = !!(p.email || p.phone);
  const hot = p.timeline === "ASAP" || p.timeline === "1–3 months";
  if (hasContact && (p.budgetMax || p.budgetMin || p.propertyId) && (hot || p.locations?.length)) return "Qualified";
  return "New Lead";
}

/** Map a conversation profile onto a CRM lead record. */
export function profileToLead(p: Profile, userTurns: number): NewLead {
  const prop = PROPERTIES.find((x) => x.id === p.propertyId);
  const notes = [
    p.type ? `${p.type}` : null,
    p.minBeds ? `${p.minBeds}+ beds` : null,
    p.wantsTour ? `Tour${p.tourDay ? `: ${p.tourDay}` : " requested"}` : null,
    p.sellAddress && p.intent !== "Sell" ? `Also selling: ${p.sellAddress}` : null,
    "via Elena (AI chat)",
  ].filter(Boolean);
  const intent = p.intent === "Sell" ? "Sell" : p.wantsTour ? "Tour" : p.intent === "Rent" ? "Inquiry" : "Buy";
  return {
    name: p.name ?? "Website visitor",
    email: p.email ?? "",
    phone: p.phone ?? "",
    budget: budgetLabel(p),
    location: p.intent === "Sell" ? p.sellAddress ?? "—" : p.locations?.join(" / ") ?? (prop ? prop.location : "—"),
    timeline: p.timeline ?? (p.tourDay ? "ASAP" : "—"),
    intent,
    source: p.wantsTour && p.intent !== "Sell" ? "Tour Request" : "AI Chatbot",
    status: statusFor(p),
    property: prop?.title,
    value: p.intent === "Sell" ? p.sellEstimate : p.budgetMax ?? prop?.price,
    message: notes.join(" · "),
    score: scoreProfile(p, userTurns),
  };
}
