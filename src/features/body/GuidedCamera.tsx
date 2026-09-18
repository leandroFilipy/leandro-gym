"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SwitchCamera, Timer, X } from "lucide-react";
import { cn } from "@/lib/cn";

const ASPECT = 3 / 4; // largura / altura, igual às miniaturas da galeria
const TIMERS = [0, 5, 10] as const;

interface Props {
  /** Última foto da mesma pose, mostrada como "sombra" para repetir o enquadramento. */
  ghostUrl: string | null;
  poseLabel: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}

/** Câmera em tela cheia com a foto anterior semitransparente por cima e temporizador. */
export function GuidedCamera({ ghostUrl, poseLabel, onCapture, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [ghostOpacity, setGhostOpacity] = useState(0.35);
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setError("Não consegui abrir a câmera. Permita o acesso ou use “Escolher foto”."));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [facing]);

  const shoot = useCallback(() => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    // Recorta o mesmo 3:4 central que aparece na tela (object-cover).
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const sw = vw / vh > ASPECT ? vh * ASPECT : vw;
    const sh = vw / vh > ASPECT ? vh : vw / ASPECT;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Câmera frontal: salva como aparece na tela (espelhada), igual a um espelho de academia.
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && onCapture(new File([blob], "foto.jpg", { type: "image/jpeg" })), "image/jpeg", 0.92);
  }, [facing, onCapture]);

  useEffect(() => {
    if (countdown === null) return;
    const t = setTimeout(() => {
      if (countdown > 1) return setCountdown(countdown - 1);
      navigator.vibrate?.(60);
      setCountdown(null);
      shoot();
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, shoot]);

  const mirror = facing === "user" ? "-scale-x-100" : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-display text-sm font-bold uppercase tracking-wider">{poseLabel}</span>
        <button type="button" onClick={onClose} aria-label="Fechar câmera" className="grid size-10 place-items-center rounded-full bg-white/10">
          <X className="size-5" />
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-md flex-1">
        <div className="absolute inset-0 m-auto aspect-[3/4] max-h-full max-w-full overflow-hidden rounded-lg">
          <video ref={video} autoPlay playsInline muted className={cn("size-full object-cover", mirror)} />
          {ghostUrl && ghostOpacity > 0 && (
            // eslint-disable-next-line @next/next/no-img-element -- foto privada servida pela API
            <img src={ghostUrl} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" style={{ opacity: ghostOpacity }} />
          )}
          {countdown !== null && (
            <span className="absolute inset-0 grid place-items-center font-display text-8xl font-extrabold italic drop-shadow-lg">{countdown}</span>
          )}
        </div>
        {error && <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md bg-black/80 p-4 text-center text-sm">{error}</p>}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {ghostUrl ? (
          <label className="flex items-center gap-3 text-xs text-white/70">
            Foto anterior
            <input type="range" min={0} max={0.7} step={0.05} value={ghostOpacity} onChange={(e) => setGhostOpacity(Number(e.target.value))} className="flex-1 accent-[var(--color-accent)]" />
          </label>
        ) : (
          <p className="text-center text-xs text-white/60">Primeira foto desta pose — nas próximas, ela aparece aqui como guia.</p>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setTimer((t) => TIMERS[(TIMERS.indexOf(t) + 1) % TIMERS.length])}
            className="flex h-11 w-20 items-center justify-center gap-1 rounded-full bg-white/10 text-sm"
            aria-label="Temporizador"
          >
            <Timer className="size-4" /> {timer ? `${timer}s` : "off"}
          </button>
          <button
            type="button"
            disabled={Boolean(error) || countdown !== null}
            onClick={() => (timer ? setCountdown(timer) : shoot())}
            aria-label="Tirar foto"
            className="size-18 rounded-full border-4 border-white bg-white/20 active:scale-95 disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="grid h-11 w-20 place-items-center rounded-full bg-white/10"
            aria-label="Trocar câmera"
          >
            <SwitchCamera className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
