"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, BarChart3, CheckCircle2, Home, KeyRound, Loader2, MapPin, RotateCcw, Sparkles, TrendingUp, Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { formatPrice } from "@/lib/data";

/** Market bands used to produce a plausible demo valuation from the address text. */
const MARKETS: { match: RegExp; min: number; max: number; trend: number }[] = [
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

function estimate(address: string) {
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

const STEPS = ["Locating property records…", "Analyzing comparable sales…", "Applying AI market model…"];

type State = { phase: "idle" } | { phase: "loading"; step: number } | { phase: "done"; leadId: string; est: ReturnType<typeof estimate> };

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15";

export default function SellerValuation() {
  const { addLead, updateLead, setCrmOpen } = useCRM();
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [reportSent, setReportSent] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = address.trim();
    if (addr.length < 6) {
      setError("Please enter your full property address.");
      return;
    }
    setError("");
    setState({ phase: "loading", step: 0 });
    STEPS.forEach((_, i) => timers.current.push(setTimeout(() => setState({ phase: "loading", step: i }), i * 650)));
    timers.current.push(
      setTimeout(() => {
        const est = estimate(addr);
        const lead = addLead({
          name: "Homeowner (pending)",
          email: "",
          phone: "",
          budget: `Est. ${formatPrice(est.value)}`,
          location: addr,
          timeline: "—",
          intent: "Sell",
          source: "Home Valuation",
          status: "New Seller Lead",
          value: est.value,
          message: `Instant valuation ${formatPrice(est.low)} – ${formatPrice(est.high)}`,
        });
        setState({ phase: "done", leadId: lead.id, est });
      }, STEPS.length * 650 + 300),
    );
  };

  const sendReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.phase !== "done") return;
    updateLead(state.leadId, { name: contact.name.trim(), email: contact.email.trim(), phone: contact.phone.trim() });
    setReportSent(true);
  };

  const restart = () => {
    setState({ phase: "idle" });
    setAddress("");
    setContact({ name: "", email: "", phone: "" });
    setReportSent(false);
  };

  return (
    <section id="sell" className="scroll-mt-20 pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 px-6 py-12 shadow-2xl shadow-emerald-900/20 sm:px-10 sm:py-14 lg:px-14 lg:py-16"
        >
          {/* Decorative */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Sell Your Home
              </span>
              <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                Thinking of selling your property? <span className="text-emerald-200">Get an instant AI home valuation.</span>
              </h2>
              <p className="mt-4 max-w-lg text-emerald-50/80">
                Our AI model analyzes recent comparable sales, market velocity and buyer demand in your neighborhood. Free, instant,
                and no obligation.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
                {[
                  { icon: Zap, t: "Result in 3 seconds" },
                  { icon: BarChart3, t: "Based on real comps" },
                  { icon: TrendingUp, t: "Sellers average 4.2% over asking" },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-200" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                {state.phase !== "done" ? (
                  <motion.form
                    key="form"
                    onSubmit={submit}
                    noValidate
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-3xl bg-white p-5 shadow-2xl shadow-emerald-950/30 sm:p-6"
                  >
                    <label htmlFor="valuation-address" className="text-sm font-semibold text-slate-900">
                      Property address
                    </label>
                    <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                      <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/15">
                        <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
                        <input
                          id="valuation-address"
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            if (error) setError("");
                          }}
                          disabled={state.phase === "loading"}
                          placeholder="Enter your property address..."
                          autoComplete="street-address"
                          className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                          aria-invalid={!!error}
                          aria-describedby={error ? "valuation-error" : undefined}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={state.phase === "loading"}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-80"
                      >
                        {state.phase === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
                        {state.phase === "loading" ? "Analyzing…" : "Get Valuation"}
                      </button>
                    </div>
                    {error && (
                      <p id="valuation-error" className="mt-2 text-xs font-medium text-rose-600">
                        {error}
                      </p>
                    )}

                    {state.phase === "loading" ? (
                      <ul className="mt-5 space-y-2.5" aria-live="polite">
                        {STEPS.map((s, i) => (
                          <motion.li
                            key={s}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: i <= state.step ? 1 : 0.35, x: 0 }}
                            className="flex items-center gap-2.5 text-sm text-slate-700"
                          >
                            {i < state.step ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : i === state.step ? (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border-2 border-slate-200" />
                            )}
                            {s}
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-xs text-slate-500">
                        Try: <button type="button" onClick={() => setAddress("742 N Rodeo Dr, Beverly Hills, CA 90210")} className="font-medium text-emerald-700 underline-offset-2 hover:underline">742 N Rodeo Dr, Beverly Hills</button>
                      </p>
                    )}
                  </motion.form>
                ) : (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-3xl bg-white p-5 shadow-2xl shadow-emerald-950/30 sm:p-6"
                    role="status"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" /> Valuation ready
                      </div>
                      <button onClick={restart} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
                        <RotateCcw className="h-3.5 w-3.5" /> New address
                      </button>
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-500">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {address}
                    </p>

                    <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-500">Estimated market value</p>
                    <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">{formatPrice(state.est.value)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Range {formatPrice(state.est.low)} – {formatPrice(state.est.high)}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        { k: "YoY trend", v: `+${state.est.trend}%` },
                        { k: "Comps used", v: state.est.comps },
                        { k: "Confidence", v: `${state.est.confidence}%` },
                      ].map(({ k, v }) => (
                        <div key={k} className="rounded-xl bg-slate-50 px-2 py-2.5 ring-1 ring-slate-100">
                          <p className="text-sm font-semibold text-slate-900">{v}</p>
                          <p className="text-[11px] text-slate-500">{k}</p>
                        </div>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {reportSent ? (
                        <motion.p
                          key="sent"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-5 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900"
                        >
                          ✓ Thanks {contact.name.split(" ")[0]}! Alex will send your full CMA report and a pricing strategy within 24 hours.
                        </motion.p>
                      ) : (
                        <motion.form key="report" onSubmit={sendReport} className="mt-5 space-y-2.5" exit={{ opacity: 0 }}>
                          <p className="text-sm font-semibold text-slate-900">Get the full PDF report + pricing strategy</p>
                          <input required className={inputCls} placeholder="Full name" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <input required type="email" className={inputCls} placeholder="Email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                            <input required type="tel" pattern="[\d\s\+\(\)\-]{7,}" className={inputCls} placeholder="Phone" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                          </div>
                          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                            Send My Report <ArrowRight className="h-4 w-4" />
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={() => setCrmOpen(true)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 py-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Broker demo: view this seller lead in the CRM
                    </button>
                    <p className="mt-3 text-center text-[10px] text-slate-400">Instant estimate for demonstration only — not an appraisal.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
