"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { sumMacros } from "@/lib/domain/nutrition";
import { logPlateItemsAction, type PlateItem } from "@/server/actions/diet";
import type { MealType } from "@/generated/prisma/enums";
import { MacroLine } from "./MacroLine";

interface Row extends PlateItem {
  selected: boolean;
  /** Gramas originais da estimativa: base para reescalar os macros ao editar a porção. */
  baseGrams: number;
}

const CONFIDENCE_TONE = { alta: "success", media: "warn", baixa: "danger" } as const;

function scaled(r: Row) {
  const k = r.baseGrams > 0 ? r.grams / r.baseGrams : 0;
  return { kcal: r.kcal * k, protein: r.protein * k, carbs: r.carbs * k, fat: r.fat * k };
}

interface Props {
  items: PlateItem[];
  note: string;
  /** Aviso no topo, ex.: "Estimativa por foto". */
  label: string;
  source: "photo" | "text";
  date: string;
  mealType: MealType;
  onDone: () => void;
  /** Botão ao lado de "Registrar" (tirar outra foto, falar de novo…). */
  retry: ReactNode;
}

/** Itens estimados pela IA: o usuário marca, ajusta nome/gramas e registra. */
export function EstimateReview({ items, note, label, source, date, mealType, onDone, retry }: Props) {
  const [rows, setRows] = useState<Row[]>(() => items.map((i) => ({ ...i, selected: true, baseGrams: i.grams })));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const update = (i: number, patch: Partial<Row>) => setRows((list) => list.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const selected = rows.filter((r) => r.selected && r.grams > 0);
  const totals = sumMacros(selected.map(scaled));

  const save = () =>
    startSave(async () => {
      const r = await logPlateItemsAction({
        date,
        mealType,
        source,
        items: selected.map((row) => ({ name: row.name, grams: row.grams, ...scaled(row) })),
      });
      if (!r.ok) return setError(r.error);
      onDone();
    });

  return (
    <>
      <p className="rounded-md border-l-4 border-warn bg-warn/10 px-3 py-2 text-xs text-muted">
        {label} — confira as porções. {note}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={i} className={cn("rounded-2xl border p-3", r.selected ? "border-line" : "border-line/50 opacity-50")}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={r.selected} onChange={(e) => update(i, { selected: e.target.checked })} className="size-4 accent-[var(--color-accent)]" aria-label={`Incluir ${r.name}`} />
              <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2 text-sm outline-none focus:border-accent" aria-label="Nome" />
              <Badge tone={CONFIDENCE_TONE[r.confidence]}>{r.confidence === "media" ? "média" : r.confidence}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={r.grams || ""}
                  onChange={(e) => update(i, { grams: Math.max(0, Number(e.target.value) || 0) })}
                  className="tabular h-9 w-20 rounded-lg border border-line bg-surface-2 px-2 text-right outline-none focus:border-accent"
                  aria-label="Gramas"
                />
                g
              </label>
              <MacroLine m={scaled(r)} />
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-surface-2 p-3 text-center">
        <MacroLine m={totals} className="text-sm" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        {retry}
        <Button size="lg" className="flex-1" disabled={saving || selected.length === 0} onClick={save}>
          {saving ? "Registrando…" : `Registrar ${selected.length} ${selected.length === 1 ? "item" : "itens"}`}
        </Button>
      </div>
    </>
  );
}
