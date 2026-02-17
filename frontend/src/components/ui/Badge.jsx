import React from "react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Badge({ tone = "gray", className = "", children }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border tracking-wide";

  const tones = {
    // Brand indigo — for neutral info (replaces cold blue in many places)
    blue:   "bg-indigo-50 text-indigo-800 border-indigo-100",
    // Success — slightly warmer emerald
    green:  "bg-emerald-50 text-emerald-800 border-emerald-100",
    // Danger
    red:    "bg-red-50 text-red-700 border-red-100",
    // Warning — amber, already your accent colour
    yellow: "bg-amber-50 text-amber-800 border-amber-100",
    // Neutral — warm stone instead of cold slate
    gray:   "bg-stone-50 text-stone-600 border-stone-200",
  };

  return (
    <span className={cn(base, tones[tone] || tones.gray, className)}>
      {children}
    </span>
  );
}