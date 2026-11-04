"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bath, BedDouble, CalendarClock, Check, CheckCircle2, ChevronLeft, ChevronRight, Home, Loader2, MapPin, Maximize2, Phone, Send, X,
} from "lucide-react";
import clsx from "clsx";
import Modal from "./Modal";
import SmartImage from "./SmartImage";
import { AGENT, PRICE_RANGES, formatFullPrice, type Property } from "@/lib/data";
import { useCRM } from "@/context/CRMContext";

const budgetFor = (price: number) =>
  PRICE_RANGES.slice(1).find((r) => price >= r.min && price < r.max)?.label ?? "$10M+";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15";

export default function PropertyModal({ property, onClose }: { property: Property | null; onClose: () => void }) {
  const { addLead } = useCRM();
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", tour: true });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  useEffect(() => {
    if (property) {
      setActive(0);
      setState("idle");
      setForm({ name: "", email: "", phone: "", message: `Hi Alex, I'm interested in ${property.title}. Is it still available?`, tour: true });
    }
  }, [property]);

  // Keep the last property around so content stays visible during the exit animation.
  const [p, setP] = useState<Property | null>(property);
  useEffect(() => {
    if (property) setP(property);
  }, [property]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p) return;
    setState("sending");
    setTimeout(() => {
      addLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        budget: budgetFor(p.price),
        location: p.location,
        timeline: form.tour ? "ASAP" : "1–3 months",
        intent: form.tour ? "Tour" : "Inquiry",
        source: form.tour ? "Tour Request" : "Property Inquiry",
        status: form.tour ? "Tour Requested" : "New Lead",
        property: p.title,
        message: form.message.trim(),
      });
      setState("done");
    }, 900);
  };

  return (
    <Modal open={!!property} onClose={onClose} label={p?.title ?? "Property details"} className="max-h-[92svh] rounded-t-3xl sm:max-w-5xl sm:rounded-3xl">
      {p && (
        <div className="flex max-h-[92svh] flex-col overflow-y-auto scrollbar-thin lg:flex-row lg:overflow-hidden">
          {/* Left: gallery + details */}
          <div className="lg:w-[58%] lg:overflow-y-auto lg:scrollbar-thin">
            <div className="relative aspect-[16/10] bg-slate-900">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <SmartImage src={p.images[active]} alt={`${p.title} photo ${active + 1}`} fill sizes="(min-width:1024px) 600px, 100vw" className="object-cover" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
              {[
                { dir: -1, Icon: ChevronLeft, cls: "left-3", label: "Previous photo" },
                { dir: 1, Icon: ChevronRight, cls: "right-3", label: "Next photo" },
              ].map(({ dir, Icon, cls, label }) => (
                <button
                  key={dir}
                  onClick={() => setActive((a) => (a + dir + p.images.length) % p.images.length)}
                  className={clsx("absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-slate-800 shadow backdrop-blur transition hover:bg-white", cls)}
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
              <span className="absolute bottom-3 left-4 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                {active + 1} / {p.images.length}
              </span>
              <button
                onClick={onClose}
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-slate-800 shadow backdrop-blur hover:bg-white lg:hidden"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-3">
              {p.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActive(i)}
                  className={clsx(
                    "relative aspect-[4/3] overflow-hidden rounded-xl ring-2 transition",
                    i === active ? "ring-emerald-500" : "opacity-70 ring-transparent hover:opacity-100",
                  )}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <SmartImage src={src} alt="" fill sizes="150px" className="object-cover" />
                </button>
              ))}
            </div>

            <div className="px-5 pb-6 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{p.type} · Built {p.yearBuilt}</p>
                  <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{p.title}</h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4 text-emerald-600" /> {p.address}
                  </p>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{formatFullPrice(p.price)}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: BedDouble, label: "Bedrooms", v: p.beds },
                  { icon: Bath, label: "Bathrooms", v: p.baths },
                  { icon: Maximize2, label: "Interior", v: `${p.sqft.toLocaleString()} ft²` },
                  { icon: Home, label: "Price / ft²", v: `$${Math.round(p.price / p.sqft).toLocaleString()}` },
                ].map(({ icon: Icon, label, v }) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <p className="mt-2 text-base font-semibold text-slate-900">{v}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <h3 className="mt-6 text-sm font-semibold text-slate-900">About this property</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.description}</p>

              <h3 className="mt-6 text-sm font-semibold text-slate-900">Highlights</h3>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100">
                      <Check className="h-3 w-3 text-emerald-700" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: inquiry form */}
          <aside className="relative border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 lg:w-[42%] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:scrollbar-thin">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 hidden h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 lg:grid"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-white">
                <SmartImage src={AGENT.avatar} alt={AGENT.name} fill sizes="48px" className="object-cover" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{AGENT.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {AGENT.title} · replies in ~5 min
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {state === "done" ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 rounded-2xl bg-white p-6 text-center ring-1 ring-emerald-200"
                >
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
                    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                  </motion.div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">Inquiry sent!</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {form.tour
                      ? `Alex will text ${form.phone || "you"} shortly to lock in your private tour of ${p.title}.`
                      : `Alex will reply to ${form.email} with the full brochure and disclosures.`}
                  </p>
                  <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    ✓ Lead delivered to the Broker CRM in real time
                  </p>
                  <button onClick={onClose} className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">
                    Continue browsing
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={submit} className="mt-6 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Request info or a private tour</h3>
                  <input required className={inputCls} placeholder="Full name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <input required type="email" className={inputCls} placeholder="Email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input required type="tel" pattern="[0-9+()\-\s]{7,}" className={inputCls} placeholder="Phone" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <textarea rows={3} className={clsx(inputCls, "resize-none")} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                    <input type="checkbox" checked={form.tour} onChange={(e) => setForm({ ...form, tour: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CalendarClock className="h-4 w-4 text-emerald-600" /> Schedule a private tour this week
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={state === "sending"}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-70"
                  >
                    {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {state === "sending" ? "Sending…" : "Send Inquiry"}
                  </button>
                  <a href={AGENT.phoneHref} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                    <Phone className="h-4 w-4" /> Call {AGENT.phone}
                  </a>
                  <p className="text-center text-[11px] text-slate-400">No spam. Your details go only to your dedicated agent.</p>
                </motion.form>
              )}
            </AnimatePresence>
          </aside>
        </div>
      )}
    </Modal>
  );
}
