"use client";

import { useRef, useState } from "react";
import { Camera, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { compactImage } from "@/lib/image";

export function FoodPhotoField({ initialValue }: { initialValue?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-line bg-surface-2/50 p-3">
      <input type="hidden" name="imageUrl" value={value} />
      <div className="flex items-center gap-3">
        <div
          className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-bg bg-cover bg-center text-faint"
          style={value ? { backgroundImage: `url(${JSON.stringify(value)})` } : undefined}
          aria-label={value ? "Prévia da foto do alimento" : "Alimento sem foto"}
        >
          {!value && <Camera className="size-6" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Camera className="size-4" /> Escolher foto
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => setValue("")}>
                <Trash2 className="size-4" /> Remover
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <Link2 className="size-3.5 shrink-0" />
            <input
              type="url"
              value={value.startsWith("data:") ? "" : value}
              onChange={(event) => {
                setError(null);
                setValue(event.target.value);
              }}
              placeholder="ou cole o link da imagem"
              className="min-w-0 flex-1 border-b border-line bg-transparent py-1 outline-none focus:border-accent"
            />
          </label>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            setError(null);
            setValue(await compactImage(file));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Não foi possível processar a foto");
          } finally {
            event.target.value = "";
          }
        }}
      />
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-[11px] text-faint">A foto é reduzida automaticamente antes de ser salva.</p>
    </div>
  );
}
