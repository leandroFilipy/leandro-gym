"use client";

import { useOptimistic, useTransition } from "react";
import { Droplets, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { addWaterAction } from "@/server/actions/water";

const fmtL = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L`;

/** Copo d'água: toques de +250/+500 ml com resposta imediata. */
export function WaterCard({ date, ml, goalMl, auto }: { date: string; ml: number; goalMl: number; auto: boolean }) {
  const [optimisticMl, addOptimistic] = useOptimistic(ml, (current, delta: number) => Math.max(0, current + delta));
  const [, start] = useTransition();
  const pct = Math.min(100, Math.round((optimisticMl / goalMl) * 100));
  const done = optimisticMl >= goalMl;

  const add = (delta: number) =>
    start(async () => {
      addOptimistic(delta);
      if (delta > 0) navigator.vibrate?.(20);
      await addWaterAction({ date, deltaMl: delta });
    });

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-sky-400/60 bg-surface-2" aria-hidden>
          <span className="absolute inset-x-0 bottom-0 bg-sky-400/70 transition-[height] duration-500" style={{ height: `${pct}%` }} />
          <Droplets className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-fg/80" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Água</div>
          <div className="font-display text-2xl font-extrabold italic leading-tight">
            {fmtL(optimisticMl)} <span className="text-base font-semibold text-muted">/ {fmtL(goalMl)}</span>
          </div>
          <p className={cn("text-xs", done ? "text-success" : "text-muted")}>
            {done ? "✅ Meta batida" : `Faltam ${fmtL(goalMl - optimisticMl)}`}
            {auto && !done && " · meta pelo seu peso"}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <button type="button" onClick={() => add(250)} className="h-11 rounded-xl bg-sky-400/15 font-semibold text-sky-300 active:scale-95">
          +250 ml
        </button>
        <button type="button" onClick={() => add(500)} className="h-11 rounded-xl bg-sky-400/15 font-semibold text-sky-300 active:scale-95">
          +500 ml
        </button>
        <button
          type="button"
          onClick={() => add(-250)}
          disabled={optimisticMl === 0}
          aria-label="Desfazer 250 ml"
          className="grid size-11 place-items-center rounded-xl border border-line text-muted disabled:opacity-40"
        >
          <Undo2 className="size-4" />
        </button>
      </div>
    </Card>
  );
}
