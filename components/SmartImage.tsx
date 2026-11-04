"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { Building2 } from "lucide-react";
import clsx from "clsx";

/** next/image with an elegant gradient fallback if a remote photo fails to load. */
export default function SmartImage({ className, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={clsx(
          "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-emerald-900",
          className,
        )}
      >
        <Building2 className="h-10 w-10 text-white/30" />
      </div>
    );
  }

  return <Image {...props} alt={alt} className={className} onError={() => setFailed(true)} />;
}
