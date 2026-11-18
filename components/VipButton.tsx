"use client";

import { Crown } from "lucide-react";
import clsx from "clsx";
import { useVip } from "@/context/VipContext";

/** Navbar entry point: "VIP Access" for guests, the member's first name once signed in. */
export default function VipButton({ className, block = false, onClick }: { className?: string; block?: boolean; onClick?: () => void }) {
  const { user, ready, openRegister } = useVip();
  const label = user ? user.name.split(" ")[0] : "VIP Access";
  return (
    <button
      onClick={() => {
        onClick?.();
        openRegister("register");
      }}
      aria-label={user ? `VIP account: ${user.name}` : "Register for VIP access"}
      className={clsx(
        /\b(hidden|flex|inline-flex|block)\b/.test(className ?? "") ? "" : "inline-flex",
        "items-center gap-2 whitespace-nowrap rounded-full font-semibold transition",
        block
          ? "justify-center rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-base text-amber-200"
          : "border border-amber-300/40 px-3.5 py-2 text-sm text-amber-200 hover:bg-amber-300/10",
        !ready && "invisible",
        className,
      )}
    >
      <Crown className="h-4 w-4" />
      {block && !user ? "Register / VIP Access" : label}
      {user && <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />}
    </button>
  );
}
