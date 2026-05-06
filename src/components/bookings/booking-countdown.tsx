"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

type BookingCountdownProps = {
  expiresAt: string;
};

function getRemainingMs(targetTime: number) {
  return Math.max(targetTime - Date.now(), 0);
}

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function BookingCountdown({ expiresAt }: BookingCountdownProps) {
  const targetTime = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);

  const [remainingMs, setRemainingMs] = useState(() =>
    Number.isFinite(targetTime) ? getRemainingMs(targetTime) : 0,
  );

  useEffect(() => {
    if (!Number.isFinite(targetTime)) {
      setRemainingMs(0);
      return;
    }

    const updateRemainingTime = () => {
      const nextRemainingMs = getRemainingMs(targetTime);

      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0) {
        window.clearInterval(interval);
      }
    };

    const interval = window.setInterval(updateRemainingTime, 1000);

    updateRemainingTime();

    return () => window.clearInterval(interval);
  }, [targetTime]);

  const isExpired = remainingMs <= 0;
  const formatted = formatRemainingTime(remainingMs);

  if (isExpired) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-[var(--danger)]">
        <div className="flex items-center gap-3">
          <Clock3 size={18} />
          <p className="text-sm font-black leading-6">
            This reservation has expired. The slot may be available to other
            clients now. Please go back and choose a new time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4 text-[var(--warning)]">
      <div className="flex items-center gap-3">
        <Clock3 size={18} />
        <p className="text-sm font-black leading-6">
          Reserved for {formatted}. Complete payment before this time runs out.
        </p>
      </div>
    </div>
  );
}