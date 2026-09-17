"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { sumMacros } from "@/lib/domain/nutrition";
import { compactImageSizes } from "@/lib/image";
import { analyzePlatePhotoAction, logPlateItemsAction, type PlateItem } from "@/server/actions/diet";
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

/** Foto do prato → IA estima itens e porções → usuário revisa e registra. */
export function PlatePhoto({ date, mealType, onDone }: { date: string; mealType: MealType; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setRows(null);
    startAnalyze(async () => {
      try {
        const [photo] = await compactImageSizes(file, [{ maxSide: 1024, quality: 0.8, maxChars: 900_000 }]);
        setPreview(photo);
        const r = await analyzePlatePhotoAction(photo);
        if (!r.ok) return setError(r.error);
        setRows(r.data.items.map((i) => ({ ...i, selected: true, baseGrams: i.grams })));
        setNote(r.data.note);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível ler a foto");
      }
    });
  };

  const update = (i: number, patch: Partial<Row>) => setRows((list) => list && list.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const selected = rows?.filter((r) => r.selected && r.grams > 0) ?? [];
  const totals = sumMacros(selected.map(scaled));

  const save = () =>
    startSave(async () => {
      const r = await logPlateItemsAction({
        date,
        mealType,
        items: selected.map((row) => ({ name: row.name, grams: row.grams, ...scaled(row) })),
      });
      if (!r.ok) return setError(r.error);
      onDone();
    });

  return (
    <div className="flex flex-col gap-3">
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />

      {!preview && !analyzing && (
        <button type="button" onClick={() => input.current?.click()} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center hover:border-accent">
          <Camera className="size-8 text-accent" />
          <span className="font-semibold">Tirar foto do prato</span>
          <span className="text-xs text-muted">Foto de cima, com o prato inteiro e boa luz. A IA estima os alimentos e as porções.</span>
        </button>
      )}

      {preview && (
        <div className="relative overflow-hidden rounded-2xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL local */}
          <img src={preview} alt="Foto do prato" className="max-h-56 w-full object-cover" />
          {analyzing && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm">
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Analisando o prato…</span>
            </div>
          )}
        </div>
      )}
      {analyzing && !preview && (
        <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Preparando a foto…</p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {rows && (
        <>
          <p className="rounded-md border-l-4 border-warn bg-warn/10 px-3 py-2 text-xs text-muted">
            Estimativa por foto — confira as porções. {note}
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
          <div className="flex gap-2">
            <Button variant="secondary" disabled={analyzing || saving} onClick={() => input.current?.click()} aria-label="Tirar outra foto">
              <RotateCcw className="size-4" />
            </Button>
            <Button size="lg" className="flex-1" disabled={saving || selected.length === 0} onClick={save}>
              {saving ? "Registrando…" : `Registrar ${selected.length} ${selected.length === 1 ? "item" : "itens"}`}
            </Button>
          </div>
        </>
      )}

      {preview && !rows && !analyzing && (
        <Button variant="secondary" onClick={() => input.current?.click()}>
          <Camera className="size-4" /> Tentar outra foto
        </Button>
      )}
    </div>
  );
}
