"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fmtRest } from "@/lib/format";
import { moveDayExerciseAction, removeDayExerciseAction, updateDayExerciseAction } from "@/server/actions/plans";

export interface DayExerciseRowData {
  id: string;
  exerciseId: string;
  name: string;
  plannedSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes: string;
}

const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

function NumBox({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular h-11 w-full rounded-xl border border-line bg-surface-2 text-center text-lg font-semibold outline-none focus:border-accent"
      />
    </label>
  );
}

export function DayExerciseRow({ item, index, isFirst, isLast }: { item: DayExerciseRowData; index: number; isFirst: boolean; isLast: boolean }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty =
    v.plannedSets !== item.plannedSets || v.repMin !== item.repMin || v.repMax !== item.repMax || v.restSeconds !== item.restSeconds || v.notes !== item.notes;

  const save = () =>
    start(async () => {
      const r = await updateDayExerciseAction(item.id, v);
      setError(r.ok ? null : r.error);
    });

  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm text-muted">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
          <button type="button" aria-label="Subir" disabled={isFirst || pending} onClick={() => start(async () => void (await moveDayExerciseAction(item.id, "up")))} className="rounded-lg p-2 text-muted hover:bg-surface-2 disabled:opacity-30">
            <ArrowUp className="size-4" />
          </button>
          <button type="button" aria-label="Descer" disabled={isLast || pending} onClick={() => start(async () => void (await moveDayExerciseAction(item.id, "down")))} className="rounded-lg p-2 text-muted hover:bg-surface-2 disabled:opacity-30">
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Remover"
            disabled={pending}
            onClick={() => confirm(`Remover ${item.name} deste dia?`) && start(async () => void (await removeDayExerciseAction(item.id)))}
            className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <NumBox label="Séries" value={v.plannedSets} onChange={(plannedSets) => setV({ ...v, plannedSets })} />
          <NumBox label="Reps mín" value={v.repMin} onChange={(repMin) => setV({ ...v, repMin })} />
          <NumBox label="Reps máx" value={v.repMax} onChange={(repMax) => setV({ ...v, repMax })} />
          <label className="flex flex-col items-center gap-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">Descanso</span>
            <select
              value={v.restSeconds}
              onChange={(e) => setV({ ...v, restSeconds: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border border-line bg-surface-2 text-center text-sm font-semibold outline-none focus:border-accent"
            >
              {[...new Set([...REST_OPTIONS, v.restSeconds])].sort((a, b) => a - b).map((s) => (
                <option key={s} value={s}>
                  {fmtRest(s)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input
          value={v.notes}
          onChange={(e) => setV({ ...v, notes: e.target.value })}
          placeholder="Observações (ex.: pegada fechada)"
          className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {dirty && (
          <Button size="sm" onClick={save} disabled={pending}>
            Salvar alterações
          </Button>
        )}
      </Card>
    </li>
  );
}
