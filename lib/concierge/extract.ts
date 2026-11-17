import { PROPERTIES, type PropertyType } from "@/lib/data";
import type { ConciergeState, Profile } from "./types";

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

const LOC_ALIASES: [RegExp, string[]][] = [
  [/beverly\s*hills|90210|bel[- ]air/i, ["Beverly Hills, CA"]],
  [/malibu|90265/i, ["Malibu, CA"]],
  [/los angeles|\bL\.?A\.?(?=\W|$)|socal|southern california|\bcalifornia\b|\bcali\b/i, ["Beverly Hills, CA", "Malibu, CA"]],
  [/miami|south beach|florida|collins ave/i, ["Miami Beach, FL"]],
  [/austin|texas|westlake/i, ["Austin, TX"]],
  [/manhattan|new york|\bnyc\b|tribeca/i, ["Manhattan, NY"]],
  [/london|kensington|\bu\.?k\.?\b|england|holland park|notting hill/i, ["Kensington, London"]],
];

/** Words that look like place names after "in"/"near" but aren't. */
const NOT_PLACES = new Set([
  "I", "The", "A", "An", "My", "Your", "Our", "This", "That", "It", "Me", "Us", "Them", "AuraEstate", "Alex", "Elena",
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Spring", "Summer", "Fall", "Autumn", "Winter",
]);

/* ------------------------------------------------------------------ */
/* Property references                                                 */
/* ------------------------------------------------------------------ */

const PROPERTY_KEYS: Record<string, RegExp> = {
  "bh-01": /summit|glass estate|summitridge/i,
  "mi-02": /oceanfront|sky residence|collins ave/i,
  "au-03": /lakeview|westlake|modern retreat/i,
  "ny-04": /tribeca|leonard st|loft penthouse/i,
  "ldn-05": /kensington garden|holland park|garden apartment/i,
  "mb-06": /cliffside|malibu villa/i,
};

/** Find property titles mentioned in free text (used on AI replies too). */
export function propertiesMentioned(text: string): string[] {
  const ids = new Set<string>();
  for (const p of PROPERTIES) {
    if (text.toLowerCase().includes(p.title.toLowerCase())) ids.add(p.id);
  }
  for (const [id, re] of Object.entries(PROPERTY_KEYS)) if (re.test(text)) ids.add(id);
  return [...ids];
}

/* ------------------------------------------------------------------ */
/* Numbers & money                                                     */
/* ------------------------------------------------------------------ */

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1, few: 3, couple: 2,
};

const toNum = (s: string) => (s in WORD_NUM ? WORD_NUM[s] : Number(s));

function money(numStr: string, unit: string | undefined): number {
  const n = parseFloat(numStr.replace(/,/g, ""));
  if (Number.isNaN(n)) return NaN;
  const u = (unit ?? "").toLowerCase();
  if (/^(b|bn|billion)$/.test(u)) return n * 1e9;
  if (/^(m|mm|mil|mill|million|millions)$/.test(u)) return n * 1e6;
  if (/^(k|thousand|grand)$/.test(u)) return n * 1e3;
  // No unit: in a luxury context small numbers mean millions, mid numbers thousands.
  if (n < 100) return n * 1e6;
  if (n < 10_000) return n * 1e3;
  return n;
}

const N = String.raw`\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)`;
const U = String.raw`\s?(billion|bn|b|million|millions|mill|mil|mm|m|thousand|grand|k)?\b`;

export interface Budget {
  min?: number;
  max?: number;
}

export function parseBudget(raw: string): Budget | null {
  // Strip things that look numeric but aren't budgets.
  const text = raw
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, (m) => (/[.,]\d{3}/.test(m) && !/[()\s-]/.test(m) ? m : " ")) // phone numbers
    .replace(/\d+(?:\.\d+)?\s?%/g, " ")
    .replace(/\b\d+\s?(?:\+\s?)?(?:bed|bedroom|br|bd|bath|bathroom|ba|sq\s?ft|sqft|square|year|yr|month|week|day|min)s?\b/gi, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ");

  const range = new RegExp(String.raw`(?:between\s*)?${N}${U}\s*(?:-|–|to|and)\s*${N}${U}`, "i").exec(text);
  if (range && (range[2] || range[4] || /\$/.test(range[0]) || /between/i.test(range[0]))) {
    const unit = range[4] ?? range[2];
    const a = money(range[1], range[2] ?? unit);
    const b = money(range[3], unit);
    if (a > 0 && b > a) return { min: a, max: b };
  }

  const max = new RegExp(String.raw`(?:under|below|less than|max(?:imum)?|up to|no more than|at most|within|cap(?:ped)? at|budget(?: is| of)?(?: around| about)?|<)\s*${N}${U}`, "i").exec(text);
  if (max) return { max: money(max[1], max[2]) };

  const min = new RegExp(String.raw`(?:over|above|more than|at least|starting (?:at|from)|minimum|min|>)\s*${N}${U}`, "i").exec(text);
  if (min) return { min: money(min[1], min[2]) };

  const around = new RegExp(String.raw`(?:around|about|roughly|approximately|~)\s*${N}${U}`, "i").exec(text);
  if (around) {
    const v = money(around[1], around[2]);
    return { min: v * 0.8, max: v * 1.15 };
  }

  // Bare amount with a $ sign or a unit, e.g. "$5M", "3.5 million".
  const bare = new RegExp(String.raw`(\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)${U})|((\d+(?:\.\d+)?)\s?(million|mil|mm|m|k)\b)`, "i").exec(text);
  if (bare) {
    const v = bare[1] ? money(bare[2], bare[3]) : money(bare[5], bare[6]);
    if (v >= 50_000) return { max: v * 1.1 };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Timeline & tour day                                                 */
/* ------------------------------------------------------------------ */

export function parseTimeline(text: string, awaiting: boolean): string | undefined {
  const t = text.toLowerCase();
  if (/\b(asap|immediately|right away|urgent(ly)?|as soon as possible|this week|next week|right now|yesterday)\b/.test(t)) return "ASAP";
  if (/\b(just (browsing|looking|exploring)|no rush|not sure yet|exploring|someday|eventually|no timeline)\b/.test(t)) return "Just exploring";
  if (/\bnext month\b/.test(t)) return "1–3 months";
  if (/\b(next year|in a year|12 months|a year from now)\b/.test(t)) return "6+ months";
  if (/\b(this|by|before) (summer|spring|fall|autumn|winter|christmas|the end of the year|year[- ]end|end of year)\b/.test(t)) return "3–6 months";
  const m = /\b(?:in|within|next|over the next|about|around)?\s*(\d+|one|two|three|four|five|six|a|few|couple)\s*(?:of\s*)?(week|month|year)s?\b/.exec(t);
  if (m) {
    const n = toNum(m[1]);
    const months = m[2] === "week" ? n / 4 : m[2] === "year" ? n * 12 : n;
    if (months <= 1) return "ASAP";
    if (months <= 3) return "1–3 months";
    if (months <= 6) return "3–6 months";
    return "6+ months";
  }
  if (awaiting) {
    const d = /^\s*(\d{1,2})\s*$/.exec(t);
    if (d) return parseTimeline(`${d[1]} months`, false);
    if (/\b(soon|quickly|fast)\b/.test(t)) return "1–3 months";
    if (/\b(later|flexible|whenever)\b/.test(t)) return "6+ months";
  }
  return undefined;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function parseTourDay(text: string): string | undefined {
  const t = text.toLowerCase();
  const day =
    /\b(today|tomorrow|this weekend|next weekend|weekend)\b/.exec(t)?.[1] ??
    DAYS.find((d) => new RegExp(`\\b${d}s?\\b`).test(t));
  if (!day) return undefined;
  const time = /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/.exec(t)?.[1] ?? /\b(morning|afternoon|evening|lunchtime)\b/.exec(t)?.[1];
  const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  return time ? `${cap(day)}, ${time.replace(/\s/g, "")}` : cap(day);
}

/* ------------------------------------------------------------------ */
/* Contact details                                                     */
/* ------------------------------------------------------------------ */

const NAME_STOP = new Set(
  (
    "looking interested a an the just not thinking selling buying trying wondering curious here from in on ready planning also very so " +
    "good fine great ok okay moving relocating searching hoping open flexible pre retired currently still after going considering new " +
    "available sure happy glad sorry yes no yeah nope hi hello hey thanks thank interested keen buyer seller investor agent broker " +
    "out back home married single back calling writing reaching emailing texting definitely probably maybe actually really please yep yup nah hmm what why how when where who which tour book buy sell rent price villa penthouse apartment house home ok at on after before tomorrow today tonight later anytime whenever soon asap now"
  ).split(" "),
);

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

export function parseName(text: string, awaiting: boolean): string | undefined {
  const explicit = /\b(?:my name is|my name's|name is|call me|it'?s|this is)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+)?)/i.exec(text);
  if (explicit) {
    const first = explicit[1].split(/\s+/)[0].toLowerCase();
    if (!NAME_STOP.has(first) && !/^(it|that|this|me)$/.test(first)) return titleCase(explicit[1]);
  }
  // "I'm Sarah" — only when capitalised, to avoid "I'm looking…"
  const im = /\b(?:[Ii]'?m|[Ii] am)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+)?)/.exec(text);
  if (im && !NAME_STOP.has(im[1].split(/\s+/)[0].toLowerCase())) return im[1];
  const here = /^([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+)?)\s+here\b/.exec(text.trim());
  if (here) return here[1];

  if (awaiting) {
    const cleaned = text.trim().replace(/[.!,]+$/g, "").replace(/^(it'?s|i'?m|im|sure,?|yes,?|ok,?)\s+/i, "");
    const words = cleaned.split(/\s+/);
    if (words.length >= 1 && words.length <= 3 && words.every((w) => /^[a-z][a-z'-]*$/i.test(w) && !NAME_STOP.has(w.toLowerCase())))
      return titleCase(cleaned);
  }
  return undefined;
}

export const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i;
export function parsePhone(text: string): string | undefined {
  const m = /(\+?\d[\d\s().-]{6,}\d)/.exec(text.replace(/\$\s?[\d,.]+/g, " "));
  if (!m) return undefined;
  const digits = m[1].replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return undefined;
  if (/^\d{1,3}(,\d{3})+$/.test(m[1].trim())) return undefined; // a price
  return m[1].trim();
}

/* ------------------------------------------------------------------ */
/* Signals                                                             */
/* ------------------------------------------------------------------ */

export interface Signals {
  greeting: boolean;
  thanks: boolean;
  bye: boolean;
  askHuman: boolean;
  wantsHuman: boolean;
  mortgage: boolean;
  sell: boolean;
  buy: boolean;
  tour: boolean;
  rent: boolean;
  offMarket: boolean;
  fees: boolean;
  about: boolean;
  office: boolean;
  affirm: boolean;
  negative: boolean;
  detail: boolean;
  search: boolean;
  attributes: string[];
  referencedIds: string[];
  unknownPlace?: string;
  downPct?: number;
  rate?: number;
  years?: 15 | 30;
}

export interface Extraction {
  patch: Profile;
  signals: Signals;
}

const ATTRS: [string, RegExp][] = [
  ["beds", /\bbed(room)?s?\b/i],
  ["baths", /\bbath(room)?s?\b/i],
  ["size", /\b(sq\.? ?ft|sqft|square f(ee|oo)t|how big|size|footage)\b/i],
  ["price", /\b(price|cost|how much|asking)\b/i],
  ["year", /\b(built|year|how old|age of)\b/i],
  ["pool", /\bpool\b/i],
  ["view", /\bviews?\b/i],
  ["parking", /\b(parking|garage|car)\b/i],
  ["schools", /\bschools?\b/i],
  ["address", /\b(address|where (is|exactly)|street|location of)\b/i],
  ["features", /\b(features|amenities|highlights|special|what's (it|inside) like)\b/i],
  ["available", /\b(available|still on the market|under offer|sold)\b/i],
];

export function extract(text: string, state: ConciergeState): Extraction {
  const t = text.trim();
  const low = t.toLowerCase();
  const patch: Profile = {};

  // Contact
  const email = EMAIL_RE.exec(t)?.[0];
  if (email) patch.email = email.toLowerCase();
  const phone = parsePhone(t.replace(EMAIL_RE, " "));
  if (phone) patch.phone = phone;
  // Treat a short proper-cased reply as a name if we asked for one recently and it isn't a place/property.
  const askedForName = state.awaiting === "name" || ((state.asked.name ?? 0) > 0 && !state.profile.name && /^[A-Z][a-z'-]+(\s[A-Z][a-z'-]+){0,2}[.!]?$/.test(t));
  const looksElse = LOC_ALIASES.some(([re]) => re.test(t)) || propertiesMentioned(t).length > 0;
  const name = parseName(t.replace(EMAIL_RE, " "), askedForName && !looksElse && !email && !phone);
  if (name) patch.name = name;

  // Locations
  const locs = new Set<string>();
  for (const [re, l] of LOC_ALIASES) if (re.test(t)) l.forEach((x) => locs.add(x));
  if (locs.size) patch.locations = [...locs];

  let unknownPlace: string | undefined;
  if (!locs.size) {
    const m = /\b(?:in|near|around|to)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/.exec(t);
    if (m && !NOT_PLACES.has(m[1].split(" ")[0])) unknownPlace = m[1];
  }

  // Property type & beds
  if (/\bpenthouse|\bph\b/i.test(t)) patch.type = "Penthouse";
  else if (/\b(villa|house|mansion|single[- ]family)\b|(?<!real )\bestate\b/i.test(t)) patch.type = "Villa";
  else if (/\b(apartment|condo|flat)\b/i.test(t)) patch.type = "Apartment";

  const beds = /\b(\d+|one|two|three|four|five|six|seven)\s*\+?\s*(?:bed|bedroom|br|bd)s?\b/i.exec(t);
  if (beds) patch.minBeds = toNum(beds[1].toLowerCase());

  // Budget (skip when the user is clearly giving an address or phone)
  const budget = parseBudget(t);
  if (budget) {
    patch.budgetMin = budget.min;
    patch.budgetMax = budget.max;
  }

  // Timeline / tour day
  const timeline = parseTimeline(t, state.awaiting === "timeline");
  if (timeline) patch.timeline = timeline;
  const tourDay = parseTourDay(t);
  if (tourDay && (state.awaiting === "tourDay" || /\b(tour|view|see|visit|show|book)/i.test(t) || state.profile.wantsTour)) patch.tourDay = tourDay;

  // Signals
  const s: Signals = {
    greeting: /^(hi|hello|hey|hiya|howdy|good (morning|afternoon|evening)|yo)\b/i.test(t),
    thanks: /\b(thanks|thank you|thx|cheers|appreciate it|much appreciated)\b/i.test(t),
    bye: /\b(bye|goodbye|see you|talk (to you )?later|that'?s all|have a good)\b/i.test(t),
    askHuman: /\b(are you (a |an )?(bot|robot|ai|human|real|person|chatgpt)|is this (a |an )?(bot|ai|real person|human|automated)|you'?re (a )?(bot|ai))\b/i.test(t),
    wantsHuman: /\b(speak|talk|chat) (to|with) (a |an )?(human|person|agent|someone|alex|broker|realtor)\b|\bcall me\b(?!\s+[a-z])/i.test(t),
    mortgage: /\b(mortgage|monthly|per month|a month|\/mo|payments?|afford|financ\w*|loan|interest rate|down payment|pre-?approv\w*|lender)\b/i.test(t),
    sell: /\b(sell|selling|sale of my|list my|listing my|valuation|value my|worth|apprais\w+|cma|market my)\b/i.test(t) && !/\bbest[- ]selling\b/i.test(t),
    buy: /\b(buy|buying|purchase|looking for|in the market|want (a|an|to find)|need (a|an)|searching|hunting|relocat\w+|moving to)\b/i.test(t),
    tour: /\b(tour|viewing|showing|see it|see the|visit|view it|walk ?through|in person|schedule|book (a|an)|come (by|see))\b/i.test(t),
    rent: /\b(rent|rents|rental|rentals|renting|lease|leases|leasing)\b/i.test(t) && !/\brental income\b/i.test(t),
    offMarket: /\b(off[- ]?market|pocket listing|private listing|not (listed|on zillow)|quiet listing)\b/i.test(t),
    fees: /\b(fee|fees|commission|charge|cost (me )?to use)\b/i.test(t),
    about: /\b(who (are you|is alex)|about (you|alex|the company|auraestate|your (team|agency|firm))|your (agency|company|brokerage|team|track record)|how long have you|experience)\b/i.test(t),
    office: /\b(office|where are you (based|located)|your address|visit you|headquarters)\b/i.test(t),
    affirm: /^(yes|yeah|yep|yup|sure|ok(ay)?|please( do)?|absolutely|definitely|sounds (good|great|perfect)|go ahead|of course|that would be (great|lovely|perfect)|love (to|that)|why not|y)\b/i.test(low),
    negative: /^(no|nope|nah|not (really|now|yet)|maybe later|i'?m good|no thanks)\b/i.test(low),
    detail: /\b(tell me (more )?about|more (info|information|details|about)|details|what about|describe|how (many|big|much|old)|does it|is it|is there|what'?s the|what is the|features|amenities|anything special|like inside)\b/i.test(t),
    search: /\b(anything|any(thing)? (in|under|for)|do you have|got any|show me|options|what'?s available|listings|homes|properties|places)\b/i.test(t),
    attributes: ATTRS.filter(([, re]) => re.test(t)).map(([k]) => k),
    referencedIds: [],
    unknownPlace,
  };

  // Mortgage parameters
  const down = /(\d{1,2}(?:\.\d+)?)\s?%\s*(?:down|deposit)|(?:down payment|deposit) of\s*(\d{1,2}(?:\.\d+)?)\s?%/i.exec(t);
  if (down) s.downPct = Number(down[1] ?? down[2]);
  const rate = /(\d{1,2}(?:\.\d+)?)\s?%\s*(?:rate|interest|apr|fixed)|(?:rate|interest|apr)\s*(?:of|at|is)?\s*(\d{1,2}(?:\.\d+)?)\s?%|\bat\s+(\d{1,2}(?:\.\d+)?)\s?%/i.exec(t);
  if (rate) s.rate = Number(rate[1] ?? rate[2] ?? rate[3]);
  const yrs = /\b(15|30)[- ]?(?:year|yr)/i.exec(t);
  if (yrs) s.years = Number(yrs[1]) as 15 | 30;
  if (s.downPct !== undefined || s.rate !== undefined || s.years !== undefined) s.mortgage = true;

  // Property references: explicit names, "the Malibu villa", or pronouns pointing at what we just discussed.
  const named = propertiesMentioned(t);
  let refs = named;
  if (!refs.length && patch.locations?.length === 1 && (s.detail || s.tour || s.mortgage || /\bthe\s+\w+\s+(villa|penthouse|apartment|estate|loft|home|place|one)\b/i.test(t))) {
    refs = PROPERTIES.filter((p) => p.location === patch.locations![0] && (!patch.type || p.type === patch.type)).map((p) => p.id);
    if (refs.length !== 1) refs = [];
  }
  if (!refs.length && state.lastShown.length) {
    const ord = /\b(first|second|third|1st|2nd|3rd|last)\b/i.exec(t)?.[1]?.toLowerCase();
    if (ord) {
      const idx = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, last: state.lastShown.length - 1 }[ord] ?? 0;
      if (state.lastShown[idx]) refs = [state.lastShown[idx]];
    } else if (/\b(it|that one|this one|that (property|place|home|house|listing)|this (property|place|home|listing)|the one|that|there)\b/i.test(t) && state.lastShown.length === 1) {
      refs = [state.lastShown[0]];
    }
  }
  if (!refs.length && (s.attributes.length || s.detail) && !patch.locations && !budget && !s.search) {
    const ctx = state.lastShown.length === 1 ? state.lastShown[0] : state.profile.propertyId;
    if (ctx) refs = [ctx];
  }
  if (!refs.length && state.profile.propertyId && (s.mortgage || s.tour) && !patch.locations && !budget) refs = [state.profile.propertyId];
  s.referencedIds = refs;

  // Intent
  if (s.sell) patch.intent = "Sell";
  else if (s.tour) patch.intent = "Tour";
  else if (s.rent) patch.intent = "Rent";
  else if (s.buy || s.search || budget || locs.size) patch.intent = state.profile.intent ?? "Buy";
  if (state.awaiting === "intent" && !patch.intent) {
    if (/\b(buy|purchas)/i.test(t)) patch.intent = "Buy";
  }
  if (s.tour) patch.wantsTour = true;

  // Seller address: anything with a street number, or a reply to "where's the property?"
  if (patch.intent === "Sell" || state.awaiting === "sellAddress" || state.profile.intent === "Sell") {
    const addr = /\b\d{1,6}\s+[A-Za-z0-9.' ]+?\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|court|ct|place|pl|terrace|circle|highway|hwy|square|sq|gardens|crescent|mews)\b[^\n]*/i.exec(t)?.[0];
    if (addr) patch.sellAddress = addr.trim().replace(/[.!?]+$/, "");
    else if (state.awaiting === "sellAddress" && (locs.size || /[A-Z][a-z]+/.test(t)) && t.length > 3 && !email && !phone) patch.sellAddress = t.replace(/[.!?]+$/, "");
  }

  return { patch, signals: s };
}

/** Merge a patch into a profile without erasing known values with undefined ones. */
export function mergeProfile(p: Profile, patch: Profile): Profile {
  const out: Profile = { ...p };
  for (const [k, v] of Object.entries(patch) as [keyof Profile, Profile[keyof Profile]][]) {
    if (v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export const typeLabel = (t?: PropertyType) => t?.toLowerCase();
