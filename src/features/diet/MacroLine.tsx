import type { Macros } from "@/lib/domain/types";
import { fmtInt } from "@/lib/format";

/** "550 kcal · P 32g · C 60g · G 20g" */
export function MacroLine({ m, className = "text-xs text-muted" }: { m: Macros; className?: string }) {
  return (
    <span className={`tabular ${className}`}>
      {fmtInt(m.kcal)} kcal · P {fmtInt(m.protein)}g · C {fmtInt(m.carbs)}g · G {fmtInt(m.fat)}g
    </span>
  );
}
