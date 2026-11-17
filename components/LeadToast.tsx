"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, X } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

/** Broker-side notification that pops when a new lead lands — sells the "real-time CRM" story. */
export default function LeadToast() {
  const { lastLead, dismissLastLead, setCrmOpen, crmOpen, chatOpen, setChatOpen, canOpenCRM } = useCRM();

  useEffect(() => {
    if (!lastLead) return;
    const t = setTimeout(dismissLastLead, 9000);
    return () => clearTimeout(t);
  }, [lastLead, dismissLastLead]);

  return (
    <AnimatePresence>
      {lastLead && canOpenCRM && !crmOpen && !chatOpen && (
        <motion.div
          key={lastLead.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed left-1/2 top-4 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:left-auto sm:right-6 sm:top-24 sm:translate-x-0"
          role="status"
        >
          <div className="flex items-start gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-2xl ring-1 ring-white/10">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <BellRing className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">New lead captured · {lastLead.status}</p>
              <p className="mt-0.5 truncate text-xs text-white/60">
                {lastLead.name} · {lastLead.budget} · {lastLead.location}
              </p>
              <button
                onClick={() => {
                  setChatOpen(false);
                  setCrmOpen(true);
                }}
                className="mt-2.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Open Broker CRM →
              </button>
            </div>
            <button onClick={dismissLastLead} className="text-white/50 hover:text-white" aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
