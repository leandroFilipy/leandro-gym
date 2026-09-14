"use client";

import { Lightbulb, X } from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { fmtDayMonth, fmtRest } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { GymExercise } from "@/server/services/workouts";
import { fmtRepRange, fmtSet } from "../format";
import { RirPicker } from "./RirPicker";

export interface Draft {
  weight: number;
  reps: number;
  rir: number | null;
}

interface Props {
  exercise: GymExercise;
  draft: Draft;
  onDraft: (d: Draft) => void;
  weightStep: number;
  onRemoveSet: (setId: string) => void;
}

const suggestionTone = {
  increase: "border-success/30 bg-success/10 text-success",
  decrease: "border-warn/30 bg-warn/10 text-warn",
  maintain: "border-line bg-surface text-muted",
  none: "border-line bg-surface text-muted",
} as const;

export function SetLogger({ exercise, draft, onDraft, weightStep, onRemoveSet }: Props) {
  const setNumber = exercise.sets.length + 1;
  const extra = setNumber > exercise.plannedSets;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold leading-tight">{exercise.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Meta <span className="font-semibold text-fg">{fmtRepRange(exercise.repMin, exercise.repMax)}</span> · {exercise.plannedSets} séries ·
          descanso {fmtRest(exercise.restSeconds)}
        </p>
        {exercise.notes && <p className="mt-1 text-sm text-faint">📝 {exercise.notes}</p>}
      </div>

      {exercise.previous && (
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Último treino · {fmtDayMonth(exercise.previous.date)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exercise.previous.sets.map((s, i) => (
              <span key={i} className="tabular rounded-lg bg-surface-2 px-2 py-1 text-sm">
                {fmtSet(s)}
              </span>
            ))}
          </div>
        </div>
      )}

      {exercise.suggestion.action !== "none" && exercise.sets.length === 0 && (
        <div className={cn("flex items-start gap-2 rounded-2xl border p-3 text-sm", suggestionTone[exercise.suggestion.action])}>
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          {exercise.suggestion.message}
        </div>
      )}

      {exercise.sets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {exercise.sets.map((s, i) => (
            <span key={s.id} className="tabular inline-flex items-center gap-1 rounded-lg bg-accent/10 py-1 pl-2 pr-1 text-sm text-accent">
              <span className="text-faint">{i + 1}.</span> {fmtSet(s)}
              {s.rir !== null && <span className="text-xs text-faint">RIR {s.rir === 3 ? "3+" : s.rir}</span>}
              <button
                type="button"
                aria-label={`Apagar série ${i + 1}`}
                className="rounded p-0.5 text-faint hover:text-danger"
                onClick={() => confirm(`Apagar a série ${i + 1}?`) && onRemoveSet(s.id)}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted">
        Série {setNumber} {extra ? "(extra)" : `de ${exercise.plannedSets}`}
      </div>

      <Stepper label="Carga" unit="kg" value={draft.weight} step={weightStep} onChange={(weight) => onDraft({ ...draft, weight })} />
      <Stepper label="Repetições" value={draft.reps} step={1} decimals={0} max={200} onChange={(reps) => onDraft({ ...draft, reps })} />
      <RirPicker value={draft.rir} onChange={(rir) => onDraft({ ...draft, rir })} />
    </div>
  );
}
