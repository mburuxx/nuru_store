import React from "react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 " +
    "focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const styles = {
    // Brand: deep warm indigo, lightens slightly on hover
    primary:
      "bg-[#1B2A4A] text-white hover:bg-[#243757] shadow-sm active:scale-[0.98]",
    // Secondary: warm stone tint, not cold slate
    secondary:
      "bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 active:scale-[0.98]",
    // Ghost: subtle, no background
    ghost:
      "bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900",
    // Danger: unchanged — red is red
    danger:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]",
  };

  return (
    <button
      type={type}
      className={cn(base, styles[variant] || styles.primary, className)}
      {...props}
    />
  );
}