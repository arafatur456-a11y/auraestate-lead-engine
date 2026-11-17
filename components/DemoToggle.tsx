"use client";

import clsx from "clsx";
import { useCRM } from "@/context/CRMContext";

/**
 * Subtle Demo Mode switch. Only rendered for people who are already "inside":
 * a signed-in broker, or a session opened with ?demo=true. Regular visitors never see it.
 */
export default function DemoToggle({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const { demoAllowed, demoMode, setDemoMode, brokerAuthed } = useCRM();
  if (!demoAllowed || !(demoMode || brokerAuthed)) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={demoMode}
      onClick={() => setDemoMode(!demoMode)}
      title={demoMode ? "Demo Mode is on — CRM tools are visible to anyone using this browser" : "Turn on Demo Mode for presentations"}
      className={clsx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition",
        tone === "dark" ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        className,
      )}
    >
      Demo Mode
      <span className={clsx("relative h-4 w-7 rounded-full transition-colors", demoMode ? "bg-emerald-500" : tone === "dark" ? "bg-white/20" : "bg-slate-300")}>
        <span className={clsx("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all", demoMode ? "left-3.5" : "left-0.5")} />
      </span>
    </button>
  );
}
