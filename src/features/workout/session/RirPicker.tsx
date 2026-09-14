"use client";

import { cn } from "@/lib/cn";

const OPTIONS = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3+" },
];

/** RIR = repetições na reserva. Opcional: tocar de novo desmarca. */
export function RirPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <div className="mb-1 text-center text-xs font-medium uppercase tracking-wider text-muted">RIR (reps na reserva)</div>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={cn(
              "h-12 rounded-xl border text-lg font-semibold transition active:scale-95",
              value === o.value ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface-2 text-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
