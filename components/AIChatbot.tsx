"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronRight, KeyRound, MessageCircle, RotateCcw, SendHorizontal, X } from "lucide-react";
import clsx from "clsx";
import SmartImage from "./SmartImage";
import { useCRM, type LeadIntent, type LeadStatus } from "@/context/CRMContext";
import { PROPERTIES, formatPrice } from "@/lib/data";
import { absorbAssistantReply, opening, respond, suggestionsFor } from "@/lib/concierge/engine";
import { propertiesMentioned } from "@/lib/concierge/extract";
import { profileToLead } from "@/lib/concierge/score";
import { initialState, type ChatTurn, type ConciergeState, type Profile } from "@/lib/concierge/types";

interface Msg {
  id: number;
  from: "bot" | "user";
  text?: string;
  kind?: "text" | "lead";
  propertyIds?: string[];
}

type Mode = "checking" | "ai" | "local";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Human-feeling pause before a message appears: 1.2–1.8 s. */
const typingDelay = () => 1200 + Math.random() * 600;

const PRESET_TEXT: Partial<Record<LeadIntent, string>> = {
  Buy: "I'm looking to buy",
  Sell: "I'm thinking about selling my home",
  Tour: "I'd like to book a private tour",
};

const PLACEHOLDER: Record<string, string> = {
  name: "Your name…",
  contact: "Email or mobile number…",
  tourDay: "e.g. Saturday afternoon",
  sellAddress: "Property address…",
  timeline: "e.g. within 3 months",
};

const openProperty = (id: string) => window.dispatchEvent(new CustomEvent("aura:open-property", { detail: id }));

function PropertyChip({ id }: { id: string }) {
  const p = PROPERTIES.find((x) => x.id === id);
  if (!p) return null;
  return (
    <button
      onClick={() => openProperty(p.id)}
      className="group flex w-full items-center gap-3 rounded-2xl bg-white p-2 pr-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-400"
    >
      <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-200">
        <SmartImage src={p.images[0]} alt="" fill sizes="64px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-slate-900">{p.title}</span>
        <span className="block truncate text-xs text-slate-500">
          {formatPrice(p.price)} · {p.beds} bd · {p.location.split(",")[0]}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </button>
  );
}

function ElenaAvatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-700 font-semibold text-white",
        size === "lg" ? "h-11 w-11 text-base" : "h-7 w-7 text-[11px]",
      )}
      aria-hidden
    >
      E
    </span>
  );
}

export default function AIChatbot() {
  const { addLead, updateLead, leads, chatOpen, setChatOpen, chatPreset, clearChatPreset, setCrmOpen, demoMode } = useCRM();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [awaiting, setAwaiting] = useState<string | null>("intent");
  const [mode, setMode] = useState<Mode>("checking");
  const [teaser, setTeaser] = useState(false);
  const [leadSummary, setLeadSummary] = useState<Profile | null>(null);

  const idRef = useRef(0);
  const stateRef = useRef<ConciergeState>(initialState());
  const historyRef = useRef<ChatTurn[]>([]);
  const sessionRef = useRef(0);
  const started = useRef(false);
  const leadIdRef = useRef<string | null>(null);
  const autoStatusRef = useRef<LeadStatus | null>(null);
  const leadCardShown = useRef(false);
  const userTurns = useRef(0);
  const leadsRef = useRef(leads);
  const modeRef = useRef<Mode>("checking");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const push = useCallback((m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { ...m, id: ++idRef.current }]), []);

  /** Show bubbles one at a time with a typing indicator. `firstWait` lets AI latency count toward the pause. */
  const deliver = useCallback(
    async (bubbles: string[], propertyIds: string[], session: number, firstWait: number) => {
      for (let i = 0; i < bubbles.length; i++) {
        setTyping(true);
        await sleep(i === 0 ? firstWait : 900 + Math.random() * 600 + Math.min(bubbles[i].length * 4, 400));
        if (session !== sessionRef.current) return false;
        push({ from: "bot", text: bubbles[i], propertyIds: i === 0 && propertyIds.length ? propertyIds : undefined });
      }
      setTyping(false);
      return true;
    },
    [push],
  );

  /** Create or update this visitor's CRM lead from everything learned so far. */
  const syncLead = useCallback(
    (p: Profile) => {
      if (!(p.name || p.email || p.phone)) return;
      const data = profileToLead(p, userTurns.current);
      const id = leadIdRef.current;
      const current = id ? leadsRef.current.find((l) => l.id === id) : undefined;
      if (!current) {
        const lead = addLead(data);
        leadIdRef.current = lead.id;
        autoStatusRef.current = data.status ?? null;
        return;
      }
      const patch = { ...data };
      // Respect a status the broker changed by hand in the CRM.
      if (autoStatusRef.current && current.status !== autoStatusRef.current) delete patch.status;
      else autoStatusRef.current = data.status ?? null;
      updateLead(current.id, patch);
    },
    [addLead, updateLead],
  );

  const handleUser = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      const session = sessionRef.current;
      setBusy(true);
      setChips([]);
      setInput("");
      push({ from: "user", text });
      historyRef.current.push({ role: "user", content: text });
      userTurns.current += 1;

      const prev = stateRef.current;
      const local = respond(prev, text); // always run: it extracts lead details + gives the fallback reply
      let bubbles = local.reply.bubbles;
      let ids = local.reply.propertyIds;
      let next = local.state;
      let chipList = local.reply.suggestions;
      let wait = typingDelay();

      // Simple sign-offs after a booking are answered locally — instant, consistent, and no API cost.
      if (modeRef.current === "ai" && !local.reply.closing) {
        const t0 = Date.now();
        setTyping(true);
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ messages: historyRef.current, profile: local.state.profile, confirmed: local.state.confirmed }),
          });
          const data = (await res.json()) as { reply?: string; fallback?: boolean };
          if (data.reply) {
            bubbles = data.reply.split(/\n\s*\n/).map((b) => b.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean).slice(0, 2);
            next = absorbAssistantReply({ ...local.state, said: prev.said, awaiting: prev.awaiting, offer: prev.offer, closed: prev.closed }, data.reply);
            ids = propertiesMentioned(data.reply).slice(0, 3);
            chipList = suggestionsFor(next);
          } else if (data.fallback) {
            setMode("local");
          }
        } catch {
          setMode("local");
        }
        wait = Math.max(250, typingDelay() - (Date.now() - t0));
      }
      if (session !== sessionRef.current) return;

      stateRef.current = next;
      setAwaiting(next.awaiting);
      syncLead(next.profile);

      const ok = await deliver(bubbles, ids, session, wait);
      if (!ok) return;
      historyRef.current.push({ role: "assistant", content: bubbles.join("\n\n") });

      if (!leadCardShown.current && (next.profile.email || next.profile.phone)) {
        leadCardShown.current = true;
        setLeadSummary(next.profile);
        push({ from: "bot", kind: "lead" });
      } else if (leadCardShown.current) {
        setLeadSummary(next.profile);
      }
      setChips(chipList);
      setBusy(false);
    },
    [busy, deliver, push, syncLead],
  );

  const reset = useCallback(
    async (preset?: LeadIntent | null) => {
      sessionRef.current += 1;
      const session = sessionRef.current;
      started.current = true;
      stateRef.current = initialState();
      historyRef.current = [];
      leadIdRef.current = null;
      autoStatusRef.current = null;
      leadCardShown.current = false;
      userTurns.current = 0;
      setLeadSummary(null);
      setMessages([]);
      setChips([]);
      setInput("");
      setAwaiting("intent");
      setBusy(true);
      const greet = opening(stateRef.current);
      const ok = await deliver(greet, [], session, 700);
      if (!ok) return;
      historyRef.current.push({ role: "assistant", content: greet.join(" ") });
      setBusy(false);
      const presetText = preset ? PRESET_TEXT[preset] : undefined;
      if (presetText) {
        await sleep(350);
        if (session === sessionRef.current) handleUserRef.current?.(presetText);
      } else setChips(suggestionsFor(stateRef.current));
    },
    [deliver],
  );

  const handleUserRef = useRef(handleUser);
  useEffect(() => {
    handleUserRef.current = handleUser;
  }, [handleUser]);

  // Detect whether a live AI provider is configured (once).
  useEffect(() => {
    if (!chatOpen || mode !== "checking") return;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d: { ai?: boolean }) => setMode(d.ai ? "ai" : "local"))
      .catch(() => setMode("local"));
  }, [chatOpen, mode]);

  // Start / preset handling
  useEffect(() => {
    if (!chatOpen) return;
    setTeaser(false);
    if (chatPreset) {
      const preset = chatPreset;
      clearChatPreset();
      void reset(preset);
    } else if (!started.current) {
      void reset();
    }
  }, [chatOpen, chatPreset, clearChatPreset, reset]);

  useEffect(() => {
    const t = setTimeout(() => !started.current && setTeaser(true), 4500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, chips]);

  useEffect(() => {
    if (chatOpen && !busy && awaiting && ["name", "contact", "sellAddress", "tourDay"].includes(awaiting)) inputRef.current?.focus();
  }, [chatOpen, busy, awaiting]);

  const leadData = leadSummary ? profileToLead(leadSummary, userTurns.current) : null;

  return (
    <>
      {/* Launcher */}
      <div className="fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {teaser && !chatOpen && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              onClick={() => setChatOpen(true)}
              className="absolute bottom-[4.5rem] right-0 w-64 rounded-2xl rounded-br-md bg-white p-3.5 text-left text-sm text-slate-700 shadow-2xl ring-1 ring-slate-200"
            >
              <span
                role="button"
                tabIndex={0}
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  setTeaser(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && setTeaser(false)}
                className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-800 text-white shadow"
              >
                <X className="h-3 w-3" />
              </span>
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                <ElenaAvatar /> Elena · AuraEstate
              </span>
              <span className="mt-1.5 block">Hi! Ask me anything about our homes — prices, payments, or off-market options. 🏡</span>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setChatOpen(!chatOpen)}
          aria-label={chatOpen ? "Close chat" : "Chat with Elena, our client advisor"}
          aria-expanded={chatOpen}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-600/40 sm:h-16 sm:w-16"
        >
          {!chatOpen && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={chatOpen ? "x" : "chat"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />}
            </motion.span>
          </AnimatePresence>
          {!chatOpen && !started.current && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold ring-2 ring-white">1</span>
          )}
        </motion.button>
      </div>

      {/* Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-x-2 bottom-24 top-20 z-50 flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/30 ring-1 ring-slate-200 sm:inset-x-auto sm:bottom-28 sm:right-6 sm:top-auto sm:h-[min(660px,calc(100svh-9rem))] sm:w-[400px]"
            aria-label="Chat with Elena, AuraEstate client advisor"
          >
            {/* Header */}
            <header className="relative bg-slate-950 px-5 py-4 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.35),transparent_60%)]" />
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <ElenaAvatar size="lg" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-slate-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    Elena
                    <span className="rounded bg-white/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-emerald-200">AI</span>
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {typing ? "typing…" : "Senior Client Advisor · AuraEstate"}
                  </p>
                </div>
                <button onClick={() => void reset()} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Restart conversation" title="Restart">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => setChatOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Close chat">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-4 py-5 scrollbar-thin" aria-live="polite">
              <p className="pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">Today</p>
              {messages.map((m, i) => {
                const prevFromSame = messages[i - 1]?.from === m.from && messages[i - 1]?.kind !== "lead";
                if (m.kind === "lead" && leadData) {
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ml-9 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-200">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" /> Details sent to Alex
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        {[
                          ["Name", leadSummary?.name ?? "—"],
                          ["Goal", leadData.intent],
                          [leadData.intent === "Sell" ? "Est. value" : "Budget", leadData.budget],
                          ["Timeline", leadData.timeline],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-slate-400">{k}</dt>
                            <dd className="truncate font-medium text-slate-800">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      {!demoMode && (
                        <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                          Alex usually replies within the hour. Your details are only shared with your agent.
                        </p>
                      )}
                      {/* Broker-only: visible in Demo Mode (navbar switch or ?demo=true) */}
                      {demoMode && (
                      <div className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-3">
                        <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Broker demo <span className="normal-case tracking-normal">Lead score {leadData.score}</span>
                        </p>
                        <p className="mt-1 text-xs text-emerald-900">Captured from the conversation and synced to the CRM live — it keeps updating as you chat.</p>
                        <button
                          onClick={() => {
                            setChatOpen(false);
                            setCrmOpen(true);
                          }}
                          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> View lead in Broker CRM
                        </button>
                      </div>
                      )}
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={clsx("flex items-end gap-2", m.from === "user" && "justify-end", !prevFromSame && i > 0 && "pt-1.5")}
                  >
                    {m.from === "bot" && (prevFromSame ? <span className="w-7 shrink-0" /> : <ElenaAvatar />)}
                    <div className={clsx("flex max-w-[82%] flex-col gap-2", m.from === "user" && "items-end")}>
                      <p
                        className={clsx(
                          "whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          m.from === "bot" ? "rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-100" : "rounded-br-md bg-emerald-600 text-white",
                        )}
                      >
                        {m.text}
                      </p>
                      {m.propertyIds?.map((id) => <PropertyChip key={id} id={id} />)}
                    </div>
                  </motion.div>
                );
              })}

              {typing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2 pt-1" aria-label="Elena is typing">
                  <ElenaAvatar />
                  <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </motion.div>
              )}

              {!busy && chips.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 pl-9 pt-1">
                  {chips.map((o, i) => (
                    <motion.button
                      key={o}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => void handleUser(o)}
                      className="rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-emerald-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
                    >
                      {o}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleUser(input);
              }}
              noValidate
              className="border-t border-slate-100 bg-white p-3"
            >
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 py-1.5 pl-4 pr-1.5 ring-emerald-500/30 focus-within:ring-4">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={(awaiting && PLACEHOLDER[awaiting]) || "Ask Elena anything…"}
                  autoComplete={awaiting === "name" ? "name" : awaiting === "contact" ? "email" : "off"}
                  maxLength={600}
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  aria-label="Message Elena"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || busy}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:bg-slate-300"
                  aria-label="Send"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                <span className={clsx("h-1.5 w-1.5 rounded-full", mode === "ai" ? "bg-emerald-500" : "bg-slate-300")} />
                {mode === "ai" ? "Live AI advisor" : "Instant AI advisor"} · Alex follows up personally
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
