import React from "react";

export default function Loader({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-stone-500">
      {/* Spinner aligned to brand colour */}
      <div className="h-4 w-4 rounded-full border-2 border-stone-200 border-t-[#1B2A4A] animate-spin" />
      <span>{label}</span>
    </div>
  );
}