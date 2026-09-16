"use client";

import { useEffect, useState } from "react";
import { elapsedSeconds } from "@/lib/domain/session-timing";

interface Props {
  since: string; // startedAt ISO
  pausedSeconds?: number;
  pausedAt?: string | null; // ISO quando pausado
}

export function Elapsed({ since, pausedSeconds = 0, pausedAt = null }: Props) {
  const startedAtMs = new Date(since).getTime();
  const pausedAtMs = pausedAt ? new Date(pausedAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Não precisa "tiquetaquear" enquanto pausado (o valor fica congelado).
    if (pausedAtMs != null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pausedAtMs]);

  const s = elapsedSeconds({ startedAtMs, pausedSeconds, pausedAtMs }, now);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular" suppressHydrationWarning>
      {h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`}
    </span>
  );
}
