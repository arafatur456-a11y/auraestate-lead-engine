"use client";

import { motion } from "framer-motion";
import { ArrowRight, Crown, Lock } from "lucide-react";
import { useVip } from "@/context/VipContext";
import { matchesFor } from "./VipRegister";

/** Listings-area call to action for buyers who want off-market alerts. */
export default function VipBanner() {
  const { user, ready, openRegister } = useVip();
  if (!ready) return null;
  const matches = user ? matchesFor(user.location, user.budget).length : 0;

  return (
    <section className="-mt-6 pb-16 sm:-mt-10 sm:pb-24" aria-label="VIP off-market access">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="relative flex flex-col gap-5 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900">
              {user ? <Crown className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                {user ? `Welcome back, ${user.name.split(" ")[0]} — you're on the VIP list.` : "70% of our homes never make it online."}
              </h3>
              <p className="mt-1 text-sm text-white/65">
                {user
                  ? `${matches} public ${matches === 1 ? "home matches" : "homes match"} your brief (${user.location}, ${user.budget}). Off-market matches go straight to your inbox.`
                  : "Register for free VIP access to get off-market listings and instant alerts for homes that match your brief."}
              </p>
            </div>
          </div>
          <button
            onClick={() => openRegister("register")}
            className="relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            {user ? "View my VIP profile" : "Register for VIP access"} <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
