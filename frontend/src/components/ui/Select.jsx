import React from "react";

export default function Select({ label, error, className = "", children, ...props }) {
  return (
    <div>
      {label ? (
        <label className="text-sm font-medium text-stone-700">{label}</label>
      ) : null}
      <select
        className={`
          mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-900
          focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A]
          transition-colors duration-150
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      ) : null}
    </div>
  );
}