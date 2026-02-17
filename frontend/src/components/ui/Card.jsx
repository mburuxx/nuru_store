import React from "react";

export function Card({ children, className = "" }) {
  return (
    // Warmer border, slightly richer shadow — cards lift off the warm page background
    <div
      className={`rounded-2xl border border-stone-200/70 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="px-6 pt-6 pb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {/* Slightly warmer heading colour — not pure gray-900 */}
        <h1 className="text-xl font-semibold text-[#1B2A4A]">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-stone-500 mt-1">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="w-full sm:w-auto">{right}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}