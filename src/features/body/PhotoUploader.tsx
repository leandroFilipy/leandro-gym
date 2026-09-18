"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { compactImageSizes } from "@/lib/image";
import { POSE_LABEL, POSES } from "@/lib/labels";
import { saveBodyPhotoAction } from "@/server/actions/body";
import type { PhotoPose } from "@/generated/prisma/enums";
import { GuidedCamera } from "./GuidedCamera";

/**
 * Escolhe data + pose e envia a foto (compactada no aparelho em 2 tamanhos). A câmera com guia
 * mostra a última foto da mesma pose por cima, para repetir posição e distância.
 */
export function PhotoUploader({ today, lastByPose }: { today: string; lastByPose: Partial<Record<PhotoPose, string>> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [pose, setPose] = useState<PhotoPose>("FRONT");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      setMessage(null);
      try {
        const [imageUrl, thumbUrl] = await compactImageSizes(file, [
          { maxSide: 1080, quality: 0.75, maxChars: 850_000 },
          { maxSide: 240, quality: 0.7, maxChars: 75_000 },
        ]);
        const r = await saveBodyPhotoAction({ date, pose, imageUrl, thumbUrl });
        setMessage(r.ok ? { tone: "ok", text: `Foto de ${POSE_LABEL[pose].toLowerCase()} salva.` } : { tone: "error", text: r.error });
      } catch (cause) {
        setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Não foi possível enviar a foto" });
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <span className="mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">Pose</span>
          <div className="grid h-11 grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
            {POSES.map((p) => (
              <button key={p} type="button" onClick={() => setPose(p)} className={cn("rounded-sm text-sm", p === pose ? "bg-surface font-semibold" : "text-muted")}>
                {POSE_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button size="lg" disabled={pending} onClick={() => setCameraOpen(true)}>
          <Camera className="size-5" /> {pending ? "Enviando…" : lastByPose[pose] ? "Câmera com guia" : "Tirar foto"}
        </Button>
        <Button size="lg" variant="secondary" disabled={pending} onClick={() => inputRef.current?.click()} aria-label="Escolher foto da galeria">
          <ImageIcon className="size-5" />
        </Button>
      </div>
      {cameraOpen && (
        <GuidedCamera
          ghostUrl={lastByPose[pose] ?? null}
          poseLabel={POSE_LABEL[pose]}
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            upload(file);
          }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      {message && <p className={cn("text-sm", message.tone === "ok" ? "text-success" : "text-danger")}>{message.text}</p>}
      <p className="text-xs text-faint">Dica: mesma luz, mesmo lugar e mesma distância. As fotos ficam só na sua conta.</p>
    </div>
  );
}
