"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { GymExercise } from "@/server/services/workouts";

interface Props {
  exercises: GymExercise[];
  current: number;
  onSelect: (i: number) => void;
}

export function ExerciseChips({ exercises, current, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(`[data-i="${current}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [current]);

  return (
    <div ref={ref} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {exercises.map((e, i) => {
        const done = e.sets.length >= e.plannedSets;
        return (
          <button
            key={e.id}
            data-i={i}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
              i === current ? "border-accent bg-accent/10 text-fg" : "border-line text-muted",
              done && i !== current && "text-success",
            )}
          >
            {done && <Check className="size-3.5" />}
            <span className="max-w-32 truncate">{e.name}</span>
            <span className="tabular text-xs text-faint">
              {e.sets.length}/{e.plannedSets}
            </span>
          </button>
        );
      })}
    </div>
  );
}
