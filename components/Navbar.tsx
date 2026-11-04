"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, KeyRound, Menu, Phone, X } from "lucide-react";
import clsx from "clsx";
import { useCRM } from "@/context/CRMContext";
import { AGENT } from "@/lib/data";

const LINKS = [
  { href: "#listings", label: "Featured Listings" },
  { href: "#why-us", label: "Why Choose Us" },
];

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <a href="#top" className="group flex items-center gap-2.5" aria-label="AuraEstate Premier Properties — home">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M6 10v9h12v-9" />
          <path d="M10 19v-5h4v5" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={clsx("block text-[17px] font-semibold tracking-tight", light ? "text-white" : "text-slate-900")}>
          Aura<span className="text-emerald-400">Estate</span>
        </span>
        <span className={clsx("mt-0.5 block text-[10px] font-medium uppercase tracking-[0.22em]", light ? "text-white/60" : "text-slate-500")}>
          Premier Properties
        </span>
      </span>
    </a>
  );
}

export default function Navbar() {
  const { setCrmOpen, openChatWith, unseen } = useCRM();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled || mobileOpen
          ? "border-b border-white/10 bg-slate-950/85 py-3 shadow-xl shadow-black/10 backdrop-blur-xl"
          : "bg-transparent py-5",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => setCrmOpen(true)}
            className="relative ml-1 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/20"
          >
            <KeyRound className="h-4 w-4" />
            Live Broker CRM
            <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Demo</span>
            {unseen > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-slate-950">
                {unseen}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={AGENT.phoneHref}
            className="hidden items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white xl:inline-flex"
          >
            <Phone className="h-4 w-4" /> {AGENT.phone}
          </a>
          <button
            onClick={() => openChatWith("Tour")}
            className="hidden items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 sm:inline-flex"
          >
            <CalendarCheck className="h-4 w-4" /> Schedule Tour
          </button>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="relative grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10 lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {unseen > 0 && !mobileOpen && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 pb-4 pt-3 sm:px-6">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-white/90 hover:bg-white/10"
                >
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setCrmOpen(true);
                }}
                className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-left text-base font-medium text-emerald-300"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Live Broker CRM Dashboard
                </span>
                <span className="text-xs uppercase tracking-wider">{unseen > 0 ? `${unseen} new` : "Demo"}</span>
              </button>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  openChatWith("Tour");
                }}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white"
              >
                <CalendarCheck className="h-4 w-4" /> Schedule a Tour
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
