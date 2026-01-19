import React from "react";
import { useAuth } from "../auth/AuthContext";

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Owner</div>
        <div className="text-sm flex gap-3 items-center">
          <span>{user?.username}</span>
          <button className="underline" onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="mt-6 text-gray-600">Dashboard next.</div>
    </div>
  );
}