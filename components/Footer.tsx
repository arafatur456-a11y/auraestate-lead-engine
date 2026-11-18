"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import DemoToggle from "./DemoToggle";
import { Logo } from "./Navbar";
import { AGENT, LOCATIONS } from "@/lib/data";

export default function Footer() {
  const { brokerAuthed, logout } = useCRM();
  return (
    <footer className="bg-slate-950 pb-28 pt-16 text-white/70 md:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Boutique luxury brokerage serving discerning buyers and sellers across the US and UK since 2009.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Markets</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {LOCATIONS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href={AGENT.phoneHref} className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4 text-emerald-400" /> {AGENT.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${AGENT.email}`} className="flex items-center gap-2 hover:text-white">
                  <Mail className="h-4 w-4 text-emerald-400" /> {AGENT.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> 9454 Wilshire Blvd, Beverly Hills, CA 90212
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} AuraEstate Premier Properties. Demo template — all listings and data are fictional.</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Equal Housing Opportunity · DRE #02134567
            {brokerAuthed && (
              <button onClick={logout} className="text-white/40 transition hover:text-white/80">
                Sign out
              </button>
            )}
            <DemoToggle className="inline-flex !px-0 !py-0 text-xs" />
          </p>
        </div>
      </div>
    </footer>
  );
}
