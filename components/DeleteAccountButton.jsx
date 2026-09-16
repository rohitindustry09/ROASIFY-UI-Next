"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      router.push("/login");
      router.refresh();
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-[12.5px] font-semibold text-red hover:underline"
      >
        Delete my account and data
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#FECACA] bg-red-bg p-4">
      <p className="mb-3 text-[12.5px] leading-relaxed text-navy">
        This removes every connected platform and ends your session immediately. This can't be
        undone — you'd need to sign in and reconnect everything from scratch.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={busy}
          className="rounded-full bg-red px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Deleting..." : "Yes, delete everything"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-full border border-line bg-white px-4 py-2 text-[12px] font-semibold text-navy"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
