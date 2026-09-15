import { cn } from "@/lib/cn";
import { fmtInt } from "@/lib/format";

interface Props {
  label: string;
  value: number;
  max: number | null | undefined;
  unit?: string;
  className?: string;
}

export function ProgressBar({ label, value, max, unit = "", className }: Props) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const over = max ? value > max * 1.05 : false;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular">
          <span className="font-semibold">{fmtInt(value)}</span>
          {max ? <span className="text-muted"> / {fmtInt(max)}{unit}</span> : <span className="text-muted">{unit}</span>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden bg-surface-2" role="progressbar" aria-valuenow={value} aria-valuemax={max ?? undefined}>
        <div className={cn("h-full transition-all", over ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
