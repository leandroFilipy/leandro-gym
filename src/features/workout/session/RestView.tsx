"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fmtClock, fmtNumber } from "@/lib/format";
import { beep, notify, vibrate } from "./alerts";

export interface RestState {
  endAt: number; // timestamp — resiste ao app ir para segundo plano
  total: number;
  next: { name: string; weight: number; reps: number; range: string; setLabel: string };
}

interface Props {
  rest: RestState;
  sound: boolean;
  vibration: boolean;
  onAdd: (seconds: number) => void;
  onDone: () => void;
}

export function RestView({ rest, sound, vibration, onAdd, onDone }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef({ rest, sound, vibration, onDone });
  useEffect(() => {
    latest.current = { rest, sound, vibration, onDone };
  });

  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const { rest: r, sound: s, vibration: v, onDone: done } = latest.current;
      if (t >= r.endAt) {
        if (v) vibrate();
        if (s) beep();
        if (document.visibilityState !== "visible") void notify("Descanso terminado 💪", `${r.next.name} — ${r.next.setLabel}`);
        done();
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, (rest.endAt - now) / 1000);
  const progress = rest.total > 0 ? remaining / rest.total : 0;
  const R = 110;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-6 py-4">
      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Descanso</div>

      <div className="relative flex items-center justify-center">
        <svg width="260" height="260" viewBox="0 0 260 260" className="-rotate-90" aria-hidden>
          <circle cx="130" cy="130" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="12" />
          <circle
            cx="130"
            cy="130"
            r={R}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: "stroke-dashoffset 250ms linear" }}
          />
        </svg>
        <div className="tabular absolute text-6xl font-bold" role="timer" aria-live="off">
          {fmtClock(remaining)}
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={() => onAdd(30)}>
          +30 segundos
        </Button>
        <Button variant="secondary" size="lg" onClick={onDone}>
          Pular
        </Button>
      </div>

      <div className="w-full rounded-3xl border border-line bg-surface p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Próximo · {rest.next.setLabel}</div>
        <div className="mt-1 text-xl font-bold">{rest.next.name}</div>
        <div className="tabular mt-1 text-muted">
          <span className="text-2xl font-bold text-fg">{fmtNumber(rest.next.weight)}kg</span> · {rest.next.reps} reps · meta {rest.next.range}
        </div>
      </div>
    </div>
  );
}
