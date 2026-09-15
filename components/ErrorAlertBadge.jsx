"use client";

import { useState } from "react";

export default function ErrorAlertBadge({ message }) {
  const [open, setOpen] = useState(true);
  if (!message) return null;

  return (
    <div className="fixed right-6 top-16 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Show error details"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#FECACA] bg-white text-red shadow-[0_2px_8px_rgba(20,30,80,.08)] hover:bg-red-bg"
      >
        <InfoIcon />
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red text-[9px] font-bold text-white">
          1
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 animate-slideDownFade rounded-2xl border border-[#FECACA] bg-white p-4 shadow-[0_8px_24px_-4px_rgba(220,38,38,.25)]">
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-[12.5px] font-bold text-red">Connection error</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Dismiss"
              className="text-text-dim hover:text-navy"
            >
              <XIcon />
            </button>
          </div>
          <p className="text-[12.5px] leading-relaxed text-navy">{message}</p>
        </div>
      )}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5M12 8v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
