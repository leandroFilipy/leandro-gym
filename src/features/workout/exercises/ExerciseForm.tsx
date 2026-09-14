"use client";

import { useActionState, useEffect } from "react";
import { Field, FormError, SelectField, SubmitButton, TextArea } from "@/components/ui/Field";
import { MUSCLE_GROUPS, MUSCLE_LABEL } from "@/lib/labels";
import { createExerciseAction, updateExerciseAction } from "@/server/actions/exercises";
import type { MuscleGroup } from "@/generated/prisma/enums";

interface Props {
  exercise?: { id: string; name: string; muscleGroup: MuscleGroup; notes: string | null };
  onDone?: () => void;
}

export function ExerciseForm({ exercise, onDone }: Props) {
  const action = exercise ? updateExerciseAction.bind(null, exercise.id) : createExerciseAction;
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Nome" name="name" defaultValue={exercise?.name} placeholder="Ex.: Supino reto" required autoFocus={!exercise} />
      <SelectField label="Grupo muscular" name="muscleGroup" defaultValue={exercise?.muscleGroup ?? ""} required>
        <option value="" disabled>
          Escolha…
        </option>
        {MUSCLE_GROUPS.map((g) => (
          <option key={g} value={g}>
            {MUSCLE_LABEL[g]}
          </option>
        ))}
      </SelectField>
      <TextArea label="Observações" name="notes" defaultValue={exercise?.notes ?? ""} placeholder="Opcional" />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton size="lg" block>
        {exercise ? "Salvar" : "Criar exercício"}
      </SubmitButton>
    </form>
  );
}
