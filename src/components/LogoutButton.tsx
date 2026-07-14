"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded border border-navy-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-gold-500"
    >
      Log out
    </button>
  );
}
