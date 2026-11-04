"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Bath, BedDouble, Heart, MapPin, Maximize2, SearchX } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import SmartImage from "./SmartImage";
import { formatPrice, type Property } from "@/lib/data";

interface ListingsProps {
  properties: Property[];
  filtered: boolean;
  onReset: () => void;
  onView: (p: Property) => void;
}

const TAG_STYLES: Record<string, string> = {
  Exclusive: "bg-slate-900/80 text-white",
  "New Listing": "bg-emerald-500 text-white",
  "Price Drop": "bg-rose-500 text-white",
  "Off-Market": "bg-amber-400 text-slate-900",
  Featured: "bg-indigo-500 text-white",
};

function PropertyCard({ p, index, onView }: { p: Property; index: number; onView: () => void }) {
  const [saved, setSaved] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 transition-shadow duration-300 hover:shadow-2xl hover:shadow-slate-900/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <SmartImage
          src={p.images[0]}
          alt={p.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          {p.tag && (
            <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold backdrop-blur", TAG_STYLES[p.tag])}>{p.tag}</span>
          )}
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur">{p.type}</span>
        </div>
        <button
          onClick={() => setSaved((s) => !s)}
          aria-label={saved ? "Remove from saved" : "Save property"}
          aria-pressed={saved}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow backdrop-blur transition hover:scale-110"
        >
          <Heart className={clsx("h-4 w-4 transition", saved && "fill-rose-500 text-rose-500")} />
        </button>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <p className="text-2xl font-semibold tracking-tight text-white drop-shadow">{formatPrice(p.price)}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-600" /> {p.location}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { icon: BedDouble, v: `${p.beds} Beds` },
            { icon: Bath, v: `${p.baths} Baths` },
            { icon: Maximize2, v: `${p.sqft.toLocaleString()} sqft` },
          ].map(({ icon: Icon, v }) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
              <Icon className="h-3.5 w-3.5 text-slate-500" /> {v}
            </span>
          ))}
        </div>

        <button
          onClick={onView}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-900 transition group-hover:border-emerald-500 group-hover:bg-emerald-500 group-hover:text-white"
        >
          View Details <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </motion.article>
  );
}

export default function Listings({ properties, filtered, onReset, onView }: ListingsProps) {
  return (
    <section id="listings" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Featured Listings</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {filtered ? "Properties matching your search" : "This week's most-viewed homes"}
            </h2>
            <p className="mt-3 max-w-xl text-slate-600">
              {properties.length} {properties.length === 1 ? "property" : "properties"} available · updated daily from our private network.
            </p>
          </div>
          {filtered && (
            <button onClick={onReset} className="self-start rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:self-auto">
              Clear filters
            </button>
          )}
        </div>

        <motion.div layout className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <AnimatePresence mode="popLayout">
            {properties.map((p, i) => (
              <PropertyCard key={p.id} p={p} index={i} onView={() => onView(p)} />
            ))}
          </AnimatePresence>
        </motion.div>

        {properties.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
          >
            <SearchX className="h-10 w-10 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No public listings match — yet.</h3>
            <p className="mt-2 max-w-md text-slate-600">
              70% of our inventory is off-market. Ask our AI concierge and Alex will send you private matches within the hour.
            </p>
            <button onClick={onReset} className="mt-6 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
              Reset search
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
