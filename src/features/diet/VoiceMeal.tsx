"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Loader2, Mic, MicOff, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { analyzeMealTextAction, type PlateItem } from "@/server/actions/diet";
import type { MealType } from "@/generated/prisma/enums";
import { EstimateReview } from "./EstimateReview";

// Web Speech API (Chrome/Android e Safari/iOS expõem com prefixo webkit). Tipos mínimos locais.
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Permita o uso do microfone para falar a refeição.",
  "no-speech": "Não ouvi nada. Toque no microfone e fale de novo.",
  network: "O reconhecimento de voz precisa de internet.",
};

/** Fala (ou digita) o que comeu → IA separa os alimentos e porções → revisão → registrar. */
export function VoiceMeal({ date, mealType, onDone }: { date: string; mealType: MealType; onDone: () => void }) {
  // No servidor é sempre false; no navegador, lê a capacidade (sem diferença na hidratação).
  const supported = useSyncExternalStore(noopSubscribe, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ key: number; items: PlateItem[]; note: string } | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const toggleMic = () => {
    if (listening) return rec.current?.stop();
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let finalText = "";
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else partial += res[0].transcript;
      }
      if (finalText) setText((t) => `${t} ${finalText}`.trim());
      setInterim(partial);
    };
    r.onerror = (e) => setError(MIC_ERRORS[e.error] ?? "Não consegui usar o microfone. Digite a refeição.");
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    r.start();
    setListening(true);
  };

  const analyze = () => {
    rec.current?.stop();
    setError(null);
    startAnalyze(async () => {
      const r = await analyzeMealTextAction(text);
      if (!r.ok) return setError(r.error);
      setEstimate({ key: Date.now(), ...r.data });
    });
  };

  if (estimate) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">“{text}”</p>
        <EstimateReview
          key={estimate.key}
          items={estimate.items}
          note={estimate.note}
          label="Estimativa pelo que você disse"
          source="text"
          date={date}
          mealType={mealType}
          onDone={onDone}
          retry={
            <Button variant="secondary" onClick={() => setEstimate(null)} aria-label="Corrigir o texto">
              <Pencil className="size-4" />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {supported && (
        <button
          type="button"
          onClick={toggleMic}
          className={cn(
            "flex flex-col items-center gap-2 rounded-2xl border px-4 py-6 text-center",
            listening ? "border-accent bg-accent/10" : "border-dashed border-line hover:border-accent",
          )}
        >
          <span className={cn("grid size-14 place-items-center rounded-full", listening ? "animate-pulse bg-accent text-black" : "bg-surface-2 text-accent")}>
            {listening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
          </span>
          <span className="font-semibold">{listening ? "Ouvindo… toque para parar" : "Toque e fale o que comeu"}</span>
          <span className="text-xs text-muted">Ex.: “dois ovos mexidos, um pão francês com requeijão e um café com leite”</span>
        </button>
      )}

      <textarea
        value={interim ? `${text} ${interim}`.trim() : text}
        onChange={(e) => setText(e.target.value)}
        readOnly={listening}
        rows={3}
        placeholder={supported ? "O texto aparece aqui — dá para corrigir antes de calcular." : "Escreva o que comeu (ou use o microfone do teclado)…"}
        className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        aria-label="O que você comeu"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button size="lg" block disabled={analyzing || text.trim().length < 2} onClick={analyze}>
        {analyzing ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Calculando…
          </>
        ) : (
          <>
            <Sparkles className="size-4" /> Calcular com IA
          </>
        )}
      </Button>
    </div>
  );
}
