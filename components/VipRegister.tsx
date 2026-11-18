"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing, CheckCircle2, ChevronDown, Crown, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, MapPin, Phone, Sparkles, User, Wallet, X,
} from "lucide-react";
import clsx from "clsx";
import Modal from "./Modal";
import { useVip } from "@/context/VipContext";
import { useCRM } from "@/context/CRMContext";
import { LOCATIONS, PRICE_RANGES, PROPERTIES } from "@/lib/data";

const BUDGETS = PRICE_RANGES.slice(1).map((r) => r.label);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;

const PERKS = [
  { icon: Lock, t: "Off-market homes before they go public" },
  { icon: BellRing, t: "Instant alerts that match your wishlist" },
  { icon: KeyRound, t: "Priority private viewings with Alex" },
];

const inputWrap =
  "flex items-center gap-2.5 rounded-xl border bg-white px-3.5 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15";
const inputCls = "min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400";

function Field({
  icon: Icon,
  label,
  error,
  children,
  htmlFor,
}: {
  icon: React.ElementType;
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </label>
      <div className={clsx(inputWrap, error ? "border-rose-300" : "border-slate-200")}>
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/\d/.test(pw) && /[a-z]/i.test(pw)) s++;
  if (/[^a-z0-9]/i.test(pw) || /[A-Z]/.test(pw)) s++;
  return Math.min(s, 4);
}

export const matchesFor = (location: string, budget: string) => {
  const range = PRICE_RANGES.find((r) => r.label === budget);
  return PROPERTIES.filter(
    (p) => (location === "Anywhere" || p.location === location) && (!range || (p.price >= range.min && p.price <= range.max)),
  );
};

export default function VipRegister() {
  const { registerOpen, closeRegister, initialTab, register, signIn, user, signOut } = useVip();
  const { demoMode, setCrmOpen } = useCRM();
  const [tab, setTab] = useState<"register" | "signin">("register");
  const [form, setForm] = useState({ name: "", email: "", phone: "", location: "Anywhere", budget: BUDGETS[1], password: "", alerts: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [justJoined, setJustJoined] = useState(false);

  useEffect(() => {
    if (registerOpen) {
      setTab(initialTab);
      setErrors({});
      setFormError("");
      setShowPw(false);
      setJustJoined(false);
    }
  }, [registerOpen, initialTab]);

  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
    if (formError) setFormError("");
  };

  const pwStrength = strength(form.password);
  const matches = useMemo(() => (user ? matchesFor(user.location, user.budget) : []), [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (tab === "register") {
      if (form.name.trim().length < 2) errs.name = "Please enter your full name.";
      if (!PHONE_RE.test(form.phone.trim())) errs.phone = "Please enter a valid phone number.";
    }
    if (!EMAIL_RE.test(form.email.trim())) errs.email = "Please enter a valid email address.";
    if (tab === "register" ? form.password.length < 8 : !form.password) errs.password = tab === "register" ? "Use at least 8 characters." : "Please enter your password.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const res =
      tab === "register"
        ? await register({ name: form.name, email: form.email, phone: form.phone, location: form.location, budget: form.budget, password: form.password })
        : await signIn(form.email, form.password);
    setLoading(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setJustJoined(tab === "register");
    setForm((f) => ({ ...f, password: "" }));
  };

  const browseMatches = () => {
    if (!user) return;
    const range = PRICE_RANGES.find((r) => r.label === user.budget);
    window.dispatchEvent(
      new CustomEvent("aura:apply-filters", {
        detail: { location: user.location === "Anywhere" ? "" : user.location, maxPrice: range && Number.isFinite(range.max) ? range.max : Infinity },
      }),
    );
    closeRegister();
  };

  return (
    <Modal open={registerOpen} onClose={closeRegister} label="AuraEstate VIP access" className="max-h-[94svh] rounded-t-3xl sm:max-w-4xl sm:rounded-3xl">
      <div className="flex max-h-[94svh] flex-col overflow-y-auto scrollbar-thin md:flex-row md:overflow-hidden">
        {/* Perks panel */}
        <aside className="relative hidden overflow-hidden bg-slate-950 p-8 text-white md:flex md:w-[40%] md:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.35),transparent_60%)]" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200 ring-1 ring-amber-300/30">
              <Crown className="h-3.5 w-3.5" /> AuraEstate VIP
            </span>
            <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-tight">See the homes that never hit the portals.</h2>
            <p className="mt-3 text-sm text-white/65">Free membership for serious buyers. About 70% of what we sell is shared privately with VIPs first.</p>
            <ul className="mt-8 space-y-4">
              {PERKS.map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative mt-auto pt-8 text-xs text-white/40">Join 2,400+ buyers already on the list.</p>
        </aside>

        {/* Form / welcome */}
        <div className="relative flex-1 p-6 sm:p-8 md:overflow-y-auto md:scrollbar-thin">
          <button onClick={closeRegister} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
            <X className="h-5 w-5" />
          </button>

          <AnimatePresence mode="wait">
            {user ? (
              <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-2" role="status">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900 shadow-lg shadow-amber-500/20"
                >
                  <Crown className="h-7 w-7" />
                </motion.span>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                  {justJoined ? "Welcome to AuraEstate VIP" : "Welcome back"}, {user.name.split(" ")[0]}!
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {justJoined
                    ? "Your account is ready and you're signed in. Alex will personally reach out with off-market homes that fit your brief."
                    : "You're signed in. Here's a quick look at your VIP profile."}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: MapPin, k: "Preferred location", v: user.location },
                    { icon: Wallet, k: "Budget", v: user.budget },
                    { icon: Mail, k: "Email", v: user.email },
                    { icon: Phone, k: "Phone", v: user.phone },
                  ].map(({ icon: Icon, k, v }) => (
                    <div key={k} className="min-w-0 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                      <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Icon className="h-3.5 w-3.5" /> {k}
                      </dt>
                      <dd className="mt-1 truncate font-medium text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                  <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm text-emerald-900">
                    {matches.length
                      ? `${matches.length} public ${matches.length === 1 ? "home matches" : "homes match"} your brief right now, plus private listings Alex will send directly.`
                      : "No public listings match your brief right now, but Alex will send private off-market options that do."}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                  <button onClick={browseMatches} className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600">
                    {matches.length ? "Browse my matches" : "Browse all homes"}
                  </button>
                  <button onClick={closeRegister} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    Continue
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <button onClick={signOut} className="text-slate-500 hover:text-slate-900">
                    Sign out
                  </button>
                  {demoMode && (
                    <button
                      onClick={() => {
                        closeRegister();
                        setCrmOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Broker demo: view in CRM
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 md:hidden">
                  <Crown className="h-3.5 w-3.5" /> AuraEstate VIP
                </span>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:mt-0">{tab === "register" ? "Get VIP access" : "Sign in to VIP"}</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {tab === "register" ? "Create your free account for off-market alerts and priority viewings." : "Welcome back — sign in to see your matches."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
                  {(["register", "signin"] as const).map((t) => (
                    <button
                      key={t}
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => {
                        setTab(t);
                        setErrors({});
                        setFormError("");
                      }}
                      className={clsx("rounded-lg py-2 text-sm font-semibold transition", tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                    >
                      {t === "register" ? "Create account" : "Sign in"}
                    </button>
                  ))}
                </div>

                <form onSubmit={submit} noValidate className="mt-5 space-y-3.5">
                  {tab === "register" && (
                    <Field icon={User} label="Full name" error={errors.name} htmlFor="vip-name">
                      <input id="vip-name" className={inputCls} autoComplete="name" placeholder="Jordan Smith" value={form.name} onChange={(e) => set("name", e.target.value)} />
                    </Field>
                  )}
                  <div className={clsx("grid gap-3.5", tab === "register" && "sm:grid-cols-2")}>
                    <Field icon={Mail} label="Email address" error={errors.email} htmlFor="vip-email">
                      <input id="vip-email" type="email" className={inputCls} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                    </Field>
                    {tab === "register" && (
                      <Field icon={Phone} label="Phone number" error={errors.phone} htmlFor="vip-phone">
                        <input id="vip-phone" type="tel" className={inputCls} autoComplete="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                      </Field>
                    )}
                  </div>
                  {tab === "register" && (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <Field icon={MapPin} label="Preferred location" htmlFor="vip-location">
                        <select id="vip-location" className={clsx(inputCls, "cursor-pointer appearance-none pr-5")} value={form.location} onChange={(e) => set("location", e.target.value)}>
                          <option value="Anywhere">Anywhere</option>
                          {LOCATIONS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none -ml-5 h-4 w-4 shrink-0 text-slate-400" />
                      </Field>
                      <Field icon={Wallet} label="Budget range" htmlFor="vip-budget">
                        <select id="vip-budget" className={clsx(inputCls, "cursor-pointer appearance-none pr-5")} value={form.budget} onChange={(e) => set("budget", e.target.value)}>
                          {BUDGETS.map((b) => (
                            <option key={b}>{b}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none -ml-5 h-4 w-4 shrink-0 text-slate-400" />
                      </Field>
                    </div>
                  )}
                  <div>
                    <Field icon={Lock} label={tab === "register" ? "Create a password" : "Password"} error={errors.password} htmlFor="vip-password">
                      <input
                        id="vip-password"
                        type={showPw ? "text" : "password"}
                        className={inputCls}
                        autoComplete={tab === "register" ? "new-password" : "current-password"}
                        placeholder={tab === "register" ? "At least 8 characters" : "Your password"}
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-700" aria-label={showPw ? "Hide password" : "Show password"}>
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>
                    {tab === "register" && form.password && (
                      <div className="mt-2 flex items-center gap-2" aria-label={`Password strength ${pwStrength} of 4`}>
                        <div className="flex flex-1 gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className={clsx("h-1 flex-1 rounded-full transition", i < pwStrength ? (pwStrength <= 1 ? "bg-rose-400" : pwStrength === 2 ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-200")}
                            />
                          ))}
                        </div>
                        <span className="w-12 text-right text-[11px] text-slate-500">{["Weak", "Weak", "Okay", "Good", "Strong"][pwStrength]}</span>
                      </div>
                    )}
                  </div>

                  {tab === "register" && (
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
                      <input type="checkbox" checked={form.alerts} onChange={(e) => set("alerts", e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                      Send me off-market alerts and new listings that match my brief.
                    </label>
                  )}

                  {formError && (
                    <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700" role="alert">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tab === "register" ? <Crown className="h-4 w-4 text-amber-300" /> : <CheckCircle2 className="h-4 w-4" />}
                    {loading ? (tab === "register" ? "Creating your account…" : "Signing in…") : tab === "register" ? "Create VIP account" : "Sign in"}
                  </button>
                  <p className="text-center text-[11px] text-slate-400">
                    Free, no obligation. Your details are only shared with your AuraEstate agent. Demo accounts are stored in this browser.
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}
