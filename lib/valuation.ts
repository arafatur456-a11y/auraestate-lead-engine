/** Shared demo valuation model — used by the Sell Your Home section and the AI concierge. */
/** Market bands used to produce a plausible demo valuation from the address text. */
export const MARKETS: { match: RegExp; min: number; max: number; trend: number }[] = [
  { match: /beverly|bel air|malibu|90210|90265/i, min: 3_800_000, max: 11_500_000, trend: 6.2 },
  { match: /manhattan|new york|tribeca|soho|nyc|brooklyn/i, min: 1_900_000, max: 6_800_000, trend: 3.9 },
  { match: /miami|palm beach|fl\b|florida/i, min: 1_200_000, max: 4_600_000, trend: 7.4 },
  { match: /london|kensington|chelsea|mayfair|uk\b/i, min: 1_300_000, max: 4_200_000, trend: 2.8 },
  { match: /austin|tx\b|texas/i, min: 650_000, max: 2_400_000, trend: 4.1 },
];
const DEFAULT_MARKET = { min: 550_000, max: 1_900_000, trend: 4.8 };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export function estimate(address: string) {
  const m = MARKETS.find((x) => x.match.test(address)) ?? DEFAULT_MARKET;
  const h = hash(address.trim().toLowerCase());
  const value = Math.round((m.min + h * (m.max - m.min)) / 5000) * 5000;
  return {
    value,
    low: Math.round((value * 0.94) / 5000) * 5000,
    high: Math.round((value * 1.06) / 5000) * 5000,
    trend: m.trend,
    comps: 8 + Math.floor(h * 14),
    confidence: 89 + Math.floor(h * 8),
  };
}


export type Valuation = ReturnType<typeof estimate>;
