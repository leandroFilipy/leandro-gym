import { CardHeader } from "@/components/ui/Card";
import type { NutritionGoalBreakdown } from "@/lib/domain/energy";
import { fmtInt } from "@/lib/format";

const ACTIVITY_LABEL: Record<string, string> = {
  SEDENTARY: "Sedentário",
  LIGHT: "Leve",
  MODERATE: "Moderado",
  ACTIVE: "Ativo",
  VERY_ACTIVE: "Muito ativo",
};

const GOAL_LABEL: Record<string, string> = {
  LOSE: "perder gordura",
  MAINTAIN: "manter o peso",
  GAIN: "ganhar massa",
};

interface Props {
  breakdown: NutritionGoalBreakdown | null;
  weightKg: number | null;
  activityLevel: string;
  dietGoal: string;
  missing: string[]; // campos que faltam para calcular
}

/** Mostra o cálculo automático (TMB → TDEE → meta) para o usuário conferir. */
export function AutoGoalPreview({ breakdown, weightKg, activityLevel, dietGoal, missing }: Props) {
  if (missing.length > 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-3 text-sm text-muted">
        Para calcular automaticamente, preencha: <strong className="text-fg">{missing.join(", ")}</strong> e registre seu peso.
      </div>
    );
  }
  if (!breakdown) return null;

  const { bmr, tdee, goal } = breakdown;

  return (
    <div className="flex flex-col gap-3">
      <CardHeader title="Meta calculada automaticamente" />
      <p className="text-xs text-muted">
        Com base em {weightKg ? `${weightKg} kg` : "seu peso"}, nível {ACTIVITY_LABEL[activityLevel] ?? activityLevel} e objetivo de{" "}
        {GOAL_LABEL[dietGoal] ?? dietGoal}. Recalcula sozinho quando você registra um novo peso.
      </p>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-surface-2 p-2">
          <div className="tabular text-lg font-bold">{fmtInt(bmr)}</div>
          <div className="text-xs text-muted">TMB (repouso)</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <div className="tabular text-lg font-bold">{fmtInt(tdee)}</div>
          <div className="text-xs text-muted">Gasto diário (TDEE)</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-surface-2 p-2">
          <div className="tabular font-bold">{fmtInt(goal.kcal)}</div>
          <div className="text-xs text-muted">kcal</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <div className="tabular font-bold">{fmtInt(goal.protein)}</div>
          <div className="text-xs text-muted">Prot (g)</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <div className="tabular font-bold">{fmtInt(goal.carbs)}</div>
          <div className="text-xs text-muted">Carb (g)</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <div className="tabular font-bold">{fmtInt(goal.fat)}</div>
          <div className="text-xs text-muted">Gord (g)</div>
        </div>
      </div>
    </div>
  );
}
