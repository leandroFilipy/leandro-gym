"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { compactImageSizes } from "@/lib/image";
import { analyzePlatePhotoAction, type PlateItem } from "@/server/actions/diet";
import type { MealType } from "@/generated/prisma/enums";
import { EstimateReview } from "./EstimateReview";

/** Foto do prato → IA estima itens e porções → usuário revisa e registra. */
export function PlatePhoto({ date, mealType, onDone }: { date: string; mealType: MealType; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ key: number; items: PlateItem[]; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setEstimate(null);
    startAnalyze(async () => {
      try {
        const [photo] = await compactImageSizes(file, [{ maxSide: 1024, quality: 0.8, maxChars: 900_000 }]);
        setPreview(photo);
        const r = await analyzePlatePhotoAction(photo);
        if (!r.ok) return setError(r.error);
        setEstimate({ key: Date.now(), ...r.data });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível ler a foto");
      }
    });
  };

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

      {estimate && (
        <EstimateReview
          key={estimate.key}
          items={estimate.items}
          note={estimate.note}
          label="Estimativa por foto"
          source="photo"
          date={date}
          mealType={mealType}
          onDone={onDone}
          retry={
            <Button variant="secondary" disabled={analyzing} onClick={() => input.current?.click()} aria-label="Tirar outra foto">
              <RotateCcw className="size-4" />
            </Button>
          }
        />
      )}

      {preview && !estimate && !analyzing && (
        <Button variant="secondary" onClick={() => input.current?.click()}>
          <Camera className="size-4" /> Tentar outra foto
        </Button>
      )}
    </div>
  );
}
