"use client";

import { useEffect, useRef, useState } from "react";
import type { DecodeHintType } from "@zxing/library";
import { Camera, Flashlight, FlashlightOff, Keyboard, Loader2, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isValidBarcode, normalizeBarcode } from "@/lib/domain/barcode";

// API nativa (Chrome/Android). Não está no lib.dom do TypeScript.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

/** Códigos de produto: EAN/UPC das embalagens e ITF-14 das caixas. */
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "itf"];

/** Câmera traseira em alta resolução: códigos pequenos em pacotes precisam de detalhe. */
const VIDEO: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

async function nativeDetector(): Promise<BarcodeDetectorLike | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = (await Ctor.getSupportedFormats?.()) ?? FORMATS;
    const formats = FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new Ctor({ formats }) : null;
  } catch {
    return null;
  }
}

/** ZXing (iPhone e navegadores sem BarcodeDetector), carregado sob demanda e no modo mais insistente. */
async function zxingReader() {
  const [{ BrowserMultiFormatReader }, zxing] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const { BarcodeFormat } = zxing;
  const hints = new Map<DecodeHintType, unknown>([
    [zxing.DecodeHintType.TRY_HARDER, true],
    [zxing.DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.ITF]],
  ]);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
}

/** Tenta ler o código numa foto (a câmera do sistema foca melhor que o vídeo ao vivo). */
async function decodeFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const detector = await nativeDetector();
    if (detector) {
      const [hit] = await detector.detect(bitmap).catch(() => []);
      if (hit) return hit.rawValue;
    }
    // ZXing fica lento em fotos de 12 MP: reduz para no máximo 2000 px no lado maior.
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const reader = await zxingReader();
    try {
      return reader.decodeFromCanvas(canvas).getText();
    } catch {
      return null;
    }
  } finally {
    bitmap.close();
  }
}

/** Pede foco contínuo e informa se a câmera tem lanterna (recursos que nem todo aparelho expõe). */
async function tuneTrack(track: MediaStreamTrack | undefined): Promise<boolean> {
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet] });
  } catch {
    // sem controle de foco
  }
  const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
  return Boolean(caps.torch);
}

interface Props {
  onDetected: (barcode: string) => void;
  busy?: boolean;
}

/**
 * Leitor de código de barras pela câmera traseira.
 * Usa o BarcodeDetector nativo quando existe; senão carrega o ZXing sob demanda (iPhone).
 * Alternativas sempre visíveis: ler de uma foto, lanterna e digitação manual.
 */
export function BarcodeScanner({ onDetected, busy }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const onDetectedRef = useRef(onDetected);
  const torchRef = useRef<((on: boolean) => Promise<void>) | null>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [slow, setSlow] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [photoState, setPhotoState] = useState<"idle" | "reading" | "failed">("idle");
  const [manual, setManual] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (busy) return; // pausa enquanto consulta o código lido
    const video = videoRef.current;
    if (!video) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    let stream: MediaStream | null = null;
    let controls: { stop: () => void } | null = null;

    const cleanup = () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(slowTimer);
      stream?.getTracks().forEach((t) => t.stop());
      controls?.stop();
      torchRef.current = null;
    };

    const found = (raw: string) => {
      const code = normalizeBarcode(raw);
      if (stopped || !isValidBarcode(code)) return;
      cleanup();
      navigator.vibrate?.(60);
      onDetectedRef.current(code);
    };

    const scanning = () => {
      setStatus("scanning");
      setSlow(false);
      setTorchOn(false);
      slowTimer = setTimeout(() => !stopped && setSlow(true), 7000);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera");
        const detector = await nativeDetector();
        if (detector) {
          stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO, audio: false });
          if (stopped) return cleanup();
          video.srcObject = stream;
          await video.play();
          const track = stream.getVideoTracks()[0];
          const hasTorch = await tuneTrack(track);
          torchRef.current = hasTorch ? (on) => track.applyConstraints({ advanced: [{ torch: on } as unknown as MediaTrackConstraintSet] }) : null;
          setTorchAvailable(hasTorch);
          scanning();
          const tick = async () => {
            if (stopped) return;
            try {
              if (video.readyState >= 2) {
                const [hit] = await detector.detect(video);
                if (hit) found(hit.rawValue);
              }
            } catch {
              // frame ruim: tenta de novo
            }
            if (!stopped) timer = setTimeout(tick, 120);
          };
          void tick();
        } else {
          const reader = await zxingReader();
          const c = await reader.decodeFromConstraints({ video: VIDEO, audio: false }, video, (result) => {
            if (result) found(result.getText());
          });
          controls = c;
          if (stopped) return c.stop();
          const live = video.srcObject instanceof MediaStream ? video.srcObject : null;
          await tuneTrack(live?.getVideoTracks()[0]);
          torchRef.current = c.switchTorch ?? null;
          setTorchAvailable(Boolean(c.switchTorch));
          scanning();
        }
      } catch {
        if (!stopped) {
          setStatus("error");
          setManualOpen(true);
        }
      }
    })();

    return cleanup;
  }, [busy]);

  const toggleTorch = async () => {
    try {
      await torchRef.current?.(!torchOn);
      setTorchOn(!torchOn);
    } catch {
      setTorchAvailable(false);
    }
  };

  const readPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoState("reading");
    try {
      const raw = await decodeFromFile(file);
      const code = raw ? normalizeBarcode(raw) : "";
      if (!isValidBarcode(code)) return setPhotoState("failed");
      setPhotoState("idle");
      onDetectedRef.current(code);
    } catch {
      setPhotoState("failed");
    }
  };

  const code = normalizeBarcode(manual);
  const manualValid = isValidBarcode(code);

  return (
    <div className="flex flex-col gap-3">
      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void readPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-black">
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        {status === "scanning" && !busy && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-1/3 w-4/5 rounded-md border-2 border-accent/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]">
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-accent" />
            </div>
          </div>
        )}
        {status === "scanning" && !busy && torchAvailable && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torchOn ? "Desligar lanterna" : "Ligar lanterna"}
            className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-black/60 text-white"
          >
            {torchOn ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
          </button>
        )}
        {(status !== "scanning" || busy) && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
            {busy ? (
              "Buscando produto…"
            ) : status === "starting" ? (
              "Abrindo câmera…"
            ) : (
              <span>
                Não foi possível usar a câmera.
                <br />
                Permita o acesso nas configurações do navegador, tire uma foto do código ou digite os números.
              </span>
            )}
          </div>
        )}
      </div>

      {status === "scanning" && !busy && (
        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted">
          <ScanBarcode className="size-4 shrink-0 text-accent" />
          {slow ? "Não está lendo? Afaste um pouco para focar, use a lanterna ou tire uma foto do código." : "Aponte para o código de barras da embalagem"}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" disabled={busy || photoState === "reading"} onClick={() => photoRef.current?.click()}>
          {photoState === "reading" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Foto do código
        </Button>
        <Button variant="ghost" size="sm" disabled={manualOpen} onClick={() => setManualOpen(true)}>
          <Keyboard className="size-4" /> Digitar código
        </Button>
      </div>
      {photoState === "failed" && <p className="-mt-1 text-center text-xs text-danger">Não achei um código na foto. Tente de perto, reto e sem reflexo — ou digite os números.</p>}

      {manualOpen && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manualValid && !busy) onDetected(code);
          }}
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex.: 7891000100103"
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 tabular outline-none focus:border-accent"
          />
          <Button type="submit" disabled={!manualValid || busy}>
            Buscar
          </Button>
        </form>
      )}
      {manualOpen && manual && !manualValid && <p className="-mt-2 text-xs text-faint">Digite os 8, 12, 13 ou 14 números abaixo das barras.</p>}
    </div>
  );
}
