import React from "react";

export default function Loader({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600">
      <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
      <span>{label}</span>
    </div>
  );
}