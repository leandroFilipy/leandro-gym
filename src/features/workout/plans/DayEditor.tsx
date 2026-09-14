"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { DAY_TYPE_LABEL } from "@/lib/labels";
import { addDayExerciseAction, updateDayAction } from "@/server/actions/plans";
import type { DayType } from "@/generated/prisma/enums";
import { ExercisePickerSheet, type LibraryExercise } from "../session/AddExerciseSheet";
import { DayExerciseRow, type DayExerciseRowData } from "./DayExerciseRow";

interface Props {
  day: { id: string; name: string; type: DayType; exercises: DayExerciseRowData[] };
  library: LibraryExercise[];
}

const TYPES: DayType[] = ["WORKOUT", "CARDIO", "REST"];

export function DayEditor({ day, library }: Props) {
  const [name, setName] = useState(day.name);
  const [type, setType] = useState<DayType>(day.type);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = name !== day.name || type !== day.type;

  const save = () =>
    start(async () => {
      const r = await updateDayAction(day.id, { name, type });
      setError(r.ok ? null : r.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do treino (ex.: Peito + Tríceps)"
          aria-label="Nome do treino"
          className="h-12 rounded-xl border border-line bg-surface-2 px-3 text-lg font-semibold outline-none focus:border-accent"
        />
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                if (t === "REST" && name === day.name) setName("Descanso");
              }}
              className={cn("h-10 rounded-xl border text-sm font-medium", type === t ? "border-accent bg-accent/10 text-accent" : "border-line text-muted")}
            >
              {DAY_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {dirty && (
          <Button onClick={save} disabled={pending}>
            Salvar dia
          </Button>
        )}
      </Card>

      {type !== "REST" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Exercícios</h2>
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
          {day.exercises.length === 0 ? (
            <EmptyState title="Nenhum exercício" text="Adicione os exercícios na ordem em que você faz." />
          ) : (
            <ul className="flex flex-col gap-2">
              {day.exercises.map((e, i) => (
                <DayExerciseRow key={e.id} item={e} index={i} isFirst={i === 0} isLast={i === day.exercises.length - 1} />
              ))}
            </ul>
          )}
        </>
      )}

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        library={library}
        exclude={day.exercises.map((e) => e.exerciseId)}
        onPick={(exerciseId) => addDayExerciseAction(day.id, exerciseId)}
      />
    </div>
  );
}
