"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { readinessLevel, readinessScore, type ReadinessAnswers } from "@/lib/domain/readiness";
import { saveReadinessAction } from "@/server/actions/sessions";

const QUESTIONS: { key: keyof ReadinessAnswers; title: string; options: [string, string][] }[] = [
  { key: "sleep", title: "Como você dormiu?", options: [["😫", "Péssimo"], ["😕", "Mal"], ["😐", "Ok"], ["🙂", "Bem"], ["😴", "Ótimo"]] },
  { key: "soreness", title: "Dor muscular?", options: [["🥵", "Muita"], ["😣", "Bastante"], ["😐", "Um pouco"], ["🙂", "Leve"], ["💪", "Nenhuma"]] },
  { key: "energy", title: "Energia agora?", options: [["🪫", "Zerada"], ["😮‍💨", "Baixa"], ["😐", "Normal"], ["⚡", "Boa"], ["🔥", "Muita"]] },
];

const LEVEL_TEXT = {
  low: "Dia de recuperação: as cargas sugeridas vêm ~10% menores.",
  normal: "Dia normal: siga a progressão de sempre.",
  high: "Dia forte: bom dia para buscar recorde.",
} as const;

/** 3 perguntas antes do treino. A nota ajusta as sugestões de carga desta sessão. */
export function ReadinessCheck({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Partial<ReadinessAnswers>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const complete = answers.sleep && answers.soreness && answers.energy ? (answers as ReadinessAnswers) : null;
  const score = complete ? readinessScore(complete) : null;

  const save = (value: ReadinessAnswers | null) =>
    start(async () => {
      const r = await saveReadinessAction(sessionId, value);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <div className="eyebrow mb-1">Antes de começar</div>
        <h1 className="text-4xl font-extrabold uppercase italic leading-none">Como você está hoje?</h1>
        <p className="mt-1 text-sm text-muted">3 toques. O app ajusta as cargas sugeridas ao seu dia.</p>
      </div>

      {QUESTIONS.map((q) => (
        <fieldset key={q.key}>
          <legend className="mb-2 font-semibold">{q.title}</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {q.options.map(([emoji, label], i) => {
              const value = i + 1;
              const selected = answers[q.key] === value;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: value }))}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] leading-tight",
                    selected ? "border-accent bg-accent/10 text-fg" : "border-line bg-surface text-muted",
                  )}
                >
                  <span className="text-2xl" aria-hidden>{emoji}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {score !== null && (
        <div className="rounded-2xl border border-line bg-surface p-3 text-center">
          <div className="font-display text-3xl font-extrabold italic">
            {score}
            <span className="text-base text-muted">/100</span>
          </div>
          <p className="text-sm text-muted">{LEVEL_TEXT[readinessLevel(score)]}</p>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button size="xl" block disabled={!complete || pending} onClick={() => complete && save(complete)}>
          {pending ? "Salvando…" : "COMEÇAR TREINO"}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => save(null)}>
          Pular hoje
        </Button>
      </div>
    </div>
  );
}
