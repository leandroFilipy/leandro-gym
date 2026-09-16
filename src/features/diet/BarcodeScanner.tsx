"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, ScanBarcode } from "lucide-react";
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

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

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

interface Props {
  onDetected: (barcode: string) => void;
  busy?: boolean;
}

/**
 * Leitor de código de barras pela câmera traseira.
 * Usa o BarcodeDetector nativo quando existe; senão carrega o ZXing sob demanda (iPhone).
 * Sempre oferece digitação manual (câmera negada, sem HTTPS, código danificado).
 */
export function BarcodeScanner({ onDetected, busy }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
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
    let stream: MediaStream | null = null;
    let controls: { stop: () => void } | null = null;

    const cleanup = () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      controls?.stop();
    };

    const found = (raw: string) => {
      const code = normalizeBarcode(raw);
      if (stopped || !isValidBarcode(code)) return;
      cleanup();
      navigator.vibrate?.(60);
      onDetectedRef.current(code);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera");
        const detector = await nativeDetector();
        if (detector) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          if (stopped) return cleanup();
          video.srcObject = stream;
          await video.play();
          setStatus("scanning");
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
            if (!stopped) timer = setTimeout(tick, 180);
          };
          void tick();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          const c = await reader.decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video, (result) => {
            if (result) found(result.getText());
          });
          controls = c;
          if (stopped) return c.stop();
          setStatus("scanning");
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

  const code = normalizeBarcode(manual);
  const manualValid = isValidBarcode(code);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-black">
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        {status === "scanning" && !busy && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-1/3 w-4/5 rounded-md border-2 border-accent/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]">
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-accent" />
            </div>
          </div>
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
                Permita o acesso nas configurações do navegador ou digite o código.
              </span>
            )}
          </div>
        )}
      </div>

      {status === "scanning" && !busy && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted">
          <ScanBarcode className="size-4 text-accent" /> Aponte para o código de barras da embalagem
        </p>
      )}

      {manualOpen ? (
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
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
          <Keyboard className="size-4" /> Digitar código
        </Button>
      )}
      {manualOpen && manual && !manualValid && <p className="-mt-2 text-xs text-faint">Digite os 8 ou 13 números abaixo das barras.</p>}
    </div>
  );
}
