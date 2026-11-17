import type { PropertyType } from "@/lib/data";

/** A detail the concierge may be waiting on after asking a question. */
export type Field = "intent" | "name" | "contact" | "timeline" | "budget" | "location" | "tourDay" | "sellAddress";

/** Everything we've learned about the visitor so far — drives replies and CRM sync. */
export interface Profile {
  intent?: "Buy" | "Sell" | "Tour" | "Rent";
  name?: string;
  email?: string;
  phone?: string;
  budgetMin?: number;
  budgetMax?: number;
  locations?: string[]; // canonical LOCATIONS values
  type?: PropertyType;
  minBeds?: number;
  timeline?: string; // "ASAP" | "1–3 months" | "3–6 months" | "6+ months" | "Just exploring"
  tourDay?: string;
  wantsTour?: boolean;
  propertyId?: string; // property of interest
  sellAddress?: string;
  sellEstimate?: number;
}

export type Offer = "brochure" | "tour" | "lender" | "alex" | "offmarket" | "valuation" | null;

export interface ConciergeState {
  profile: Profile;
  /** Property ids most recently shown/discussed — resolves "it", "that one", "the second one". */
  lastShown: string[];
  /** What the last bot question asked for, so short answers ("Sarah", "3 months") are understood. */
  awaiting: Field | null;
  /** The last thing the concierge offered, so "yes please" can be acted on. */
  offer: Offer;
  /** How many times we've asked for each detail — never nag. */
  asked: Partial<Record<Field, number>>;
  /** Every sentence already said — guarantees no canned phrase is ever repeated verbatim. */
  said: string[];
  turns: number;
}

export interface ConciergeReply {
  bubbles: string[];
  propertyIds: string[];
  suggestions: string[];
}

export const initialState = (): ConciergeState => ({
  profile: {},
  lastShown: [],
  awaiting: "intent",
  offer: null,
  asked: {},
  said: [],
  turns: 0,
});

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
