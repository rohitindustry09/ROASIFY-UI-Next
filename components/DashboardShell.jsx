"use client";

import { DataProvider } from "@/state/DataContext";
import Sidebar from "@/components/Sidebar";
import SignOutButton from "@/components/SignOutButton";

export default function DashboardShell({ email, children }) {
  return (
    <DataProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-[5] flex animate-fadeIn items-center justify-between px-7 py-4">
            <span className="text-[12.5px] text-text-dim">{email}</span>
            <SignOutButton />
          </header>
          <main className="max-w-[1400px] px-7 pb-16">{children}</main>
        </div>
      </div>
    </DataProvider>
  );
}
