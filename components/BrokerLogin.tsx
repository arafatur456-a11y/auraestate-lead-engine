"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LockKeyhole, ShieldCheck, X } from "lucide-react";
import Modal from "./Modal";
import { useCRM } from "@/context/CRMContext";

const ERRORS: Record<string, string> = {
  invalid_pin: "That PIN isn't right. Please try again.",
  too_many_attempts: "Too many attempts. Please wait a few minutes and try again.",
  not_configured: "Broker login isn't set up on this site yet. Add a BROKER_PIN environment variable in your hosting settings.",
};

/** PIN prompt shown when someone opens the Broker CRM outside of Demo Mode. */
export default function BrokerLogin() {
  const { loginOpen, closeLogin, completeLogin } = useCRM();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loginOpen) {
      setPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [loginOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/broker-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        completeLogin();
        return;
      }
      setError(ERRORS[data.error ?? ""] ?? "Something went wrong. Please try again.");
      setShake((n) => n + 1);
      setPin("");
      inputRef.current?.focus();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={loginOpen} onClose={closeLogin} label="Broker login" className="rounded-t-3xl sm:max-w-sm sm:rounded-3xl">
      <div className="relative p-6 sm:p-7">
        <button onClick={closeLogin} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-emerald-300">
          <LockKeyhole className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Broker login</h2>
        <p className="mt-1.5 text-sm text-slate-500">Enter your broker PIN to open the lead CRM.</p>

        <motion.form key={shake} onSubmit={submit} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }} className="mt-6 space-y-3">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.slice(0, 64));
              if (error) setError("");
            }}
            placeholder="••••"
            aria-label="Broker PIN"
            aria-invalid={!!error}
            aria-describedby={error ? "broker-pin-error" : undefined}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg tracking-[0.5em] text-slate-900 outline-none transition placeholder:tracking-[0.3em] placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
          />
          {error && (
            <p id="broker-pin-error" className="text-sm text-rose-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!pin.trim() || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Checking…" : "Unlock CRM"}
          </button>
        </motion.form>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Session stays signed in for 8 hours on this device
        </p>
      </div>
    </Modal>
  );
}
