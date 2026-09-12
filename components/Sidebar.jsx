"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/connections", label: "Connections" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col justify-between border-r border-line bg-ink2 p-6">
      <div>
        <span className="font-mono text-sm tracking-tight text-mist">roasify</span>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-ink3 text-paper"
                    : "text-mist hover:bg-ink3/60 hover:text-paper"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
