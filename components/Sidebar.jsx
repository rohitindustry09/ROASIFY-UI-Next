"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const ITEMS = [
  { href: "/dashboard", label: "Overview", Icon: GridIcon },
  { href: "/dashboard/connections", label: "Connections", Icon: PlugIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const navRef = useRef(null);
  const itemRefs = useRef([]);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });

  const activeIdx = Math.max(
    0,
    ITEMS.findIndex((i) => pathname === i.href)
  );

  useLayoutEffect(() => {
    const el = itemRefs.current[activeIdx];
    const parent = navRef.current;
    if (el && parent) {
      const pRect = parent.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      setIndicator({ top: eRect.top - pRect.top, height: eRect.height, ready: true });
    }
  }, [activeIdx]);

  return (
    <div className="w-[250px] shrink-0 p-3.5">
      <div
        className="flex h-[calc(100vh-28px)] flex-col rounded-[26px] p-4 pt-5 text-white shadow-[0_20px_40px_-20px_rgba(38,66,170,.45)]"
        style={{
          background: "linear-gradient(155deg, #B7E5F9 0%, #7C93D6 52%, #566CBD 100%)",
        }}
      >
        <div className="px-2.5 pb-3 text-[11px] font-bold uppercase tracking-[.09em] text-white/70">
          Workspace
        </div>

        <nav ref={navRef} className="relative">
          {indicator.ready && (
            <div
              className="absolute left-0 right-0 z-0 rounded-full bg-white shadow-[0_6px_16px_-6px_rgba(20,30,80,.35)] transition-[transform,height] duration-[380ms] ease-spring"
              style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height }}
            />
          )}
          {ITEMS.map(({ href, label, Icon }, i) => {
            const active = i === activeIdx;
            return (
              <Link
                key={href}
                href={href}
                ref={(el) => (itemRefs.current[i] = el)}
                className={`navitem relative z-10 mb-1 flex items-center gap-2.5 rounded-full px-3.5 py-2.5 text-[13.5px] font-semibold ${
                  active ? "text-navy" : "text-white/90 hover:bg-white/15"
                }`}
              >
                {!active && <Icon />}
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="px-2.5 pb-4 text-[11px] italic leading-[1.55] text-white/80">
          No data storage. All syncing happens through your own connected accounts —
          Roasify never resells or shares what it reads.
        </div>

        <div
          className="flex min-h-[74px] items-center rounded-[20px] px-4 py-5"
          style={{ background: "linear-gradient(160deg, #4E66B9, #93ABDE)" }}
        >
          <span
            className="text-[19px] font-normal tracking-[.01em] text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            roasify
          </span>
        </div>
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-90">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-90">
      <path
        d="M9 7V3M15 7V3M6 7h12l-1 5a5 5 0 0 1-10 0L6 7ZM12 16v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
