"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, KeyRound, MessageCircle, RotateCcw, SendHorizontal, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import { useCRM, type LeadIntent, type LeadStatus } from "@/context/CRMContext";
import { LOCATIONS, PRICE_RANGES, PROPERTIES } from "@/lib/data";

type Step = "intent" | "location" | "budget" | "timeline" | "name" | "email" | "phone" | "done";
type ChatIntent = Exclude<LeadIntent, "Inquiry">;

interface Msg {
  id: number;
  from: "bot" | "user";
  text: string;
  kind?: "success";
}

interface Answers {
  intent?: ChatIntent;
  location?: string;
  property?: string;
  budget?: string;
  timeline?: string;
  name?: string;
  email?: string;
  phone?: string;
}

const INTENT_OPTIONS: { label: string; intent: ChatIntent }[] = [
  { label: "🏡 Looking to Buy", intent: "Buy" },
  { label: "💰 Want to Sell", intent: "Sell" },
  { label: "📅 Book a Tour", intent: "Tour" },
];

const BUDGETS = PRICE_RANGES.slice(1).map((r) => r.label);
const TIMELINES: Record<ChatIntent, string[]> = {
  Buy: ["ASAP", "1–3 months", "3–6 months", "6+ months"],
  Sell: ["ASAP", "1–3 months", "3–6 months", "Just exploring"],
  Tour: ["ASAP (this week)", "1–3 weeks", "Within 30 days", "Flexible"],
};

const STEP_ORDER: Step[] = ["intent", "location", "budget", "timeline", "name", "email", "phone", "done"];

function prompt(step: Step, a: Answers): string {
  const i = a.intent ?? "Buy";
  const first = a.name?.split(" ")[0];
  switch (step) {
    case "location":
      return i === "Sell"
        ? "Great — our sellers average 4.2% over asking. 📈 Where is the property you'd like to sell?"
        : i === "Tour"
          ? "Wonderful! Which property would you like to tour? (or type any address)"
          : "Exciting! 🎉 Which area are you targeting?";
    case "budget":
      return i === "Sell" ? "What's your estimated property value?" : "Perfect. What budget range are you working with?";
    case "timeline":
      return i === "Sell"
        ? "And when are you hoping to list?"
        : i === "Tour"
          ? "When would you like to see it?"
          : "Got it. What's your preferred move-in timeline?";
    case "name":
      return "You're a great fit for our private listings. 🔐 To send matches, may I have your full name?";
    case "email":
      return `Thanks${first ? `, ${first}` : ""}! What's the best email for listing alerts?`;
    case "phone":
      return "Last one — your mobile number? Alex texts off-market drops before they go public. 📱";
    default:
      return "";
  }
}

function optionsFor(step: Step, a: Answers): string[] {
  switch (step) {
    case "intent":
      return INTENT_OPTIONS.map((o) => o.label);
    case "location":
      return a.intent === "Tour" ? PROPERTIES.slice(0, 5).map((p) => p.title) : [...LOCATIONS];
    case "budget":
      return BUDGETS;
    case "timeline":
      return TIMELINES[a.intent ?? "Buy"];
    default:
      return [];
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;

const placeholderFor = (step: Step) =>
  ({
    name: "e.g. Jordan Smith",
    email: "you@example.com",
    phone: "+1 (555) 000-0000",
    location: "Or type a location…",
    budget: "Or type an amount…",
    timeline: "Or type a date…",
  })[step as string] ?? "Type a message…";

export default function AIChatbot() {
  const { addLead, chatOpen, setChatOpen, chatPreset, clearChatPreset, setCrmOpen } = useCRM();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>("intent");
  const [answers, setAnswers] = useState<Answers>({});
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [teaser, setTeaser] = useState(false);
  const idRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  const push = useCallback((m: Omit<Msg, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: ++idRef.current }]);
  }, []);

  const botSay = useCallback(
    (texts: string[], after?: () => void, delay = 650) => {
      setTyping(true);
      texts.forEach((t, idx) => {
        timers.current.push(
          setTimeout(
            () => {
              push({ from: "bot", text: t });
              if (idx === texts.length - 1) {
                setTyping(false);
                after?.();
              }
            },
            delay + idx * 800 + Math.min(t.length * 6, 500),
          ),
        );
      });
    },
    [push],
  );

  const reset = useCallback(
    (preset?: ChatIntent | null) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setMessages([]);
      setAnswers({});
      setStep("intent");
      setInput("");
      setError("");
      started.current = true;
      botSay(["Hi there! 👋 Are you looking to buy, sell, or rent?"], () => {
        if (preset) handleAnswerRef.current?.(INTENT_OPTIONS.find((o) => o.intent === preset)!.label, "intent", {});
      }, 350);
    },
    [botSay],
  );

  // Core state machine
  const handleAnswer = useCallback(
    (raw: string, currentStep: Step, current: Answers) => {
      const value = raw.trim();
      if (!value || currentStep === "done") return;

      if (currentStep === "email" && !EMAIL_RE.test(value)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (currentStep === "phone" && !PHONE_RE.test(value)) {
        setError("Please enter a valid phone number.");
        return;
      }
      if (currentStep === "name" && value.length < 2) {
        setError("Please enter your full name.");
        return;
      }
      setError("");
      setInput("");
      push({ from: "user", text: value });

      const next: Answers = { ...current };
      switch (currentStep) {
        case "intent": {
          const match = INTENT_OPTIONS.find((o) => o.label === value) ?? INTENT_OPTIONS.find((o) => value.toLowerCase().includes(o.intent.toLowerCase()));
          next.intent = match?.intent ?? (/sell/i.test(value) ? "Sell" : /tour|visit|view/i.test(value) ? "Tour" : "Buy");
          break;
        }
        case "location": {
          const prop = PROPERTIES.find((p) => p.title === value);
          next.location = prop ? prop.location : value;
          if (prop) next.property = prop.title;
          break;
        }
        case "budget":
          next.budget = value;
          break;
        case "timeline":
          next.timeline = value;
          break;
        case "name":
          next.name = value.replace(/\b\w/g, (c) => c.toUpperCase());
          break;
        case "email":
          next.email = value.toLowerCase();
          break;
        case "phone":
          next.phone = value;
          break;
      }
      setAnswers(next);

      const nextStep = STEP_ORDER[STEP_ORDER.indexOf(currentStep) + 1];

      if (nextStep === "done") {
        const intent = next.intent ?? "Buy";
        const hot = /ASAP|1–3/.test(next.timeline ?? "");
        const status: LeadStatus = intent === "Tour" ? "Tour Requested" : hot ? "Qualified" : intent === "Sell" ? "New Seller Lead" : "New Lead";
        setStep("done");
        botSay(["Thank you! Agent Alex will send exclusive off-market listings to your phone shortly. 🏠✨"], () => {
          addLead({
            name: next.name ?? "",
            email: next.email ?? "",
            phone: next.phone ?? "",
            budget: next.budget ?? "—",
            location: next.location ?? "—",
            timeline: next.timeline ?? "—",
            intent,
            source: intent === "Tour" ? "Tour Request" : "AI Chatbot",
            status,
            property: next.property,
          });
          push({ from: "bot", text: "", kind: "success" });
        });
        return;
      }

      setStep(nextStep);
      botSay([prompt(nextStep, next)]);
    },
    [addLead, botSay, push],
  );

  const handleAnswerRef = useRef(handleAnswer);
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  }, [handleAnswer]);

  // Start conversation when opened (and honour presets like "Schedule Tour")
  useEffect(() => {
    if (!chatOpen) return;
    setTeaser(false);
    if (chatPreset) {
      const preset = chatPreset === "Inquiry" ? null : chatPreset;
      clearChatPreset();
      reset(preset);
    } else if (!started.current) {
      reset();
    }
  }, [chatOpen, chatPreset, clearChatPreset, reset]);

  // Teaser bubble after a few seconds
  useEffect(() => {
    const t = setTimeout(() => !started.current && setTeaser(true), 4500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (chatOpen && !typing && ["name", "email", "phone"].includes(step)) inputRef.current?.focus();
  }, [chatOpen, typing, step]);

  const options = !typing ? optionsFor(step, answers) : [];
  const progress = Math.round((STEP_ORDER.indexOf(step) / (STEP_ORDER.length - 1)) * 100);
  const inputType = step === "email" ? "email" : step === "phone" ? "tel" : "text";

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
              className="absolute bottom-[4.5rem] right-0 w-60 rounded-2xl rounded-br-md bg-white p-3.5 text-left text-sm text-slate-700 shadow-2xl ring-1 ring-slate-200"
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
              <span className="font-semibold text-slate-900">Hi! 👋 Looking for a home?</span>
              <br />I can show you off-market listings in under 60 seconds.
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setChatOpen(!chatOpen)}
          aria-label={chatOpen ? "Close chat" : "Chat with our AI assistant"}
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
          {!chatOpen && (
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
            className="fixed inset-x-2 bottom-24 top-20 z-50 flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/30 ring-1 ring-slate-200 sm:inset-x-auto sm:bottom-28 sm:right-6 sm:top-auto sm:h-[min(640px,calc(100svh-9rem))] sm:w-[400px]"
            aria-label="AI Lead Assistant"
          >
            {/* Header */}
            <header className="relative bg-slate-950 px-5 pb-4 pt-4 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.35),transparent_60%)]" />
              <div className="relative flex items-center gap-3">
                <div className="relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600">
                  <Bot className="h-6 w-6" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-slate-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    Aura AI Concierge <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  </p>
                  <p className="text-xs text-white/60">Online 24/7 · Typically replies instantly</p>
                </div>
                <button onClick={() => reset()} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Restart conversation" title="Restart">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => setChatOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Close chat">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-emerald-400" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-5 scrollbar-thin" aria-live="polite">
              <p className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">Today</p>
              {messages.map((m) =>
                m.kind === "success" ? (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-200">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" /> You&apos;re all set, {answers.name?.split(" ")[0]}!
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      {[
                        ["Goal", answers.intent],
                        [answers.property ? "Property" : "Location", answers.property ?? answers.location],
                        ["Budget", answers.budget],
                        ["Timeline", answers.timeline],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-slate-400">{k}</dt>
                          <dd className="truncate font-medium text-slate-800">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Broker demo</p>
                      <p className="mt-1 text-xs text-emerald-900">This lead just landed in the CRM — qualified and scored automatically.</p>
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
                    <button onClick={() => reset()} className="mt-2 w-full py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800">
                      Start a new conversation
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={clsx("flex items-end gap-2", m.from === "user" && "justify-end")}
                  >
                    {m.from === "bot" && (
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Bot className="h-4 w-4" />
                      </span>
                    )}
                    <p
                      className={clsx(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        m.from === "bot" ? "rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-100" : "rounded-br-md bg-emerald-600 text-white",
                      )}
                    >
                      {m.text}
                    </p>
                  </motion.div>
                ),
              )}

              {typing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Bot className="h-4 w-4" />
                  </span>
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

              {options.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx("flex flex-wrap gap-2 pl-9", step === "intent" && "flex-col items-start")}
                >
                  {options.map((o, i) => (
                    <motion.button
                      key={o}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleAnswer(o, step, answers)}
                      className="rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
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
                handleAnswer(input, step, answers);
              }}
              noValidate
              className="border-t border-slate-100 bg-white p-3"
            >
              {error && <p className="mb-2 px-1 text-xs font-medium text-rose-600">{error}</p>}
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 py-1.5 pl-4 pr-1.5 ring-emerald-500/30 focus-within:ring-4">
                <input
                  ref={inputRef}
                  type={inputType}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={step === "done" || typing}
                  placeholder={step === "done" ? "Conversation complete ✓" : placeholderFor(step)}
                  autoComplete={step === "name" ? "name" : step === "email" ? "email" : step === "phone" ? "tel" : "off"}
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                  aria-label="Message"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || step === "done"}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:bg-slate-300"
                  aria-label="Send"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">Powered by AuraEstate AI · Your data is encrypted</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
