"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  unit?: string;
  decimals?: number;
  size?: "md" | "lg";
}

/** +/- grandes para uso com uma mão. Tocar no número permite digitar. */
export function Stepper({ label, value, onChange, step, min = 0, max = 9999, unit, decimals = 2, size = "lg" }: Props) {
  const [editing, setEditing] = useState(false);
  const clamp = (v: number) => Math.min(max, Math.max(min, Number(v.toFixed(decimals))));
  const display = value.toLocaleString("pt-BR", { maximumFractionDigits: decimals });
  const btn = cn(
    "flex shrink-0 items-center justify-center rounded-lg bg-surface-2 border border-line text-fg active:bg-line active:scale-95 transition",
    size === "lg" ? "size-16" : "size-12",
  );

  return (
    <div>
      <div className="mb-1 text-center font-display text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Diminuir ${label}`} className={btn} onClick={() => onChange(clamp(value - step))}>
          <Minus className="size-6" />
        </button>
        {editing ? (
          <input
            autoFocus
            inputMode="decimal"
            defaultValue={String(value)}
            className={cn("tabular w-full min-w-0 rounded-lg bg-surface-2 text-center font-display font-bold outline-none ring-2 ring-accent", size === "lg" ? "h-16 text-5xl" : "h-12 text-3xl")}
            onBlur={(e) => {
              const n = Number(e.target.value.replace(",", "."));
              if (!Number.isNaN(n)) onChange(clamp(n));
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn("tabular flex-1 min-w-0 truncate text-center font-display font-bold", size === "lg" ? "text-6xl" : "text-4xl")}
            aria-label={`${label}: ${display}. Toque para digitar`}
          >
            {display}
            {unit && <span className="ml-1 text-lg font-medium text-muted">{unit}</span>}
          </button>
        )}
        <button type="button" aria-label={`Aumentar ${label}`} className={btn} onClick={() => onChange(clamp(value + step))}>
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  );
}
