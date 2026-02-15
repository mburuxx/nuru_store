import React from "react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Button({ variant = "primary", className = "", type = "button", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition " +
    "focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

  const styles = {
    primary: "bg-blue-950 text-white hover:bg-blue-950 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      type={type}
      className={cn(base, styles[variant] || styles.primary, className)} 
      {...props} 
    />
  );
}
