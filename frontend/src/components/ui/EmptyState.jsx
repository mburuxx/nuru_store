import React from "react";

export default function EmptyState({ title, subtitle, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {subtitle ? <p className="text-sm text-gray-500 mt-2">{subtitle}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}