"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/Field";
import { saveGoalAction } from "@/server/actions/diet";

interface Goal {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function GoalForm({ goal }: { goal: Goal | null }) {
  const [state, action] = useActionState(saveGoalAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorias (kcal)" name="kcal" type="number" inputMode="numeric" defaultValue={goal?.kcal ?? 2500} required />
        <Field label="Proteína (g)" name="protein" type="number" inputMode="numeric" defaultValue={goal?.protein ?? 160} required />
        <Field label="Carboidratos (g)" name="carbs" type="number" inputMode="numeric" defaultValue={goal?.carbs ?? 280} required />
        <Field label="Gorduras (g)" name="fat" type="number" inputMode="numeric" defaultValue={goal?.fat ?? 70} required />
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      {state?.ok && <p className="text-sm text-success">✓ Meta salva (vale a partir de hoje)</p>}
      <SubmitButton block>Salvar metas</SubmitButton>
    </form>
  );
}
