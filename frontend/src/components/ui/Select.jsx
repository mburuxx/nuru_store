import React from "react";

export default function Select({ label, error, className = "", children, ...props }) {
  return (
    <div>
      {label ? <label className="text-sm font-medium text-gray-800">{label}</label> : null}
      <select
        className={`mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm
        focus:outline-none focus:ring-2 focus:ring-black focus:border-black ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}