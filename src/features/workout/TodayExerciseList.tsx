"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { fmtRest } from "@/lib/format";
import { MUSCLE_LABEL } from "@/lib/labels";
import type { MuscleGroup } from "@/generated/prisma/enums";
import { fmtRepRange } from "./format";

export interface TodayExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  plannedSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
}

const PREVIEW = 4; // quantos exercícios mostrar antes do "ver mais"

/** Lista dos exercícios do treino de hoje, colapsada quando há muitos. */
export function TodayExerciseList({ exercises }: { exercises: TodayExercise[] }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = exercises.length > PREVIEW;
  const visible = expanded || !collapsible ? exercises : exercises.slice(0, PREVIEW);
  const hidden = exercises.length - visible.length;

  return (
    <div className="mb-4">
      <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {visible.map((e, i) => (
          <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{e.name}</span>
              <span className="text-xs text-muted">
                {MUSCLE_LABEL[e.muscleGroup]} · descanso {fmtRest(e.restSeconds)}
              </span>
            </span>
            <span className="tabular shrink-0 text-right text-sm">
              <span className="font-semibold">{e.plannedSets}×</span> {fmtRepRange(e.repMin, e.repMax)}
              <span className="block text-xs text-faint">reps</span>
            </span>
          </li>
        ))}
      </ol>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 py-2 text-sm font-medium text-muted hover:text-fg"
        >
          {expanded ? "Ver menos" : `Ver mais ${hidden} exercício${hidden > 1 ? "s" : ""}`}
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
