import React from "react";

export default function EmptyState({ title, subtitle, action }) {
  return (
    // Warm tint background instead of clinical pure white, softer dashed border
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 p-10 text-center">
      {/* Small decorative dot cluster — gives the empty state some life */}
      <div className="flex justify-center mb-4">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-stone-300" />
          <span className="w-2 h-2 rounded-full bg-stone-200" />
          <span className="w-2 h-2 rounded-full bg-stone-300" />
        </div>
      </div>
      <h3 className="font-semibold text-[#1B2A4A]">{title}</h3>
      {subtitle ? (
        <p className="text-sm text-stone-500 mt-2 max-w-xs mx-auto">{subtitle}</p>
      ) : null}
      {action ? (
        <div className="mt-5 flex justify-center">{action}</div>
      ) : null}
    </div>
  );
}