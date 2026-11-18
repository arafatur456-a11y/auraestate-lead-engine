"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, CalendarCheck, Check, ChevronDown, Download, Flame, Inbox, KeyRound, Mail, MapPin, Phone, RotateCcw, Search, TrendingUp, Users, X,
} from "lucide-react";
import clsx from "clsx";
import Modal from "./Modal";
import { LEAD_STATUSES, useCRM, type Lead, type LeadStatus } from "@/context/CRMContext";

const STATUS_STYLES: Record<LeadStatus, { badge: string; dot: string }> = {
  "New Lead": { badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  "Registered VIP Buyer": { badge: "bg-yellow-50 text-yellow-800 ring-yellow-400", dot: "bg-yellow-400" },
  "New Seller Lead": { badge: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500" },
  Qualified: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  "Tour Requested": { badge: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  Contacted: { badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  Closed: { badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

const BUDGET_MID: Record<string, number> = {
  "Under $2M": 1_500_000,
  "$2M – $5M": 3_500_000,
  "$5M – $10M": 7_500_000,
  "$10M+": 12_000_000,
};

function relTime(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const initials = (n: string) =>
  n.split(/\s+/).filter((w) => /^[a-z]/i.test(w)).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

function StatusSelect({ lead }: { lead: Lead }) {
  const { updateStatus } = useCRM();
  const st = STATUS_STYLES[lead.status];
  return (
    <div className={clsx("relative inline-flex items-center rounded-full ring-1 ring-inset", st.badge)}>
      <span className={clsx("pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full", st.dot)} />
      <select
        value={lead.status}
        onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
        className="cursor-pointer appearance-none bg-transparent py-1 pl-6 pr-7 text-xs font-semibold outline-none"
        aria-label={`Status for ${lead.name}`}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
    </div>
  );
}

function Score({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2" title={`Lead score ${value}/100`}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="flex items-center gap-0.5 text-xs font-semibold tabular-nums text-slate-700">
        {value >= 85 && <Flame className="h-3 w-3 text-orange-500" />}
        {value}
      </span>
    </div>
  );
}

function exportCSV(rows: Lead[]) {
  const header = ["Timestamp", "Name", "Email", "Phone", "Intent", "Budget / Value", "Location", "Property", "Timeline", "Source", "Status", "Score", "Notes"];
  const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((l) =>
    [l.createdAt, l.name, l.email, l.phone, l.intent, l.budget, l.location, l.property, l.timeline, l.source, l.status, l.score, l.message].map(esc).join(","),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auraestate-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CRMDashboard() {
  const { leads, crmOpen, setCrmOpen, resetDemo, demoMode, brokerAuthed, logout } = useCRM();
  const [status, setStatus] = useState<LeadStatus | "All">("All");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [exported, setExported] = useState(false);

  useEffect(() => {
    if (!crmOpen) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [crmOpen]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (l) =>
        (status === "All" || l.status === status) &&
        (!q || [l.name, l.email, l.phone, l.location, l.property].some((f) => f?.toLowerCase().includes(q))),
    );
  }, [leads, status, query]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
    leads.forEach((l) => c[l.status]++);
    return c;
  }, [leads]);

  const kpis = useMemo(() => {
    const day = leads.filter((l) => now - new Date(l.createdAt).getTime() < 86_400_000).length;
    const pipeline = leads.filter((l) => l.status !== "Closed").reduce((s, l) => s + (l.value ?? BUDGET_MID[l.budget] ?? 2_000_000), 0);
    const conv = leads.length ? Math.round(((counts.Qualified + counts["Tour Requested"] + counts.Closed) / leads.length) * 100) : 0;
    const sellers = leads.filter((l) => l.intent === "Sell").length;
    return [
      { label: "Total leads", value: leads.length.toString(), sub: `+${day} in last 24h`, icon: Users, tone: "text-sky-600 bg-sky-50" },
      { label: "Tours requested", value: counts["Tour Requested"].toString(), sub: `${sellers} seller ${sellers === 1 ? "lead" : "leads"} in pipeline`, icon: CalendarCheck, tone: "text-violet-600 bg-violet-50" },
      { label: "Pipeline value", value: `$${(pipeline / 1_000_000).toFixed(1)}M`, sub: `≈ $${Math.round((pipeline * 0.025) / 1000)}K commission`, icon: TrendingUp, tone: "text-emerald-600 bg-emerald-50" },
      { label: "Qualification rate", value: `${conv}%`, sub: "Avg. response 38s", icon: Bot, tone: "text-amber-600 bg-amber-50" },
    ];
  }, [leads, counts, now]);

  const isFresh = (l: Lead) => now - new Date(l.createdAt).getTime() < 5 * 60_000;

  return (
    <Modal open={crmOpen} onClose={() => setCrmOpen(false)} label="Broker CRM Dashboard" variant="full" className="flex h-[100svh] flex-col bg-slate-50 sm:h-auto sm:max-w-7xl sm:rounded-3xl">
      {/* Top bar */}
      <header className="flex items-center gap-3 bg-slate-950 px-4 py-3.5 text-white sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
          <KeyRound className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold tracking-tight">AuraEstate Broker CRM</h2>
          <p className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {demoMode ? "Live · Demo Mode — leads sync from website & AI chat in real time" : "Live · Signed in as broker"}
          </p>
        </div>
        {brokerAuthed && !demoMode && (
          <button onClick={logout} className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white sm:inline-flex">
            Sign out
          </button>
        )}
        <button onClick={() => setCrmOpen(false)} className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Close CRM">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin sm:max-h-[calc(100svh-8rem)]">
        <div className="space-y-5 p-4 sm:p-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {kpis.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">{k.label}</p>
                  <span className={clsx("grid h-8 w-8 place-items-center rounded-lg", k.tone)}>
                    <k.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{k.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Pipeline strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {(["All", ...LEAD_STATUSES] as const).map((s) => {
              const active = status === s;
              const n = s === "All" ? leads.length : counts[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={clsx(
                    "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 transition",
                    active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
                  )}
                >
                  {s !== "All" && <span className={clsx("h-1.5 w-1.5 rounded-full", STATUS_STYLES[s].dot)} />}
                  {s}
                  <span className={clsx("rounded-full px-1.5 tabular-nums", active ? "bg-white/20" : "bg-slate-100")}>{n}</span>
                </button>
              );
            })}
          </div>

          {/* Table card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 focus-within:ring-4 focus-within:ring-emerald-500/15">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email, phone or location…"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
                  aria-label="Search leads"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LeadStatus | "All")}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500"
                    aria-label="Filter by status"
                  >
                    <option value="All">Filter by Status: All</option>
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <button
                  onClick={() => {
                    exportCSV(rows);
                    setExported(true);
                    setTimeout(() => setExported(false), 2000);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                >
                  {exported ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  <span className="hidden sm:inline">{exported ? "Exported" : "Export to CSV"}</span>
                </button>
                {demoMode && (
                <button
                  onClick={resetDemo}
                  className="grid h-[42px] w-[42px] place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  title="Reset demo data"
                  aria-label="Reset demo data"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <Inbox className="h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-800">No leads match this view</p>
                <p className="mt-1 text-sm text-slate-500">Try another status, or chat with the AI assistant to create one live.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        {["Timestamp", "Lead Name", "Contact Info", "Budget / Value", "Location", "Score", "Lead Status"].map((h) => (
                          <th key={h} className="whitespace-nowrap px-4 py-3 first:pl-5">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence initial={false}>
                        {rows.map((l) => (
                          <motion.tr
                            key={l.id}
                            layout
                            initial={{ opacity: 0, backgroundColor: "rgb(209 250 229)" }}
                            animate={{ opacity: 1, backgroundColor: isFresh(l) ? "rgb(236 253 245)" : "rgb(255 255 255)" }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="align-middle hover:!bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-4 py-3.5 pl-5">
                              <p className="font-medium text-slate-800">{relTime(l.createdAt, now)}</p>
                              <p className="text-xs text-slate-400">{fmtStamp(l.createdAt)}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-semibold text-white">
                                  {initials(l.name)}
                                </span>
                                <div className="min-w-0">
                                  <p className="flex items-center gap-2 whitespace-nowrap font-semibold text-slate-900">
                                    {l.name}
                                    {isFresh(l) && <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">New</span>}
                                  </p>
                                  <p className="whitespace-nowrap text-xs text-slate-500">
                                    {l.intent} · via {l.source}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {!l.email && !l.phone ? (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                                  Awaiting contact details
                                </span>
                              ) : (
                              <>
                              <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 whitespace-nowrap text-slate-700 hover:text-emerald-700">
                                <Mail className="h-3.5 w-3.5 text-slate-400" /> {l.email}
                              </a>
                              <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`} className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 hover:text-emerald-700">
                                <Phone className="h-3 w-3 text-slate-400" /> {l.phone}
                              </a>
                              </>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <p className="font-semibold text-slate-900">{l.budget}</p>
                              <p className="text-xs text-slate-500">{l.timeline}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="flex max-w-[240px] items-center gap-1.5 text-slate-700" title={l.location}>
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> <span className="truncate">{l.location}</span>
                              </p>
                              {(l.property || l.message) && <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{l.property ?? l.message}</p>}
                            </td>
                            <td className="px-4 py-3.5">
                              <Score value={l.score} />
                            </td>
                            <td className="px-4 py-3.5 pr-5">
                              <StatusSelect lead={l} />
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <ul className="divide-y divide-slate-100 md:hidden">
                  {rows.map((l) => (
                    <motion.li key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={clsx("p-4", isFresh(l) && "bg-emerald-50/70")}>
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-semibold text-white">
                          {initials(l.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-semibold text-slate-900">
                              {l.name}
                              {isFresh(l) && <span className="ml-2 rounded bg-emerald-500 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase text-white">New</span>}
                            </p>
                            <span className="shrink-0 text-xs text-slate-400">{relTime(l.createdAt, now)}</span>
                          </div>
                          <p className="truncate text-xs text-slate-500">{l.email || l.phone ? `${l.email} · ${l.phone}` : "Awaiting contact details"}</p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">{l.budget}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-emerald-600" /> {l.location}
                            </span>
                            <span>{l.timeline}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <StatusSelect lead={l} />
                            <Score value={l.score} />
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <span>
                Showing <b className="text-slate-800">{rows.length}</b> of {leads.length} leads
              </span>
              <span className="hidden sm:inline">Integrates with Follow Up Boss, kvCORE, HubSpot & Salesforce</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
