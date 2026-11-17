/**
 * Elena's local conversation engine — used whenever no LLM API key is configured
 * (or the API is unreachable). It parses intent and entities from each message,
 * reasons over the live PROPERTIES data, and composes varied, human-sounding replies
 * that never repeat the exact same phrase twice in a conversation.
 */
import { PROPERTIES, formatFullPrice, formatPrice, type Property } from "@/lib/data";
import { calcMortgage, usd } from "@/lib/mortgage";
import { estimate } from "@/lib/valuation";
import { extract, mergeProfile, propertiesMentioned } from "./extract";
import { BROKERAGE, city } from "./knowledge";
import type { ConciergeReply, ConciergeState, Confirmed, Field, Offer, Profile } from "./types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const byId = (id?: string) => PROPERTIES.find((p) => p.id === id);
const lcFirst = (s: string) => (/^(I\b|I'|Alex|Elena|AuraEstate)/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const firstName = (p: Profile) => p.name?.split(" ")[0];
const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
const feat = (p: Property, i: number) => {
  const f = p.features[i]?.toLowerCase() ?? "";
  // "a private elevator", "an infinity pool", but "14-ft ceilings", "ocean views"
  return !f || /s$|^\d|&/.test(f) ? f : `${/^[aeiou]/.test(f) ? "an" : "a"} ${f}`;
};
const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");
const hasContact = (p: Profile) => !!(p.email || p.phone);
/** "the Malibu Cliffside Villa" but "The Summit Glass Estate" (title already has its article). */
const the = (p: Property) => (/^the\s/i.test(p.title) ? p.title : `the ${p.title}`);
const The = (p: Property) => (/^the\s/i.test(p.title) ? p.title : `The ${p.title}`);

/** Short evocative hook for each listing, built from its own data. */
function hook(p: Property) {
  const first = p.description.split(/(?<=\.)\s/)[0];
  return first.length < 170 ? first : `${p.beds} bedrooms, ${feat(p, 0)} and ${feat(p, 1)}`;
}

const CONNECTORS = ["Oh, and ", "Also, ", "Quick one: ", "By the way, ", "And ", "Just so I know, ", "One more thing: "];

/** Sentence picker that guarantees nothing is said twice verbatim. */
class Composer {
  constructor(private st: ConciergeState) {}

  pick(variants: string[]): string {
    const fresh = variants.filter((v) => v && !this.st.said.includes(v));
    let choice = fresh.length ? rand(fresh) : "";
    if (!choice) {
      const base = rand(variants);
      for (const c of [...CONNECTORS].sort(() => Math.random() - 0.5)) {
        const candidate = c + lcFirst(base);
        if (!this.st.said.includes(candidate)) {
          choice = candidate;
          break;
        }
      }
      if (!choice) choice = `${base} ${rand(["🙂", "✨", "🏡"])}`;
    }
    this.st.said.push(choice);
    return choice;
  }
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

function search(p: Profile) {
  return PROPERTIES.filter(
    (x) =>
      (!p.locations?.length || p.locations.includes(x.location)) &&
      (!p.budgetMax || x.price <= p.budgetMax) &&
      (!p.budgetMin || x.price >= p.budgetMin) &&
      (!p.type || x.type === p.type) &&
      (!p.minBeds || x.beds >= p.minBeds),
  ).sort((a, b) => (p.budgetMax ? b.price - a.price : a.price - b.price));
}

function criteriaPhrase(p: Profile) {
  const bits: string[] = [];
  if (p.type) bits.push(p.type === "Villa" ? "villas" : `${p.type.toLowerCase()}s`);
  if (p.locations?.length) bits.push(`in ${listJoin([...new Set(p.locations.map((l) => l.split(",")[0]))])}`);
  if (p.budgetMin && p.budgetMax) bits.push(`between ${formatPrice(p.budgetMin)} and ${formatPrice(p.budgetMax)}`);
  else if (p.budgetMax) bits.push(`under ${formatPrice(p.budgetMax)}`);
  else if (p.budgetMin) bits.push(`over ${formatPrice(p.budgetMin)}`);
  if (p.minBeds) bits.push(`with ${p.minBeds}+ bedrooms`);
  return bits.join(" ");
}

/** What we remember about their search, e.g. "in Miami Beach under $7M with 3+ bedrooms". */
function memoryPhrase(p: Profile): string {
  const bits: string[] = [];
  if (p.type) bits.push(p.type === "Villa" ? "a villa" : `${article(p.type)} ${p.type.toLowerCase()}`);
  if (p.locations?.length) bits.push(`in ${listJoin([...new Set(p.locations.map((l) => l.split(",")[0]))])}`);
  if (p.budgetMin && p.budgetMax) bits.push(`between ${formatPrice(p.budgetMin)} and ${formatPrice(p.budgetMax)}`);
  else if (p.budgetMax) bits.push(`under ${formatPrice(p.budgetMax)}`);
  else if (p.budgetMin) bits.push(`over ${formatPrice(p.budgetMin)}`);
  if (p.minBeds) bits.push(`with ${p.minBeds}+ bedrooms`);
  return bits.join(" ");
}

/* ------------------------------------------------------------------ */
/* Property details                                                    */
/* ------------------------------------------------------------------ */

function mentions(p: Property, re: RegExp) {
  return p.features.find((f) => re.test(f)) ?? (re.test(p.description) ? p.description.split(/(?<=\.)\s/).find((s) => re.test(s)) : undefined);
}

function detailSentences(p: Property, attrs: string[], c: Composer): string[] {
  const out: string[] = [];
  const sq = p.sqft.toLocaleString();
  for (const a of attrs) {
    switch (a) {
      case "beds":
      case "baths":
        if (!out.some((s) => s.includes("bedroom")))
          out.push(c.pick([`It has ${p.beds} bedrooms and ${p.baths} bathrooms across ${sq} sq ft.`, `You'd have ${p.beds} bedrooms and ${p.baths} baths, with ${sq} sq ft to spread out in.`]));
        break;
      case "size":
        out.push(c.pick([`It's ${sq} sq ft — about $${Math.round(p.price / p.sqft).toLocaleString()} per foot.`, `Interior is ${sq} sq ft, which works out around $${Math.round(p.price / p.sqft).toLocaleString()}/sq ft.`]));
        break;
      case "price":
        out.push(c.pick([`It's listed at ${formatFullPrice(p.price)}.`, `The asking price is ${formatFullPrice(p.price)}.`]));
        break;
      case "year":
        out.push(c.pick([`It was built in ${p.yearBuilt}${p.yearBuilt < 1950 ? " and has been beautifully restored" : ""}.`, `Built in ${p.yearBuilt}${p.yearBuilt < 1950 ? ", with a meticulous restoration" : ", so it's very much move-in ready"}.`]));
        break;
      case "pool": {
        const m = mentions(p, /pool/i);
        out.push(m ? c.pick([`Yes — there's ${article(m)} ${m.toLowerCase().replace(/\.$/, "")}.`, `It does — ${article(m)} ${m.toLowerCase().replace(/\.$/, "")}.`]) : `No pool at this one, though it does have ${feat(p, 0)} and ${feat(p, 1)}.`);
        break;
      }
      case "view": {
        const m = mentions(p, /view/i);
        out.push(m ? c.pick([`The views are a real highlight — ${m.charAt(0).toLowerCase() + m.slice(1).replace(/\.$/, "")}.`, `Yes, and they're stunning: ${m.charAt(0).toLowerCase() + m.slice(1).replace(/\.$/, "")}.`]) : `Views aren't its headline feature, but ${feat(p, 0)} more than makes up for it.`);
        break;
      }
      case "parking": {
        const m = mentions(p, /parking|garage|car/i);
        out.push(m ? `Parking's covered — ${m.toLowerCase().replace(/\.$/, "")}.` : `Alex can confirm the parking arrangements for you.`);
        break;
      }
      case "schools": {
        const m = p.description.split(/(?<=\.)\s/).find((x) => /school/i.test(x)) ?? mentions(p, /school/i);
        out.push(m ? `Schools are a big plus here — ${m.charAt(0).toLowerCase() + m.slice(1).replace(/\.$/, "")}.` : `Alex knows the local schools well and can walk you through the options.`);
        break;
      }
      case "address":
        out.push(c.pick([`It's at ${p.address}.`, `The address is ${p.address}.`]));
        break;
      case "available":
        out.push(c.pick([`Yes, it's still available${p.tag === "Off-Market" ? " — quietly, as an off-market listing" : ""}.`, `It is — though ${p.tag === "New Listing" ? "it only just came on and" : "homes like this"} tend to move fast.`]));
        break;
      case "features":
        out.push(c.pick([`Highlights include ${listJoin(p.features.slice(0, 3).map((f) => f.toLowerCase()))}.`, `Standouts are the ${feat(p, 0)}, ${feat(p, 1)} and ${feat(p, 2)}.`]));
        break;
    }
    if (out.length >= 3) break;
  }
  if (!out.length) {
    out.push(
      c.pick([
        `${The(p)} is a ${p.beds}-bed ${p.type.toLowerCase()} in ${city(p)}, listed at ${formatPrice(p.price)}.`,
        `Ah, ${the(p)} — ${p.beds} bedrooms, ${p.baths} baths and ${p.sqft.toLocaleString()} sq ft in ${city(p)}, at ${formatPrice(p.price)}.`,
        `${p.title.replace(/^the /i, "")} is one of my favourites: ${p.beds} beds, ${p.sqft.toLocaleString()} sq ft, ${formatPrice(p.price)}.`,
      ]),
    );
    out.push(hook(p));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Lead-capture weaving                                                */
/* ------------------------------------------------------------------ */

interface Ask {
  text: string;
  awaiting: Field | null;
  offer?: Offer;
}

function nextAsk(st: ConciergeState, c: Composer): Ask | null {
  const p = st.profile;
  const asked = (f: Field) => st.asked[f] ?? 0;
  const bump = (f: Field) => (st.asked[f] = asked(f) + 1);
  const name = firstName(p);

  if (st.closed) return null;
  if (st.confirmed) {
    // A next step is locked in: at most one gentle ask for their name, never city/budget/timeline again.
    if (!p.name && asked("name") < 1) {
      bump("name");
      return { text: c.pick(["And who should Alex ask for?", "What name should I give Alex?"]), awaiting: "name" };
    }
    return null;
  }

  if (!p.intent && asked("intent") < 1 && st.turns <= 2) {
    bump("intent");
    return { text: c.pick(["Are you looking to buy, sell, or just having a browse for now?", "Are you thinking of buying, or is it a sale you're planning?"]), awaiting: "intent" };
  }
  if (!p.name && st.turns >= 2 && asked("name") < 2) {
    bump("name");
    return {
      text: c.pick([
        "By the way, who do I have the pleasure of chatting with?",
        "I'm Elena, by the way — and you are?",
        "May I ask your name, so Alex knows who he's helping?",
      ]),
      awaiting: "name",
    };
  }
  if ((p.intent === "Buy" || p.intent === "Tour") && !p.timeline && (p.locations || p.budgetMax || p.propertyId) && asked("timeline") < 2) {
    bump("timeline");
    return {
      text: c.pick([
        `What sort of timeline are you working with${name && !st.said.slice(-3).some((x) => x.includes(name)) ? `, ${name}` : ""}?`,
        "Are you hoping to move fairly soon, or is this more of a longer-term plan?",
        "When would you ideally like to be moved in?",
      ]),
      awaiting: "timeline",
    };
  }
  if (p.intent === "Buy" && !p.locations && !p.propertyId && asked("location") < 1) {
    bump("location");
    return { text: c.pick(["Which area are you most drawn to?", "Is there a particular city you have your heart set on?"]), awaiting: "location" };
  }
  if (!hasContact(p) && (p.propertyId || st.lastShown.length || st.turns >= 4) && asked("contact") < 2) {
    bump("contact");
    const prop = byId(p.propertyId) ?? byId(st.lastShown[0]);
    return {
      text: c.pick(
        prop
          ? [
              `Shall I have Alex send you the full brochure for ${the(prop)}? Just pop your email or mobile here.`,
              `I can send over the floor plans and full photo set for ${the(prop)} — what's the best email for you?`,
              `Would you like the private brochure? Drop your email or mobile and Alex will send it over, along with a few off-market homes like it.`,
            ]
          : [
              "If you share your email or mobile, Alex can send you the off-market homes that never make it online.",
              "Want me to have Alex send a shortlist, including a few off-market gems? Just leave your email or number.",
            ],
      ),
      awaiting: "contact",
      offer: prop ? "brochure" : "offmarket",
    };
  }
  return null;
}

export function suggestionsFor(st: ConciergeState): string[] {
  const p = st.profile;
  if (st.closed) return [];
  if (!p.intent) return ["I'm looking to buy", "I want to sell", "Book a tour", "Anything in Miami under $7M?"];
  if (st.awaiting === "tourDay") return ["This Saturday", "Tomorrow afternoon", "Next week"];
  if (st.awaiting === "timeline") return ["ASAP", "1–3 months", "Just exploring"];
  if (st.awaiting === "contact" || st.awaiting === "name") return [];
  if (p.intent === "Sell") return p.sellAddress ? ["What's my home worth?", "How do you market homes?", "What are your fees?"] : [];
  const prop = byId(st.lastShown.length === 1 ? st.lastShown[0] : p.propertyId);
  if (prop) return [`Monthly payment?`, `Book a tour`, "Does it have a pool?", "Show me similar homes"];
  if (st.lastShown.length > 1) return ["Tell me about the first one", "Monthly payments?", "Anything with 5+ beds?"];
  return ["Beverly Hills", "Miami Beach", "Manhattan", "Under $5M"];
}

/* ------------------------------------------------------------------ */
/* Opening                                                             */
/* ------------------------------------------------------------------ */

export function opening(st: ConciergeState, now = new Date()): string[] {
  const c = new Composer(st);
  const h = now.getHours();
  const tod = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return [
    c.pick([`${tod}! I'm Elena 👋 I look after clients here at AuraEstate.`, `Hi there, I'm Elena 👋 — Senior Client Advisor at AuraEstate.`, `${tod} — Elena here from AuraEstate 👋`]),
    c.pick(["Are you looking to buy, sell, or just having a browse?", "What brings you by today — buying, selling, or a little of both?"]),
  ];
}

/* ------------------------------------------------------------------ */
/* Main entry                                                          */
/* ------------------------------------------------------------------ */

export function respond(prev: ConciergeState, text: string): { reply: ConciergeReply; state: ConciergeState } {
  const st: ConciergeState = structuredClone(prev);
  st.turns += 1;
  const { patch, signals: s } = extract(text, st);
  const before = st.profile;
  st.profile = mergeProfile(before, patch);
  const P = st.profile;
  const c = new Composer(st);
  const out: string[] = [];
  let ask: Ask | null = null;
  let ids: string[] = [];
  let suggestions: string[] | null = null;
  const prevOffer = st.offer;
  st.offer = null;
  st.awaiting = null;

  const name = firstName(P);
  const refProp = s.referencedIds.length === 1 ? byId(s.referencedIds[0]) : undefined;
  if (refProp) P.propertyId = refProp.id;
  const newContact = (patch.email && patch.email !== before.email) || (patch.phone && patch.phone !== before.phone);
  const firstContact = newContact && !hasContact(before);
  const newName = !!patch.name && patch.name !== before.name;
  const criteriaChanged = !!(patch.locations || patch.budgetMax || patch.budgetMin || patch.type || patch.minBeds);
  const nm = name ? `, ${name}` : "";
  const memory = memoryPhrase(P);
  const substantive = !s.casual || newContact || newName || criteriaChanged;
  if (substantive) st.closed = false;
  const confirm = (what: Confirmed) => {
    st.confirmed = what;
  };

  /** Warm sign-off once a next step is booked — no more qualifying questions. */
  const close = (): { reply: ConciergeReply; state: ConciergeState } => {
    const prop = byId(P.propertyId);
    const where = P.email ? "inbox" : "phone";
    const lines: Record<string, string[]> = {
      tour: [
        `You're all set${nm}! Alex will reach out shortly to confirm your ${P.tourDay ? `${P.tourDay} ` : ""}viewing${prop ? ` of ${the(prop)}` : ""}. Have a wonderful day! 🏡`,
        `Perfect — you're all booked in. Alex will be in touch soon to confirm the details. Have a lovely day${nm}!`,
      ],
      valuation: [
        `You're all set${nm}! Your full valuation report will be with you within 24 hours. Have a wonderful day!`,
        `Wonderful — Alex is on it, and your market report is on its way. Have a lovely day${nm}! ✨`,
      ],
      brochure: [
        `You're all set${nm}! Keep an eye on your ${where} — Alex will be in touch shortly. Have a wonderful day!`,
        `Wonderful — everything's on its way to your ${where}. Have a lovely day${nm}! ✨`,
      ],
      listings: [
        `You're all set${nm}! Alex will send those off-market listings shortly. Have a wonderful day!`,
        `Perfect — keep an eye on your ${where} for some very special homes. Have a lovely day${nm}! ✨`,
      ],
      callback: [`You're all set${nm}! Alex will give you a call shortly. Have a wonderful day!`, `Lovely — Alex will be in touch very soon. Have a great day${nm}!`],
      lender: [`You're all set${nm}! Our lending partner will reach out shortly. Have a wonderful day!`, `Perfect — expect a call from our lender soon. Have a lovely day${nm}!`],
    };
    const text = prev.closed
      ? c.pick(["Take care! 👋", `Speak soon${nm}! 😊`, "Have a lovely day! ✨", "Anytime — bye for now! 👋", "Enjoy the rest of your day! 🌿"])
      : c.pick(lines[st.confirmed ?? "listings"]);
    st.closed = true;
    st.awaiting = null;
    st.offer = null;
    return { reply: { bubbles: [text], propertyIds: [], suggestions: [], closing: true }, state: st };
  };

  /* 0. Booked + "ok / thanks / sounds good / bye" → close gracefully, never restart */
  if (st.confirmed && s.casual && !newContact && !newName && !criteriaChanged) return close();

  const finish = (): { reply: ConciergeReply; state: ConciergeState } => {
    if (!ask && !out.some((x) => x.trim().endsWith("?"))) ask = nextAsk(st, c);
    if (ask) {
      st.awaiting = ask.awaiting;
      if (ask.offer) st.offer = ask.offer;
    }
    if (ids.length) st.lastShown = ids;
    let bubbles: string[];
    if (!out.length) bubbles = ask ? [ask.text] : [c.pick(["Tell me a little more about what you're after?", "What would be most helpful right now?"])];
    else if (!ask) bubbles = [out.join(" ")];
    else if (out.length === 1 && out[0].length < 90) bubbles = [`${out[0]} ${ask.text}`];
    else bubbles = [out.join(" "), ask.text];
    return { reply: { bubbles, propertyIds: ids, suggestions: suggestions ?? suggestionsFor(st) }, state: st };
  };

  /* 1. Honesty about being AI */
  if (s.askHuman) {
    out.push(
      c.pick([
        "Fair question — I'm Elena, AuraEstate's AI client advisor, so I'm here around the clock.",
        "Honest answer: I'm the AI side of the team, here 24/7 to help you get oriented.",
      ]),
    );
    out.push(c.pick([`Alex, our principal broker, is very much human and personally follows up on everything we discuss.`, `Anything we cover goes straight to Alex, our principal broker, who'll take it from there in person.`]));
    return finish();
  }

  /* 1b. Small talk: "how are you?", "who are you?", "what can you do?", "nice to meet you" */
  const chatty = s.smallTalk || s.askElena || s.capabilities || s.niceToMeet;
  if (chatty && !criteriaChanged && !s.search && !refProp && !s.tour && !s.sell && !s.mortgage && !newContact) {
    if (s.greeting) out.push(c.pick([`Hi${name ? ` ${name}` : ""}!`, "Hello!", "Hey there!"]));
    if (newName) out.push(c.pick([`Lovely to meet you, ${name}.`, `Great to meet you, ${name}!`]));
    if (s.smallTalk && /\b(good|great|well|fine|not bad|ok(ay)?|alright|grand)\b/i.test(text))
      out.push(c.pick(["Glad to hear it! I'm doing really well too, thank you. 😊", "Lovely to hear! All good on my side too, thanks for asking."]));
    else if (s.smallTalk)
      out.push(c.pick(["I'm doing wonderfully, thank you for asking! 😊", "All good here — thanks so much for asking!", "Really well, thank you — it's been a lovely day of house-hunting with clients."]));
    if (s.niceToMeet && !newName) out.push(c.pick([`Lovely to meet you too${nm}!`, `The pleasure's all mine${nm}.`]));
    if (s.askElena)
      out.push(c.pick(["I'm Elena, Senior Client Advisor here at AuraEstate — I help clients find the right home, run the numbers and set up viewings with Alex, our principal broker.", "I'm Elena from AuraEstate! I look after clients day and night, and Alex, our principal broker, takes it from there in person."]));
    if (s.capabilities)
      out.push(c.pick(["I can match you with homes from our listings, work out monthly payments, book private viewings, or give you an instant valuation if you're selling.", "Quite a lot! Finding homes that fit your wishlist, running mortgage numbers, booking tours, and valuing your current place if you're selling."]));
    if (st.confirmed) ask = { text: c.pick(["Is there anything else I can help with?", "Anything else on your mind?"]), awaiting: null };
    else if (!P.intent) ask = { text: c.pick(["What brings you to AuraEstate today — buying, selling, or just browsing?", "Are you thinking of buying or selling at the moment?"]), awaiting: "intent" };
    else if (memory) ask = { text: c.pick([`Shall we pick up where we left off — homes ${memory}?`, `Want to keep looking at homes ${memory}?`]), awaiting: null };
    return finish();
  }

  /* 1c. "What was my budget again?" — show we remember */
  if (s.recall) {
    const bits: string[] = [];
    if (P.intent === "Sell") bits.push(`you're selling${P.sellAddress ? ` ${P.sellAddress}` : ""}${P.sellEstimate ? ` (est. ${formatPrice(P.sellEstimate)})` : ""}`);
    else if (memory) bits.push(`you're looking for homes ${memory}`);
    const prop = byId(P.propertyId);
    if (prop) bits.push(`you liked ${the(prop)}`);
    if (P.timeline) bits.push(`your timeline is ${P.timeline === "ASAP" ? "ASAP" : P.timeline.toLowerCase()}`);
    if (P.wantsTour) bits.push(`you'd like a viewing${P.tourDay ? ` on ${P.tourDay}` : ""}`);
    out.push(bits.length ? c.pick([`Here's what I have so far: ${listJoin(bits)}.`, `From what you've told me, ${listJoin(bits)}.`]) : c.pick(["We haven't pinned anything down yet — tell me a city or budget and I'll keep track of it for you.", "Nothing saved just yet! Give me a city, budget or must-have and I'll remember it."]));
    if (bits.length) ask = { text: c.pick(["Anything you'd like to change?", "Shall we keep going from there?"]), awaiting: null };
    return finish();
  }

  /* 2. Wants a real person */
  if (s.wantsHuman && !newContact) {
    out.push(c.pick(["Of course — Alex would love to speak with you.", "Absolutely, I'll get Alex on it."]));
    if (hasContact(P)) {
      out.push(`He'll reach out on ${P.phone ?? P.email} shortly${nm}.`);
      confirm("callback");
    }
    else ask = { text: c.pick(["What's the best number for him to call you on?", "What's the best mobile to reach you on?"]), awaiting: "contact", offer: "alex" };
    return finish();
  }

  /* 3. Contact details just shared */
  if (newContact) {
    if (newName) out.push(c.pick([`Lovely to meet you, ${name}.`, `Thanks, ${name}!`]));
    if (firstContact) {
      const prop = byId(P.propertyId);
      const channel = patch.phone ? "phone" : "inbox";
      if (prevOffer === "alex") {
        out.push(c.pick([`Thank you${nm}! Alex will give you a call shortly.`, "Perfect — I've passed that to Alex, and he'll be in touch very soon."]));
        confirm("callback");
      } else if (prevOffer === "lender") {
        out.push(c.pick(["Thank you! Our lending partner will reach out shortly to get your pre-approval started.", "Perfect — I'll have our lender get in touch with you."]));
        confirm("lender");
      } else if (P.wantsTour && prop && P.intent !== "Sell") {
        confirm("tour");
        out.push(c.pick([`Thank you${name && !newName ? `, ${name}` : ""}! Alex will text you shortly to confirm your private tour of ${the(prop)}${P.tourDay ? ` on ${P.tourDay}` : ""}.`, `Perfect — I've booked that in with Alex, and he'll confirm your viewing of ${the(prop)} shortly.`]));
      } else if (P.intent === "Sell") {
        confirm("valuation");
        out.push(c.pick([`Thank you! Alex will send your full valuation report and a pricing strategy within 24 hours.`, `Wonderful — Alex will prepare a full market analysis for your home and send it over within a day.`]));
      } else if (prop || prevOffer === "brochure") {
        confirm("brochure");
        out.push(c.pick([`Thank you! Alex will send the full brochure for ${prop ? the(prop) : "the property"} to your ${channel} shortly, plus a few off-market homes I think you'll love.`, `Done — ${prop ? the(prop) : "the brochure"} details are on their way to your ${channel}, along with some private listings.`]));
      } else {
        confirm("listings");
        out.push(c.pick([`Thank you! Agent Alex will send exclusive off-market listings to your ${channel} shortly.`, `Perfect, thank you — Alex will be in touch with some exclusive off-market options very soon.`]));
      }
      if (!P.name) ask = { text: c.pick(["And who should Alex ask for?", "And what name should I pass along to Alex?"]), awaiting: "name" };
    } else {
      out.push(c.pick(["Perfect, I've added that too.", "Got it — I've updated your details for Alex."]));
    }
    return finish();
  }

  /* 4. Name shared (may be combined with more below) */
  if (newName) {
    out.push(c.pick([`Lovely to meet you, ${name}.`, `Great to meet you, ${name}!`, `Thanks, ${name} — so nice to meet you.`]));
  }

  /* 5. Selling */
  if (s.sell || (P.intent === "Sell" && (patch.sellAddress || prev.awaiting === "sellAddress"))) {
    P.intent = "Sell";
    if (patch.sellAddress || (P.sellAddress && s.sell && /worth|valu/i.test(text))) {
      const addr = P.sellAddress!;
      const est = estimate(addr);
      P.sellEstimate = est.value;
      out.push(
        c.pick([
          `Based on recent comparable sales, homes like yours are trading around ${formatPrice(est.low)}–${formatPrice(est.high)} right now.`,
          `My quick read from nearby comps puts a home like that at roughly ${formatPrice(est.low)} to ${formatPrice(est.high)}.`,
        ]),
      );
      out.push(c.pick([`Prices there are up about ${est.trend}% year over year, so the timing is on your side.`, `With values up ${est.trend}% on last year, it's a strong moment to be selling.`]));
      if (!hasContact(P))
        ask = { text: c.pick(["If you share your email, Alex will put together a full market analysis and pricing strategy — free, no obligation.", "Shall I have Alex send a proper valuation report? Just leave your email or mobile."]), awaiting: "contact", offer: "valuation" };
      else if (!P.timeline) ask = { text: c.pick(["When are you hoping to list?", "Do you have a timeframe in mind for selling?"]), awaiting: "timeline" };
    } else {
      out.push(c.pick([`Wonderful — our sellers average 4.2% over asking, so you'd be in good hands.`, `Lovely. Selling well is all about pricing and presentation, and that's where Alex shines.`]));
      ask = { text: c.pick(["Where's the property? A street address is perfect if you're happy to share.", "What's the address of the home you're thinking of selling?"]), awaiting: "sellAddress" };
    }
    return finish();
  }

  /* 6. Mortgage & affordability */
  if (s.mortgage) {
    if (/pre-?approv|lender|financ/i.test(text) && !/monthly|per month|payment/i.test(text)) {
      out.push(c.pick(["Alex works with a couple of excellent private lenders who move quickly on jumbo loans.", "We have trusted lending partners who can get you pre-approved in a day or two."]));
      if (!hasContact(P)) ask = { text: "Shall I have them reach out? Just share your email or mobile.", awaiting: "contact", offer: "lender" };
      return finish();
    }
    const prop = refProp ?? (!patch.budgetMax ? byId(P.propertyId) : undefined);
    const price = prop?.price ?? P.budgetMax ?? 1_000_000;
    const down = s.downPct ?? 20;
    const rate = s.rate ?? 6.5;
    const years = s.years ?? 30;
    const r = calcMortgage({ price, downPct: down, rate, years });
    const what = prop ? `${the(prop)} at ${formatPrice(prop.price)}` : `a ${formatPrice(price)} home`;
    out.push(
      c.pick([
        `On ${what}, with ${down}% down at ${rate}% over ${years} years, you'd be at roughly ${usd(r.total)} a month all-in.`,
        `For ${what}, putting ${down}% down at ${rate}% on a ${years}-year loan works out to about ${usd(r.total)}/mo.`,
      ]),
    );
    out.push(
      c.pick([
        `That's around ${usd(r.principalInterest)} in principal and interest, with the rest taxes and insurance${r.pmi ? " plus PMI" : ""}.`,
        `About ${usd(r.principalInterest)} of that is the loan itself; the remainder covers taxes and insurance${r.pmi ? " and PMI" : ""}.`,
      ]),
    );
    if (prop) ids = [prop.id];
    if (!hasContact(P) && (st.asked.contact ?? 0) < 2) {
      st.asked.contact = (st.asked.contact ?? 0) + 1;
      ask = { text: c.pick(["Would you like an intro to our lender for a quick pre-approval?", "Want me to connect you with our lender to firm that up?"]), awaiting: null, offer: "lender" };
    }
    suggestions = years === 30 ? ["What about 15 years?", "With 30% down?", "Book a tour"] : ["30-year instead?", "With 10% down?", "Book a tour"];
    return finish();
  }

  /* 7. Tours */
  if (s.tour || (prev.awaiting === "tourDay" && patch.tourDay) || (prevOffer === "tour" && s.affirm)) {
    const prop = refProp ?? byId(P.propertyId) ?? (st.lastShown.length === 1 ? byId(st.lastShown[0]) : undefined);
    if (P.intent !== "Sell") P.intent = "Tour";
    P.wantsTour = true;
    if (!prop) {
      out.push(c.pick(["I'd be glad to set up a private showing.", "Happy to arrange a viewing for you."]));
      ask = { text: c.pick(["Which home would you like to see?", "Which of our homes caught your eye?"]), awaiting: null };
      suggestions = PROPERTIES.slice(0, 4).map((p) => p.title);
      return finish();
    }
    P.propertyId = prop.id;
    ids = [prop.id];
    if (P.tourDay) {
      out.push(c.pick([`${P.tourDay} works beautifully for ${the(prop)}.`, `Lovely — I've pencilled in ${P.tourDay} for ${the(prop)}.`]));
      if (hasContact(P)) confirm("tour");
      if (hasContact(P)) out.push(c.pick(["Alex will confirm the exact time with you shortly.", `Alex will be in touch to lock in the time${name ? `, ${name}` : ""}.`]));
      else ask = { text: c.pick(["What's the best mobile number to confirm the time with you?", "What number should Alex text to confirm?"]), awaiting: "contact", offer: "tour" };
    } else {
      out.push(c.pick([`I'd love to arrange a private showing of ${the(prop)} in ${city(prop)}.`, `${The(prop)} is even better in person — let's get you through the door.`]));
      ask = { text: c.pick(["What day works best for you?", "When would suit you to see it?"]), awaiting: "tourDay" };
    }
    return finish();
  }

  /* 7b. "Send me the brochure / floor plans" */
  if (s.wantsBrochure) {
    const prop = refProp ?? byId(P.propertyId) ?? byId(st.lastShown[0]);
    if (prop) {
      P.propertyId = prop.id;
      ids = [prop.id];
    }
    if (hasContact(P)) {
      out.push(c.pick([`Done — I'll have Alex send ${prop ? `the full brochure for ${the(prop)}` : "everything"} to ${P.email ?? P.phone} shortly.`, `Of course! ${prop ? `The ${prop.title.replace(/^the /i, "")} brochure` : "The details"} will be with you shortly.`]));
      confirm("brochure");
    } else {
      out.push(c.pick([`Of course — ${prop ? `the ${prop.title.replace(/^the /i, "")} brochure has the floor plans and full photo set` : "Alex has full brochures for all our homes"}.`, "Happy to send that over."]));
      ask = { text: c.pick(["What's the best email for you?", "Where should I send it — email or mobile?"]), awaiting: "contact", offer: "brochure" };
    }
    return finish();
  }

  /* 7c. "Show me similar / cheaper / bigger" — remember what they've seen and move on from it */
  if (s.similar || s.cheaper || s.bigger) {
    const base = refProp ?? byId(P.propertyId) ?? byId(st.lastShown[0]);
    const seen = new Set(s.similar ? [...st.lastShown, ...(base ? [base.id] : [])] : base ? [base.id] : []);
    const crit: Profile = s.similar && !s.cheaper && !s.bigger
      ? { ...P, type: base?.type ?? P.type, budgetMax: undefined, budgetMin: undefined, minBeds: undefined }
      : {
          ...P,
          budgetMax: s.cheaper ? Math.max(0, (base?.price ?? P.budgetMax ?? 5_000_000) - 1) : P.budgetMax,
          minBeds: s.bigger ? (base?.beds ?? P.minBeds ?? 3) + 1 : P.minBeds,
        };
    const fresh = (list: typeof PROPERTIES) => list.filter((x) => !seen.has(x.id)).sort((a, b) => Number(st.lastShown.includes(a.id)) - Number(st.lastShown.includes(b.id)));
    let found = fresh(search(crit));
    let broadened = false;
    if (!found.length) {
      found = fresh(search({ ...crit, locations: undefined, type: s.similar ? undefined : crit.type }));
      broadened = found.length > 0 && !!crit.locations?.length;
    }
    if (s.similar && base) found.sort((a, b) => Math.abs(a.price - base.price) - Math.abs(b.price - base.price));
    if (s.cheaper) found.sort((a, b) => b.price - a.price); // closest step down first
    const what = s.cheaper ? "a little lower in price" : s.bigger ? "with more space" : "in a similar spirit";
    if (found.length) {
      const top = found.slice(0, 2);
      ids = top.map((x) => x.id);
      const first = top[0];
      out.push(
        c.pick([
          `For something ${what}, ${the(first)} in ${city(first)} at ${formatPrice(first.price)} is lovely — ${feat(first, 0)} and ${feat(first, 1)}.`,
          `If you'd like something ${what}, have a look at ${the(first)} in ${city(first)} (${formatPrice(first.price)}, ${first.beds} beds).`,
        ]),
      );
      if (top[1]) out.push(c.pick([`${The(top[1])} in ${city(top[1])} at ${formatPrice(top[1].price)} is another good fit.`, `There's also ${the(top[1])} at ${formatPrice(top[1].price)}.`]));
      if (broadened) out.push(c.pick([`${top.length > 1 ? "They're" : "It's"} outside ${listJoin([...new Set(crit.locations!.map((l) => l.split(",")[0]))])}, but worth a look.`, "Different area, mind you — but a beautiful home."]));
    } else {
      out.push(c.pick([`${base ? The(base) : "What you've seen"} is actually the ${s.cheaper ? "most accessibly priced" : s.bigger ? "most spacious" : "closest"} public match I have right now.`, "That's the best of what's on the open market for that, I'm afraid."]));
      if (!hasContact(P))
        ask = { text: c.pick(["Alex often has quieter off-market options, though — shall I have him send a few? Just leave your email or mobile.", "Want Alex to send some off-market alternatives? Just drop your email or number."]), awaiting: "contact", offer: "offmarket" };
    }
    return finish();
  }

  /* 8. Questions about a specific property */
  if (refProp && (s.detail || s.attributes.length || !(patch.budgetMax || patch.minBeds || patch.budgetMin) || (s.affirm && st.lastShown.length === 1))) {
    out.push(...detailSentences(refProp, s.attributes, c));
    ids = [refProp.id];
    return finish();
  }

  /* 9. Rentals */
  if (s.rent) {
    out.push(c.pick(["We focus on sales rather than rentals, but Alex has a trusted partner for luxury leases.", "Rentals aren't really our world — we're a sales brokerage — though Alex can point you to a great leasing partner."]));
    ask = { text: c.pick(["Would an introduction help, or are you open to buying?", "Shall I ask him to connect you, or would you consider buying?"]), awaiting: "intent", offer: "alex" };
    return finish();
  }

  /* 10. Off-market */
  if (s.offMarket) {
    out.push(c.pick([`We do — about 70% of what we sell never hits the portals.`, `Plenty — most of our best homes trade quietly, off-market.`]));
    out.push(c.pick(["I can't share those details in chat, but Alex sends them privately.", "Those are shared one-to-one by Alex rather than online."]));
    if (!hasContact(P)) ask = { text: c.pick(["What's the best email or mobile to send them to?", "Shall I have him send a few? Just drop your email or number."]), awaiting: "contact", offer: "offmarket" };
    return finish();
  }

  /* 11. Brokerage questions */
  if (s.fees || s.about || s.office) {
    if (s.fees) out.push(c.pick(["There's no cost to chat, tour or get a valuation, and Alex walks you through fees transparently upfront — no surprises.", "Fees depend on the deal, but Alex lays everything out clearly before you commit to anything."]));
    if (s.about) out.push(c.pick([`We're a boutique luxury brokerage, founded in ${BROKERAGE.founded}, with ${BROKERAGE.stats.split(",")[0]} in sales and a 4.9★ rating.`, `AuraEstate has been around since ${BROKERAGE.founded}; Alex Morgan leads the team, and our homes close in 18 days on average.`]));
    if (s.office) out.push(c.pick([`Our office is at ${BROKERAGE.office}.`, `We're based at ${BROKERAGE.office} — Alex is happy to meet there or at a property.`]));
    return finish();
  }

  /* 12. Property search */
  if (criteriaChanged || s.search || s.unknownPlace || (s.buy && (P.locations || P.budgetMax) && !st.lastShown.length)) {
    if (s.unknownPlace && !patch.locations) {
      out.push(c.pick([`We don't have public listings in ${s.unknownPlace} right now — our core markets are LA, Miami, Austin, New York and London.`, `${s.unknownPlace} isn't one of our markets yet, I'm afraid; we focus on LA, Miami, Austin, Manhattan and London.`]));
      ask = { text: c.pick(["Alex does work with trusted partner brokers there — would you like an introduction?", "Would any of our markets work for you, or shall I ask Alex for a referral?"]), awaiting: null, offer: "alex" };
      return finish();
    }
    const results = search(P);
    const crit = criteriaPhrase(P);
    if (results.length === 1 && st.lastShown.length === 1 && st.lastShown[0] === results[0].id) {
      const p = results[0];
      ids = [p.id];
      out.push(c.pick([`${The(p)} is still the best public match ${crit || "for you"}.`, `For homes ${crit || "like that"}, ${the(p)} remains the standout on the open market.`]));
      if (!hasContact(P))
        ask = { text: c.pick(["Alex usually has a few off-market homes like it too — shall I have him send them? Just leave your email or mobile.", "Want me to have Alex send the off-market options in that range as well? Just drop your email or number."]), awaiting: "contact", offer: "offmarket" };
    } else if (results.length === 1) {
      const p = results[0];
      ids = [p.id];
      P.propertyId = p.id;
      out.push(
        c.pick([
          `Yes — ${the(p)} in ${city(p)} is listed at ${formatPrice(p.price)}.`,
          `I do have one I think you'll love: ${the(p)}, ${formatPrice(p.price)}, in ${city(p)}.`,
          `There's ${the(p)} in ${city(p)} at ${formatPrice(p.price)} — it's a beauty.`,
        ]),
      );
      out.push(c.pick([`It's a ${p.beds}-bed ${p.type.toLowerCase()} with ${feat(p, 0)} and ${feat(p, 1)}.`, `${p.beds} bedrooms, ${p.sqft.toLocaleString()} sq ft, and ${feat(p, 0)}.`]));
    } else if (results.length > 1) {
      const top = results.slice(0, 3);
      ids = top.map((p) => p.id);
      const list = listJoin(top.map((p) => `${the(p)} in ${city(p)} (${formatPrice(p.price)})`));
      out.push(
        c.pick([
          `I've got ${results.length} ${crit ? `${crit} ` : ""}right now: ${list}${results.length > 3 ? ", plus another" : ""}.`.replace("  ", " "),
          `A few come to mind${crit ? ` ${crit}` : ""} — ${list}.`,
        ]),
      );
      ask = { text: c.pick(["Would you like the details on any of them?", "Any of those catch your eye?", "Shall I tell you more about one of them?"]), awaiting: null, offer: null };
    } else {
      // Nothing public — find the closest alternative and lean on off-market.
      const relaxedBudget = search({ ...P, budgetMax: undefined, budgetMin: undefined }).sort((a, b) => a.price - b.price)[0];
      const relaxedLoc = search({ ...P, locations: undefined })[0];
      const alt = relaxedBudget ?? relaxedLoc ?? search({ budgetMax: P.budgetMax })[0];
      out.push(c.pick([`Nothing public ${crit || "like that"} at the moment, I'm afraid.`, `I don't have anything on the open market ${crit || "that fits"} just now.`]));
      if (alt) {
        ids = [alt.id];
        out.push(
          alt === relaxedBudget
            ? c.pick([`The closest is ${the(alt)} at ${formatPrice(alt.price)} — a stretch, but ${feat(alt, 0)} and ${feat(alt, 1)}.`, `Nearest match is ${the(alt)} in ${city(alt)} at ${formatPrice(alt.price)}.`])
            : c.pick([`In your range, ${the(alt)} in ${city(alt)} (${formatPrice(alt.price)}) is lovely.`, `If you're flexible on location, ${the(alt)} in ${city(alt)} at ${formatPrice(alt.price)} could suit.`]),
        );
      }
      if (!hasContact(P))
        ask = { text: c.pick(["Alex often has quieter, off-market options in that range — shall I have him send a few? Just leave your email or mobile.", "Most of our inventory is off-market, so Alex may well have the perfect fit — what's the best email to send options to?"]), awaiting: "contact", offer: "offmarket" };
    }
    return finish();
  }

  /* 13. Affirmations to an earlier offer */
  if (s.affirm && prevOffer) {
    if (prevOffer === "tour") return finish();
    if (hasContact(P)) {
      out.push(c.pick([`Done — Alex will send it to ${P.email ?? P.phone} shortly.`, "Wonderful, I'll pass that straight to Alex."]));
      confirm(prevOffer === "valuation" ? "valuation" : prevOffer === "lender" ? "lender" : prevOffer === "alex" ? "callback" : prevOffer === "brochure" ? "brochure" : "listings");
    }
    else ask = { text: c.pick(["Wonderful — what's the best email or mobile for you?", "Great! Where should Alex send it — email or mobile?"]), awaiting: "contact", offer: prevOffer };
    return finish();
  }
  if (s.affirm && st.lastShown.length > 1) {
    ask = { text: c.pick(["Which one would you like to hear about?", "Which caught your eye?"]), awaiting: null };
    suggestions = st.lastShown.map((id) => byId(id)!.title);
    return finish();
  }

  if (s.affirm && prev.awaiting === "name") {
    ask = { text: c.pick(["Lovely — what should I call you?", "Wonderful! And your name is…?"]), awaiting: "name" };
    return finish();
  }

  if (s.negative) {
    out.push(c.pick(["No problem at all.", "Of course, no pressure."]));
    ask = { text: c.pick(["Is there anything else I can help you explore?", "What else would be useful to know?"]), awaiting: null };
    return finish();
  }

  /* 14. Greetings, thanks, goodbyes */
  if (s.thanks || s.bye) {
    out.push(c.pick([`You're so welcome${name ? `, ${name}` : ""}!`, `My pleasure${name ? `, ${name}` : ""}.`, "Anytime — it's been lovely chatting."]));
    if (!hasContact(P)) out.push(c.pick(["If you'd like Alex to send anything over, just drop your email here anytime.", "I'm here 24/7 whenever you want to pick this back up."]));
    else out.push(c.pick(["Alex will be in touch soon.", "Speak soon!"]));
    st.awaiting = null;
    return { reply: { bubbles: [out.join(" ")], propertyIds: [], suggestions: suggestionsFor(st) }, state: st };
  }

  if (s.greeting && !newName) {
    out.push(c.pick(st.turns > 1 ? [`Hi${name ? ` ${name}` : ""}! Lovely to hear from you.`, "Hello again! 😊"] : [`Hi${name ? ` ${name}` : ""}! Lovely to hear from you.`, "Hey there! 😊"]));
    if (st.confirmed) ask = { text: c.pick(["Is there anything else I can help with?", "What else can I do for you?"]), awaiting: null };
    else if (memory && st.turns > 1) ask = { text: c.pick([`Still thinking about homes ${memory}?`, `Shall we carry on with homes ${memory}?`]), awaiting: null };
    else if (!P.intent) ask = { text: c.pick(["Are you thinking about buying or selling?", "What can I help you find?"]), awaiting: "intent" };
    return finish();
  }

  /* 15. Intent only / timeline only / buying with no criteria */
  if (patch.timeline && patch.timeline !== before.timeline) {
    out.push(
      patch.timeline === "ASAP"
        ? c.pick(["Got it — moving quickly, so I'll make sure Alex prioritises you.", "Understood, let's move fast then."])
        : patch.timeline === "Just exploring"
          ? c.pick(["No pressure at all — exploring is half the fun.", "Perfect, there's no rush."])
          : P.intent === "Sell"
            ? c.pick([`${patch.timeline} gives Alex time to prepare the home beautifully for market.`, `Great — that's a sensible runway to plan the launch properly.`])
            : c.pick([`${patch.timeline} gives us a lovely window to find the right place.`, `Great, ${patch.timeline.toLowerCase()} is plenty of time to do this properly.`]),
    );
    return finish();
  }

  if (P.intent === "Buy" && s.buy && memory) {
    out.push(c.pick([`Perfect — I'm keeping homes ${memory} in mind for you.`, `Got it. I'll stay focused on homes ${memory}.`]));
    return finish();
  }

  /* Plain acknowledgements ("ok", "cool") mid-conversation: keep things moving without resetting. */
  if (s.casual && !s.thanks && !s.bye) {
    out.push(c.pick(["Perfect.", "Lovely.", "Great!", "Wonderful."]));
    return finish();
  }

  if (P.intent === "Buy" && (s.buy || prev.awaiting === "intent")) {
    out.push(c.pick(["Exciting! Let's find you something special.", "Lovely — I'd love to help you find the one.", "Wonderful, that's my favourite kind of search."]));
    ask = { text: c.pick(["Which city are you focused on, and roughly what budget?", "Where are you hoping to be, and is there a budget you're working within?"]), awaiting: "location" };
    suggestions = ["Beverly Hills", "Miami Beach", "Austin", "Kensington, London"];
    return finish();
  }

  if (newName) return finish();

  /* 16. Not sure what they meant */
  const mentioned = propertiesMentioned(text);
  if (mentioned.length) {
    ids = mentioned;
    out.push(c.pick(["Happy to tell you more about that one.", "Ah, that's a special one."]));
    return finish();
  }
  if (st.confirmed) {
    out.push(c.pick(["Is there anything else I can help with before Alex reaches out?", "Happy to help with anything else in the meantime — payments, other homes, or questions about the area.", "Anything else you'd like to know while you wait to hear from Alex?"]));
    return finish();
  }
  if (memory) {
    out.push(c.pick([`Would you like to keep exploring homes ${memory}, or try something different?`, `I can keep searching homes ${memory}, run the monthly numbers, or book a viewing — what would help most?`]));
    return finish();
  }
  out.push(
    c.pick([
      "I want to point you in the right direction — are you thinking about a particular city or price range?",
      "Tell me a little about what you're picturing — a city, a budget, number of bedrooms?",
      `I can help with listings, payments, tours or a home valuation — which would be most useful?`,
      `Hmm, let me make sure I've got you — are you buying, selling, or curious about something specific?`,
    ]),
  );
  return finish();
}

/** In live-AI mode: let the local state learn from the model's reply (what was shown/asked). */
export function absorbAssistantReply(prev: ConciergeState, reply: string): ConciergeState {
  const st: ConciergeState = structuredClone(prev);
  const ids = propertiesMentioned(reply);
  if (ids.length) st.lastShown = ids;
  if (ids.length === 1) st.profile.propertyId = ids[0];
  const q = reply.split(/(?<=[.!?])\s/).filter((x) => x.includes("?")).pop() ?? "";
  st.awaiting =
    /\b(your name|who (do i|am i)|and you are|call you)\b/i.test(q) ? "name"
    : /\b(email|mobile|phone|number|text you|reach you)\b/i.test(q) ? "contact"
    : /\b(what day|which day|when would you like to (see|tour|visit)|when suits)\b/i.test(q) ? "tourDay"
    : /\b(timeline|timeframe|move in|moved in|how soon|when are you (hoping|planning|looking))\b/i.test(q) ? "timeline"
    : /\b(address|where is the (home|property)|where's the property)\b/i.test(q) ? "sellAddress"
    : /\b(buy|sell)\b/i.test(q) ? "intent"
    : null;
  st.said.push(...reply.split(/(?<=[.!?])\s/));
  return st;
}

