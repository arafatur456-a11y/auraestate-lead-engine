"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type LeadStatus = "New Lead" | "Qualified" | "Tour Requested" | "Contacted" | "Closed";
export type LeadIntent = "Buy" | "Sell" | "Tour" | "Inquiry";
export type LeadSource = "AI Chatbot" | "Property Inquiry" | "Tour Request";

export const LEAD_STATUSES: LeadStatus[] = ["New Lead", "Qualified", "Tour Requested", "Contacted", "Closed"];

export interface Lead {
  id: string;
  createdAt: string; // ISO
  name: string;
  email: string;
  phone: string;
  budget: string;
  location: string;
  timeline: string;
  intent: LeadIntent;
  source: LeadSource;
  status: LeadStatus;
  property?: string;
  message?: string;
  score: number; // 0–100
}

export type NewLead = Omit<Lead, "id" | "createdAt" | "score" | "status"> & { status?: LeadStatus };

interface CRMContextValue {
  leads: Lead[];
  addLead: (lead: NewLead) => Lead;
  updateStatus: (id: string, status: LeadStatus) => void;
  resetDemo: () => void;
  crmOpen: boolean;
  setCrmOpen: (open: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatPreset: LeadIntent | null;
  openChatWith: (intent: LeadIntent) => void;
  clearChatPreset: () => void;
  lastLead: Lead | null;
  dismissLastLead: () => void;
  unseen: number;
}

const CRMContext = createContext<CRMContextValue | null>(null);

const STORAGE_KEY = "auraestate.crm.leads.v1";

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export function scoreLead(l: Pick<Lead, "timeline" | "budget" | "intent" | "phone">): number {
  let s = 40;
  if (/ASAP|30 days|Immediately/i.test(l.timeline)) s += 30;
  else if (/1.?–.?3|1-3/i.test(l.timeline)) s += 20;
  else if (/3.?–.?6|3-6/i.test(l.timeline)) s += 10;
  if (/\$10M\+|\$5M/i.test(l.budget)) s += 15;
  else if (/\$2M/i.test(l.budget)) s += 8;
  if (l.intent === "Tour") s += 10;
  if (l.phone) s += 5;
  return Math.min(99, s);
}

const SEED_LEADS: Lead[] = [
  {
    id: "seed-1", createdAt: minsAgo(18), name: "Olivia Bennett", email: "olivia.bennett@gmail.com", phone: "+1 (310) 555-0198",
    budget: "$10M+", location: "Beverly Hills, CA", timeline: "1–3 months", intent: "Buy", source: "AI Chatbot",
    status: "Qualified", score: 88,
  },
  {
    id: "seed-2", createdAt: minsAgo(64), name: "Marcus Chen", email: "m.chen@chenventures.com", phone: "+1 (305) 555-0123",
    budget: "$5M – $10M", location: "Miami Beach, FL", timeline: "ASAP", intent: "Tour", source: "Tour Request",
    status: "Tour Requested", property: "Oceanfront Sky Residence", score: 95,
  },
  {
    id: "seed-3", createdAt: minsAgo(185), name: "Sophie Hartley", email: "sophie.hartley@outlook.co.uk", phone: "+44 7700 900461",
    budget: "Under $2M", location: "Kensington, London", timeline: "3–6 months", intent: "Inquiry", source: "Property Inquiry",
    status: "New Lead", property: "Kensington Garden Apartment", score: 62,
  },
  {
    id: "seed-4", createdAt: minsAgo(60 * 9), name: "Daniel Ramirez", email: "dramirez@icloud.com", phone: "+1 (512) 555-0177",
    budget: "$2M – $5M", location: "Austin, TX", timeline: "6+ months", intent: "Sell", source: "AI Chatbot",
    status: "Contacted", score: 54,
  },
  {
    id: "seed-5", createdAt: minsAgo(60 * 26), name: "Priya Natarajan", email: "priya.n@gmail.com", phone: "+1 (212) 555-0109",
    budget: "$5M – $10M", location: "Manhattan, NY", timeline: "1–3 months", intent: "Buy", source: "AI Chatbot",
    status: "Closed", score: 91,
  },
];

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(SEED_LEADS);
  const [crmOpen, setCrmOpenState] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPreset, setChatPreset] = useState<LeadIntent | null>(null);
  const [lastLead, setLastLead] = useState<Lead | null>(null);
  const [unseen, setUnseen] = useState(0);
  const hydrated = useRef(false);

  // Hydrate from localStorage so demo leads survive refresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Lead[];
        if (Array.isArray(parsed) && parsed.length) setLeads(parsed);
      }
    } catch {
      /* storage unavailable — keep seed data */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      /* ignore */
    }
  }, [leads]);

  const addLead = useCallback((input: NewLead) => {
    const lead: Lead = {
      ...input,
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: input.status ?? "New Lead",
      score: scoreLead(input),
    };
    setLeads((prev) => [lead, ...prev]);
    setLastLead(lead);
    setUnseen((n) => n + 1);
    return lead;
  }, []);

  const updateStatus = useCallback((id: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }, []);

  const resetDemo = useCallback(() => {
    setLeads(SEED_LEADS.map((l, i) => ({ ...l, createdAt: minsAgo([18, 64, 185, 540, 1560][i] ?? 60) })));
    setUnseen(0);
  }, []);

  const setCrmOpen = useCallback((open: boolean) => {
    setCrmOpenState(open);
    if (open) {
      setUnseen(0);
      setLastLead(null);
    }
  }, []);

  const openChatWith = useCallback((intent: LeadIntent) => {
    setChatPreset(intent);
    setChatOpen(true);
  }, []);

  const value = useMemo<CRMContextValue>(
    () => ({
      leads, addLead, updateStatus, resetDemo,
      crmOpen, setCrmOpen,
      chatOpen, setChatOpen,
      chatPreset, openChatWith, clearChatPreset: () => setChatPreset(null),
      lastLead, dismissLastLead: () => setLastLead(null),
      unseen,
    }),
    [leads, addLead, updateStatus, resetDemo, crmOpen, setCrmOpen, chatOpen, chatPreset, openChatWith, lastLead, unseen],
  );

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used inside <CRMProvider>");
  return ctx;
}
