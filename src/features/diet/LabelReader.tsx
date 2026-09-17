"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, ScanText } from "lucide-react";
import { compactImageSizes } from "@/lib/image";
import type { FoodPrefill } from "@/lib/domain/barcode";
import { readNutritionLabelAction } from "@/server/actions/diet";

/** Foto da tabela nutricional → IA lê os valores → pré-preenche o cadastro. */
export function LabelReader({ onRead }: { onRead: (prefill: FoodPrefill) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reading, start] = useTransition();

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setDone(false);
    start(async () => {
      try {
        // Resolução maior que a do prato: números pequenos precisam continuar legíveis.
        const [photo] = await compactImageSizes(file, [{ maxSide: 1600, quality: 0.85, maxChars: 900_000 }]);
        const r = await readNutritionLabelAction(photo);
        if (!r.ok) return setError(r.error);
        onRead(r.data);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível ler a foto");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
      <button
        type="button"
        disabled={reading}
        onClick={() => input.current?.click()}
        className="flex items-center gap-3 rounded-2xl border border-dashed border-accent/60 px-3 py-3 text-left hover:border-accent disabled:opacity-60"
      >
        {reading ? <Loader2 className="size-6 shrink-0 animate-spin text-accent" /> : <ScanText className="size-6 shrink-0 text-accent" />}
        <span className="flex flex-col">
          <span className="text-sm font-semibold">{reading ? "Lendo a tabela…" : "Preencher pela foto da tabela nutricional"}</span>
          <span className="text-xs text-muted">Foto de perto, reta e com boa luz. A IA preenche calorias e macros.</span>
        </span>
      </button>
      {done && <p className="text-xs text-muted">Valores preenchidos pela IA — confira com o rótulo antes de salvar.</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
