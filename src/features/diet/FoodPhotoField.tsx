"use client";

import { useRef, useState } from "react";
import { Camera, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 720;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compactImage(file: File) {
  if (file.size > MAX_FILE_BYTES) throw new Error("Escolha uma foto de até 8 MB");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível processar a foto");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
