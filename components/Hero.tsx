"use client";

import { motion } from "framer-motion";
import { BedDouble, Building, ChevronDown, MapPin, Search, ShieldCheck, Sparkles, Star, Wallet } from "lucide-react";
import SmartImage from "./SmartImage";
import { BEDROOM_OPTIONS, HERO_IMAGE, LOCATIONS, PROPERTY_TYPES, formatPrice, type PropertyType } from "@/lib/data";
import { SLIDER_MAX, type SearchFilters } from "@/lib/filters";

interface HeroProps {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onSearch: () => void;
  resultCount: number;
}

const STATS = [
  { value: "$2.4B+", label: "Sales volume" },
  { value: "1,200+", label: "Homes sold" },
  { value: "18 days", label: "Avg. time to close" },
];

function Field({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <label className="group relative flex min-w-0 flex-1 flex-col gap-1 rounded-2xl px-4 py-3 transition hover:bg-slate-50 focus-within:bg-slate-50">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5 text-emerald-600" /> {label}
      </span>
      {children}
    </label>
  );
}

const selectCls =
  "w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-[15px] font-medium text-slate-900 outline-none";

export default function Hero({ filters, onChange, onSearch, resultCount }: HeroProps) {
  const sliderValue = filters.maxPrice === Infinity ? SLIDER_MAX : filters.maxPrice;
  const fill = `${(sliderValue / SLIDER_MAX) * 100}%`;

  return (
    <section id="top" className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-slate-950 pb-16 pt-28 sm:pt-32">
      {/* Background */}
      <motion.div
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 -z-10"
      >
        <SmartImage src={HERO_IMAGE} alt="Luxury modern villa at dusk" fill priority sizes="100vw" className="object-cover" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/55 to-slate-950/90" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.25),transparent_55%)]" />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            Now with a 24/7 AI property concierge
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Find Your Dream Property <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">in Less Time.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            Hand-picked luxury villas, penthouses and residences across Beverly Hills, Miami, Austin, Dallas and Manhattan —
            with off-market access you won&apos;t find on the portals.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="mt-10 rounded-3xl bg-white p-2 shadow-2xl shadow-black/40 ring-1 ring-white/20"
          aria-label="Property search"
        >
          <div className="flex flex-col divide-y divide-slate-100 lg:flex-row lg:items-stretch lg:divide-x lg:divide-y-0">
            <Field icon={MapPin} label="Location">
              <div className="relative">
                <select
                  className={selectCls}
                  value={filters.location}
                  onChange={(e) => onChange({ ...filters, location: e.target.value })}
                >
                  <option value="">All locations</option>
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>

            <Field icon={Building} label="Property type">
              <div className="relative">
                <select
                  className={selectCls}
                  value={filters.type}
                  onChange={(e) => onChange({ ...filters, type: e.target.value as PropertyType | "" })}
                >
                  <option value="">Any type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>

            <Field icon={Wallet} label="Max price">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1_000_000}
                  max={SLIDER_MAX}
                  step={250_000}
                  value={sliderValue}
                  style={{ ["--fill" as string]: fill }}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChange({ ...filters, maxPrice: v >= SLIDER_MAX ? Infinity : v });
                  }}
                  className="aura-range min-w-0 flex-1"
                  aria-label="Maximum price"
                />
                <span className="w-16 shrink-0 text-right text-[15px] font-semibold tabular-nums text-slate-900">
                  {filters.maxPrice === Infinity ? "Any" : formatPrice(filters.maxPrice)}
                </span>
              </div>
            </Field>

            <Field icon={BedDouble} label="Bedrooms">
              <div className="flex gap-1">
                {BEDROOM_OPTIONS.map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => onChange({ ...filters, minBeds: b })}
                    className={`h-7 flex-1 rounded-lg text-xs font-semibold transition ${
                      filters.minBeds === b ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    aria-pressed={filters.minBeds === b}
                  >
                    {b === 0 ? "Any" : `${b}+`}
                  </button>
                ))}
              </div>
            </Field>

            <div className="p-2 lg:pl-3">
              <button
                type="submit"
                className="flex h-full min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-7 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.98] lg:w-auto"
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
                <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs tabular-nums">{resultCount}</span>
              </button>
            </div>
          </div>
        </motion.form>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <dl className="grid grid-cols-3 gap-6 sm:gap-12">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{s.value}</dd>
                <dd className="mt-1 text-xs text-white/60 sm:text-sm">{s.label}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1.5 font-semibold text-white">4.9</span>
              <span className="text-white/60">(380+ reviews)</span>
            </div>
            <span className="hidden items-center gap-1.5 md:flex">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> Verified Boutique Brokerage
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
