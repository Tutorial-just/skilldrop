"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

type BookingCountdownProps = {
  expiresAt: string;
};

export function BookingCountdown({ expiresAt }: BookingCountdownProps) {
  const targetTime = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);

  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(targetTime - Date.now(), 0),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingMs(Math.max(targetTime - Date.now(), 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [targetTime]);

  const minutes = Math.floor(remainingMs / 1000 / 60);
  const seconds = Math.floor((remainingMs / 1000) % 60);

  const formatted = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4 text-[var(--warning)]">
      <div className="flex items-center gap-3">
        <Clock3 size={18} />
        <p className="text-sm font-black">
          Reserved for {formatted}. Complete payment before this time runs out.
        </p>
      </div>
    </div>
  );
}