"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="pill flex items-center gap-1.5 rounded-full border border-line bg-white px-[15px] py-2 text-[12.5px] font-semibold text-navy hover:border-[#c9cee6] hover:shadow-[0_2px_8px_rgba(20,30,80,.06)]"
    >
      Sign out
    </button>
  );
}
