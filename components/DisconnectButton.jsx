"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisconnectButton({ id }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="text-[11.5px] font-semibold text-red hover:underline disabled:opacity-50"
    >
      {busy ? "Removing..." : "Disconnect"}
    </button>
  );
}
