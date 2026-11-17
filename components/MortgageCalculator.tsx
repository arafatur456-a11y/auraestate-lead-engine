"use client";

import { useEffect, useMemo, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import { BadgeCheck, Calculator, Home, Info, Landmark, Percent, Wallet } from "lucide-react";
import clsx from "clsx";
import { useCRM } from "@/context/CRMContext";
import { INSURANCE_RATE, PROPERTY_TAX_RATE, calcMortgage, usd } from "@/lib/mortgage";

const PRICE_MIN = 100_000;
const PRICE_MAX = 5_000_000;

/** Smoothly tweens a dollar figure as the inputs change. */
function AnimatedDollars({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  useMotionValueEvent(mv, "change", (v) => setDisplay(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.35, ease: "easeOut" });
    return () => controls.stop();
  }, [mv, value]);
  return <span className={className}>{usd(Math.round(display))}</span>;
}

function SliderRow({
  icon: Icon,
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  hint,
  children,
}: {
  icon: React.ElementType;
  label: string;
  valueLabel?: React.ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint?: [string, string];
  children?: React.ReactNode;
}) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-white/80">
          <Icon className="h-4 w-4 text-emerald-400" /> {label}
        </label>
        {children ?? <span className="text-sm font-semibold tabular-nums text-white">{valueLabel}</span>}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: fill }}
        className="aura-range aura-range-dark mt-3 w-full"
      />
      {hint && (
        <div className="mt-1.5 flex justify-between text-[11px] text-white/40">
          <span>{hint[0]}</span>
          <span>{hint[1]}</span>
        </div>
      )}
    </div>
  );
}

export default function MortgageCalculator() {
  const { openChatWith } = useCRM();
  const [price, setPrice] = useState(1_000_000);
  const [priceText, setPriceText] = useState("1,000,000");
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState<15 | 30>(30);

  const r = useMemo(() => calcMortgage({ price, downPct, rate, years }), [price, downPct, rate, years]);

  const setPriceBoth = (v: number) => {
    const clamped = Math.min(Math.max(v, 0), 50_000_000);
    setPrice(clamped);
    setPriceText(clamped.toLocaleString("en-US"));
  };

  const parts = [
    { label: "Principal & Interest", value: r.principalInterest, color: "bg-emerald-400", stroke: "#34d399" },
    { label: "Property Taxes", value: r.taxes, color: "bg-sky-400", stroke: "#38bdf8", note: `${(PROPERTY_TAX_RATE * 100).toFixed(1)}%/yr` },
    { label: "Home Insurance", value: r.insurance, color: "bg-violet-400", stroke: "#a78bfa", note: `${(INSURANCE_RATE * 100).toFixed(2)}%/yr` },
    ...(r.pmi > 0 ? [{ label: "PMI", value: r.pmi, color: "bg-amber-400", stroke: "#fbbf24", note: "<20% down" }] : []),
  ];

  // Donut geometry: each segment's length and starting offset along the circle
  const R = 70;
  const C = 2 * Math.PI * R;
  const segments = parts.reduce<{ len: number; start: number }[]>((acc, p) => {
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
    return [...acc, { len: r.total ? (p.value / r.total) * C : 0, start }];
  }, []);

  return (
    <section id="mortgage" className="scroll-mt-20 pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Mortgage Calculator</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Know your monthly payment in seconds.</h2>
            <p className="mt-3 max-w-xl text-slate-600">Drag the sliders to see what your dream home really costs per month — taxes and insurance included.</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl shadow-slate-900/20 ring-1 ring-white/10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.18),transparent_55%)]" />
          <div className="relative grid lg:grid-cols-[1.1fr_1fr]">
            {/* Inputs */}
            <div className="space-y-7 p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/30">
                  <Calculator className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-white">Payment estimator</p>
                  <p className="text-xs text-white/50">Updates instantly as you adjust</p>
                </div>
              </div>

              <SliderRow
                icon={Home}
                label="Home Price"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={10_000}
                value={Math.min(Math.max(price, PRICE_MIN), PRICE_MAX)}
                onChange={setPriceBoth}
                hint={["$100K", "$5M"]}
              >
                <div className="flex items-center rounded-lg bg-white/5 px-2.5 py-1 ring-1 ring-white/10 focus-within:ring-emerald-400/60">
                  <span className="text-sm text-white/50">$</span>
                  <input
                    inputMode="numeric"
                    aria-label="Home price in dollars"
                    value={priceText}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, "");
                      setPriceText(digits ? Number(digits).toLocaleString("en-US") : "");
                      setPrice(Math.min(Number(digits || 0), 50_000_000));
                    }}
                    onBlur={() => setPriceBoth(price || PRICE_MIN)}
                    className="w-24 bg-transparent text-right text-sm font-semibold tabular-nums text-white outline-none"
                  />
                </div>
              </SliderRow>

              <SliderRow
                icon={Wallet}
                label="Down Payment"
                min={0}
                max={60}
                step={1}
                value={downPct}
                onChange={setDownPct}
                hint={["0%", "60%"]}
                valueLabel={
                  <>
                    {downPct}% <span className="font-normal text-white/50">· {usd(r.down)}</span>
                  </>
                }
              />

              <SliderRow
                icon={Percent}
                label="Interest Rate"
                min={2}
                max={12}
                step={0.05}
                value={rate}
                onChange={(v) => setRate(Math.round(v * 100) / 100)}
                hint={["2%", "12%"]}
                valueLabel={`${rate.toFixed(2)}%`}
              />

              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <Landmark className="h-4 w-4 text-emerald-400" /> Loan Term
                </p>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10" role="radiogroup" aria-label="Loan term">
                  {([15, 30] as const).map((y) => (
                    <button
                      key={y}
                      role="radio"
                      aria-checked={years === y}
                      onClick={() => setYears(y)}
                      className={clsx(
                        "relative rounded-lg py-2.5 text-sm font-semibold transition",
                        years === y ? "text-slate-950" : "text-white/70 hover:text-white",
                      )}
                    >
                      {years === y && (
                        <motion.span layoutId="term-pill" className="absolute inset-0 rounded-lg bg-emerald-400" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
                      )}
                      <span className="relative">{y}-Year Fixed</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="border-t border-white/10 bg-white/[0.03] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <p className="text-sm font-medium text-white/60">Estimated monthly payment</p>
              <div className="mt-2 flex items-baseline gap-2">
                <AnimatedDollars value={r.total} className="text-4xl font-semibold tracking-tight text-white tabular-nums sm:text-5xl" />
                <span className="text-lg text-white/50">/mo</span>
              </div>

              <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
                {/* Donut */}
                <svg viewBox="0 0 180 180" className="h-40 w-40 shrink-0 -rotate-90" aria-hidden>
                  <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" />
                  {parts.map((p, i) => {
                    const { len, start } = segments[i];
                    return (
                      <motion.circle
                        key={p.label}
                        cx="90"
                        cy="90"
                        r={R}
                        fill="none"
                        stroke={p.stroke}
                        strokeWidth="18"
                        initial={false}
                        animate={{ strokeDasharray: `${Math.max(len - 2, 0)} ${C}`, strokeDashoffset: -start }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      />
                    );
                  })}
                </svg>

                <ul className="w-full space-y-3.5">
                  {parts.map((p) => (
                    <li key={p.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2.5 text-white/70">
                        <span className={clsx("h-2.5 w-2.5 rounded-full", p.color)} />
                        {p.label}
                        {p.note && <span className="text-[11px] text-white/40">{p.note}</span>}
                      </span>
                      <AnimatedDollars value={p.value} className="font-semibold tabular-nums text-white" />
                    </li>
                  ))}
                </ul>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { k: "Loan amount", v: usd(r.loan) },
                  { k: "Total interest", v: usd(r.totalInterest) },
                ].map(({ k, v }) => (
                  <div key={k} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <dt className="text-xs text-white/50">{k}</dt>
                    <dd className="mt-1 truncate text-base font-semibold tabular-nums text-white">{v}</dd>
                  </div>
                ))}
              </dl>

              <button
                onClick={() => openChatWith("Buy")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                <BadgeCheck className="h-4 w-4" /> Get Pre-Approved with a Trusted Lender
              </button>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40">
                <Info className="mt-px h-3 w-3 shrink-0" />
                Estimates only. Taxes and insurance vary by county and carrier. Not a loan offer.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
