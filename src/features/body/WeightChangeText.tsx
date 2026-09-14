import { cn } from "@/lib/cn";
import { fmtSigned } from "@/lib/format";

/** Variação de peso colorida de forma neutra (subir/descer não é bom nem ruim por si só). */
export function WeightChangeText({ change, className }: { change: number | null; className?: string }) {
  if (change === null) return <span className={cn("text-muted", className)}>—</span>;
  return <span className={cn("tabular", Math.abs(change) < 0.05 ? "text-muted" : "text-fg", className)}>{fmtSigned(change, 1)} kg</span>;
}
