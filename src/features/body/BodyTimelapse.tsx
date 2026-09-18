"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pause, Play, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { daysBetween } from "@/lib/dates";
import { fmtFullDate } from "@/lib/format";
import { POSE_LABEL, POSES } from "@/lib/labels";
import type { PhotoPose } from "@/generated/prisma/enums";

export type TimelapseFrame = { id: string; date: string };

const SPEEDS = [
  { label: "Lento", ms: 900 },
  { label: "Normal", ms: 500 },
  { label: "Rápido", ms: 250 },
] as const;

const urlOf = (f: TimelapseFrame) => `/api/body-photos/${f.id}?size=full`;

/** Fotos da mesma pose em sequência (mais antiga → mais recente), como um vídeo da evolução. */
export function BodyTimelapse({ framesByPose }: { framesByPose: Record<PhotoPose, TimelapseFrame[]> }) {
  const poses = POSES.filter((p) => framesByPose[p].length >= 2);
  const [pose, setPose] = useState<PhotoPose>(poses[0] ?? "FRONT");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[1].ms);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frames = useMemo(() => framesByPose[pose] ?? [], [framesByPose, pose]);
  const current = frames[Math.min(index, frames.length - 1)];

  // Pré-carrega as fotos da pose para a animação não piscar.
  useEffect(() => {
    for (const f of frames) new Image().src = urlOf(f);
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (index >= frames.length - 1) return setPlaying(false);
      setIndex(index + 1);
    }, speed);
    return () => clearTimeout(t);
  }, [playing, index, frames.length, speed]);

  if (poses.length === 0 || !current) return null;

  const first = frames[0];
  const elapsed = daysBetween(first.date, current.date);

  const togglePlay = () => {
    if (!playing && index >= frames.length - 1) setIndex(0);
    setPlaying(!playing);
  };

  const share = async () => {
    setError(null);
    setExporting(true);
    try {
      const file = await renderVideo(frames, speed);
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Minha evolução" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Não foi possível gerar o vídeo");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {poses.length > 1 && (
        <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
          {POSES.map((p) => (
            <button
              key={p}
              type="button"
              disabled={framesByPose[p].length < 2}
              onClick={() => {
                setPose(p);
                setIndex(0);
                setPlaying(false);
              }}
              className={cn("h-9 rounded-sm text-sm disabled:opacity-40", p === pose ? "bg-surface font-semibold" : "text-muted")}
            >
              {POSE_LABEL[p]} ({framesByPose[p].length})
            </button>
          ))}
        </div>
      )}

      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-md border border-line bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida pela API */}
        <img src={urlOf(current)} alt={`${POSE_LABEL[pose]} em ${fmtFullDate(current.date)}`} className="size-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-white">
          <span className="text-sm font-semibold">{fmtFullDate(current.date)}</span>
          <span className="tabular font-display text-lg font-bold italic">{elapsed > 0 ? `+${elapsed} dias` : "início"}</span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={index}
        onChange={(e) => {
          setPlaying(false);
          setIndex(Number(e.target.value));
        }}
        className="w-full accent-[var(--color-accent)]"
        aria-label="Foto"
      />

      <div className="flex items-center gap-2">
        <Button onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproduzir"}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
        </Button>
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
          {SPEEDS.map((s) => (
            <button key={s.ms} type="button" onClick={() => setSpeed(s.ms)} className={cn("h-8 rounded-sm text-xs", s.ms === speed ? "bg-surface font-semibold" : "text-muted")}>
              {s.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" disabled={exporting} onClick={share} aria-label="Compartilhar vídeo">
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-faint">
        {frames.length} fotos · {daysBetween(first.date, frames.at(-1)!.date)} dias de evolução. O botão de compartilhar gera um vídeo curto.
      </p>
    </div>
  );
}

/** Desenha as fotos num canvas 3:4 com a data e grava com MediaRecorder (MP4 quando o aparelho aceita). */
async function renderVideo(frames: TimelapseFrame[], msPerFrame: number): Promise<File> {
  if (typeof MediaRecorder === "undefined") throw new Error("Este navegador não grava vídeo. Use o Chrome ou o Safari atualizado.");
  const images = await Promise.all(
    frames.map(
      (f) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Falha ao carregar uma foto"));
          img.src = urlOf(f);
        }),
    ),
  );

  const W = 720;
  const H = 960;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const draw = (i: number) => {
    const img = images[i];
    // object-cover no canvas
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    const grad = ctx.createLinearGradient(0, H - 160, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 160, W, 160);
    ctx.fillStyle = "#fff";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText(fmtFullDate(frames[i].date), 28, H - 36);
    const days = daysBetween(frames[0].date, frames[i].date);
    ctx.font = "italic 800 44px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(days > 0 ? `+${days} dias` : "início", W - 28, H - 32);
    ctx.textAlign = "left";
  };

  draw(0);
  recorder.start();
  for (let i = 0; i < images.length; i++) {
    draw(i);
    // A última foto fica mais tempo na tela.
    await new Promise((r) => setTimeout(r, i === images.length - 1 ? Math.max(1500, msPerFrame * 3) : msPerFrame));
  }
  recorder.stop();
  await done;

  const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
  return new File(chunks, `evolucao.${ext}`, { type: type.split(";")[0] });
}
