"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Bot, Clock, KeyRound, LineChart, Lock, Quote, Star, Zap } from "lucide-react";
import SmartImage from "./SmartImage";
import { AGENT } from "@/lib/data";
import { useCRM } from "@/context/CRMContext";

const FEATURES = [
  { icon: Lock, title: "Off-market access", body: "70% of our inventory never hits Zillow or Redfin. Get first look at pocket listings before the public." },
  { icon: Bot, title: "24/7 AI concierge", body: "Instant answers, tour booking and personalised matches — at 2pm or 2am, in under 60 seconds." },
  { icon: LineChart, title: "Data-driven pricing", body: "Hyper-local comps and demand analytics so you never overpay — or leave money on the table when selling." },
  { icon: BadgeCheck, title: "White-glove closing", body: "Vetted lenders, attorneys and inspectors coordinated by one dedicated agent, start to keys." },
];

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export default function WhyChooseUs() {
  const { setCrmOpen, openChatWith, demoMode } = useCRM();

  return (
    <>
      <section id="why-us" className="scroll-mt-20 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div {...fade} transition={{ duration: 0.6 }}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Why Choose Us</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                The unfair advantage in a market that moves in hours.
              </h2>
              <p className="mt-4 max-w-lg text-slate-600">
                AuraEstate pairs boutique, relationship-first brokerage with technology that responds faster than any team.
                The result: our clients close in 18 days on average.
              </p>

              <figure className="mt-10 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-100">
                <Quote className="h-6 w-6 text-emerald-500" />
                <blockquote className="mt-3 text-base leading-relaxed text-slate-700">
                  &ldquo;Alex sent us an off-market penthouse at 11pm — the AI had already booked our tour for the next morning. We were under
                  contract by Friday.&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    <SmartImage src={AGENT.avatar.replace("1560250097-0b93528c311a", "1494790108377-be9c29b29330")} alt="" fill sizes="40px" className="object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Rachel & Tom Whitaker</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      Bought in Miami Beach ·{" "}
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  {...fade}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="group rounded-3xl border border-slate-200/80 p-6 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-500 group-hover:text-white">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Broker pitch / CRM CTA — a sales-demo section, so only shown in Demo Mode */}
      {demoMode && (
      <section id="crm-demo" className="relative overflow-hidden bg-slate-950 py-20 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div {...fade} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <KeyRound className="h-3.5 w-3.5" /> For brokers & agency owners
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Every visitor qualified. Every lead in your CRM. <span className="text-emerald-300">Automatically.</span>
            </h2>
            <p className="mt-4 max-w-lg text-white/70">
              Try it yourself: chat with the AI assistant, then open the Broker CRM — your lead appears instantly with budget,
              timeline, location and a hot-lead score.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setCrmOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                🔑 Live Broker CRM Dashboard (Demo Mode) <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => openChatWith("Buy")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Bot className="h-4 w-4" /> Test the AI chatbot
              </button>
            </div>
          </motion.div>

          <motion.dl {...fade} transition={{ duration: 0.6, delay: 0.15 }} className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, v: "< 1 sec", l: "Lead response time" },
              { icon: Clock, v: "24/7/365", l: "Coverage, zero overtime" },
              { icon: LineChart, v: "3.4×", l: "More qualified leads" },
              { icon: BadgeCheck, v: "100%", l: "Leads captured & scored" },
            ].map((s) => (
              <div key={s.l} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <s.icon className="h-5 w-5 text-emerald-300" />
                <dt className="sr-only">{s.l}</dt>
                <dd className="mt-4 text-3xl font-semibold tracking-tight text-white">{s.v}</dd>
                <dd className="mt-1 text-sm text-white/60">{s.l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </section>
      )}
    </>
  );
}
