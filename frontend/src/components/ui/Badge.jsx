import React from "react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Badge({ tone = "gray", className = "", children }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold border";

  const tones = {
    blue: "bg-blue-50 text-blue-800 border-blue-100",
    green: "bg-emerald-50 text-emerald-800 border-emerald-100",
    red: "bg-red-50 text-red-800 border-red-100",
    yellow: "bg-amber-50 text-amber-800 border-amber-100",
    gray: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return <span className={cn(base, tones[tone] || tones.gray, className)}>{children}</span>;
}
