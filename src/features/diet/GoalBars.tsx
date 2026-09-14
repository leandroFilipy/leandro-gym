import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Macros } from "@/lib/domain/types";

interface Goal {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function GoalBars({ totals, goal, compact }: { totals: Macros; goal: Goal | null; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <ProgressBar label="Calorias" value={totals.kcal} max={goal?.kcal} unit=" kcal" />
      <ProgressBar label="Proteína" value={totals.protein} max={goal?.protein} unit="g" />
      {!compact && (
        <>
          <ProgressBar label="Carboidratos" value={totals.carbs} max={goal?.carbs} unit="g" />
          <ProgressBar label="Gorduras" value={totals.fat} max={goal?.fat} unit="g" />
        </>
      )}
    </div>
  );
}
