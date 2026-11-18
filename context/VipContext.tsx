"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useCRM } from "./CRMContext";
import { PRICE_RANGES } from "@/lib/data";

/**
 * Demo VIP buyer accounts.
 *
 * Accounts live in this browser's localStorage (passwords are salted SHA-256 hashes, never
 * stored in plain text). This is a front-end demo of the sign-up experience — a production
 * site would create accounts on a server.
 */

export interface VipProfile {
  name: string;
  email: string;
  phone: string;
  location: string; // a LOCATIONS value or "Anywhere"
  budget: string; // a PRICE_RANGES label
  createdAt: string;
}

interface StoredAccount extends VipProfile {
  passwordHash: string;
}

export type RegisterInput = Omit<VipProfile, "createdAt"> & { password: string };

interface VipContextValue {
  user: VipProfile | null;
  ready: boolean;
  registerOpen: boolean;
  openRegister: (tab?: "register" | "signin") => void;
  closeRegister: () => void;
  initialTab: "register" | "signin";
  register: (input: RegisterInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => void;
}

const ACCOUNTS_KEY = "auraestate.vip.accounts.v1";
const SESSION_KEY = "auraestate.vip.session.v1";

const VipContext = createContext<VipContextValue | null>(null);

async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`auraestate:${email.toLowerCase()}:${password}`);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for non-secure contexts (e.g. plain-http previews): FNV-1a, demo only.
  let h = 2166136261;
  for (const b of data) h = Math.imul(h ^ b, 16777619);
  return `fnv-${(h >>> 0).toString(16)}`;
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const list = raw ? (JSON.parse(raw) as StoredAccount[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAccounts(list: StoredAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — the session still works for this page view */
  }
}

const strip = ({ passwordHash: _ph, ...profile }: StoredAccount): VipProfile => profile;

export function VipProvider({ children }: { children: React.ReactNode }) {
  const { leads, addLead, updateLead } = useCRM();
  const [user, setUser] = useState<VipProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"register" | "signin">("register");

  // Restore the signed-in session.
  useEffect(() => {
    try {
      const email = localStorage.getItem(SESSION_KEY);
      const acct = email ? readAccounts().find((a) => a.email === email) : undefined;
      if (acct) setUser(strip(acct));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  /** Push the VIP into the Broker CRM — updating an existing lead with the same email instead of duplicating. */
  const syncToCRM = useCallback(
    (p: VipProfile) => {
      const range = PRICE_RANGES.find((r) => r.label === p.budget);
      const value = range && Number.isFinite(range.max) ? range.max : range?.min ? range.min * 1.25 : undefined;
      const data = {
        name: p.name,
        email: p.email,
        phone: p.phone,
        budget: p.budget,
        location: p.location,
        timeline: "—",
        intent: "Buy" as const,
        source: "VIP Registration" as const,
        status: "Registered VIP Buyer" as const,
        value,
        message: "Registered for VIP off-market alerts",
        score: Math.min(95, 70 + (p.phone ? 10 : 0) + (value && value >= 5_000_000 ? 10 : 0)),
      };
      const existing = leads.find((l) => l.email && l.email.toLowerCase() === p.email.toLowerCase());
      if (existing) updateLead(existing.id, data);
      else addLead(data);
    },
    [leads, addLead, updateLead],
  );

  const register = useCallback<VipContextValue["register"]>(
    async (input) => {
      const email = input.email.trim().toLowerCase();
      const accounts = readAccounts();
      if (accounts.some((a) => a.email === email)) return { ok: false, error: "An account with this email already exists — try signing in instead." };
      const profile: VipProfile = {
        name: input.name.trim().replace(/\s+/g, " "),
        email,
        phone: input.phone.trim(),
        location: input.location,
        budget: input.budget,
        createdAt: new Date().toISOString(),
      };
      const passwordHash = await hashPassword(email, input.password);
      writeAccounts([...accounts, { ...profile, passwordHash }]);
      try {
        localStorage.setItem(SESSION_KEY, email);
      } catch {
        /* ignore */
      }
      setUser(profile);
      syncToCRM(profile);
      return { ok: true };
    },
    [syncToCRM],
  );

  const signIn = useCallback<VipContextValue["signIn"]>(async (rawEmail, password) => {
    const email = rawEmail.trim().toLowerCase();
    const acct = readAccounts().find((a) => a.email === email);
    if (!acct || acct.passwordHash !== (await hashPassword(email, password))) return { ok: false, error: "That email and password don't match. Please try again." };
    try {
      localStorage.setItem(SESSION_KEY, email);
    } catch {
      /* ignore */
    }
    setUser(strip(acct));
    return { ok: true };
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo<VipContextValue>(
    () => ({
      user,
      ready,
      registerOpen,
      initialTab,
      openRegister: (tab = "register") => {
        setInitialTab(tab);
        setRegisterOpen(true);
      },
      closeRegister: () => setRegisterOpen(false),
      register,
      signIn,
      signOut,
    }),
    [user, ready, registerOpen, initialTab, register, signIn, signOut],
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVip must be used inside <VipProvider>");
  return ctx;
}
