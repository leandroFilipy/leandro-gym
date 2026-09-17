import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Play } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WEEKDAY_LONG, WEEKDAY_SHORT, fmtRest } from "@/lib/format";
import { MUSCLE_LABEL } from "@/lib/labels";
import { startFreeSessionAction, startSessionAction } from "@/server/actions/sessions";
import type { getToday } from "@/server/services/workouts";
import { fmtRepRange } from "./format";

type Today = Awaited<ReturnType<typeof getToday>>;

/** Card "TREINO DE HOJE" com o botão principal. Usado na Home e em /treino. */
export function TodayWorkoutCard({ today, showExercises = false }: { today: Today; showExercises?: boolean }) {
  const { plan, day, session, nextDay } = today;

  if (!plan) {
    return (
      <Card>
        <Label />
        <h2 className="mb-2 text-4xl font-extrabold uppercase italic leading-none">Monte sua ficha</h2>
        <p className="mb-4 text-sm text-muted">Crie uma ficha semanal para ver o treino do dia aqui.</p>
        <ButtonLink href="/treino/fichas" size="lg" block>
          Criar ficha
        </ButtonLink>
      </Card>
    );
  }

  const isRest = !day || day.type === "REST";
  const hasExercises = Boolean(day && day.exercises.length > 0);
  // Trocar o treino de hoje por outro dia da ficha (ex.: faltou segunda, faz na terça).
  const swapDays = session ? [] : plan.days.filter((d) => d.id !== day?.id && d.type !== "REST" && d.exercises.length > 0);

  return (
    <Card className={isRest ? "" : "border-l-4 border-l-accent"}>
      <Label />
      {day && !isRest ? (
        <Link href={`/treino/dia/${day.id}`} className="group block">
          <h2 className="flex items-center gap-1 text-5xl font-extrabold uppercase italic leading-none">
            {day.name}
            <ChevronRight className="size-7 text-faint transition group-hover:text-fg" />
          </h2>
        </Link>
      ) : (
        <h2 className="mb-2 text-5xl font-extrabold uppercase italic leading-none">{day?.name ?? "Descanso"}</h2>
      )}
      {day && !isRest && (
        <p className="mb-4 mt-2 text-sm text-muted">
          {day.exercises.length} exercícios · {day.exercises.reduce((n, e) => n + e.plannedSets, 0)} séries
        </p>
      )}

      {showExercises && day && hasExercises && (
        <>
          <ol className="mb-2 flex flex-col divide-y divide-line rounded-2xl border border-line">
            {day.exercises.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.exercise.name}</span>
                  <span className="text-xs text-muted">
                    {MUSCLE_LABEL[e.exercise.muscleGroup]} · descanso {fmtRest(e.restSeconds)}
                  </span>
                </span>
                <span className="tabular shrink-0 text-right text-sm">
                  <span className="font-semibold">{e.plannedSets}×</span> {fmtRepRange(e.repMin, e.repMax)}
                  <span className="block text-xs text-faint">reps</span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            href={`/treino/dia/${day.id}`}
            className="mb-4 flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 py-2 text-sm font-medium text-muted hover:text-fg"
          >
            Ver treino completo <ChevronRight className="size-4" />
          </Link>
        </>
      )}

      {session && !session.finishedAt ? (
        <ButtonLink href={`/treino/sessao/${session.id}`} size="xl" block>
          <Play className="size-5 fill-current" /> CONTINUAR TREINO
        </ButtonLink>
      ) : session?.finishedAt ? (
        <div className="flex flex-col gap-2">
          <p className="rounded-md bg-success/10 px-3 py-2 text-center font-display font-bold uppercase tracking-wider text-success">✅ Treino de hoje concluído</p>
          <ButtonLink href={`/treino/sessao/${session.id}/resumo`} variant="secondary" block>
            Ver resumo
          </ButtonLink>
        </div>
      ) : isRest ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Dia de descanso.
            {nextDay && ` Próximo treino: ${nextDay.day.name} (${WEEKDAY_LONG[nextDay.day.weekday].toLowerCase()}).`}
          </p>
          {showExercises && nextDay && nextDay.day.exercises.length > 0 && (
            <Link
              href={`/treino/dia/${nextDay.day.id}`}
              className="flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 py-2 text-sm font-medium text-muted hover:text-fg"
            >
              Ver próximo treino · {nextDay.day.name} <ChevronRight className="size-4" />
            </Link>
          )}
          <form action={startFreeSessionAction}>
            <Button type="submit" variant="secondary" block>
              Fazer treino livre
            </Button>
          </form>
        </div>
      ) : !hasExercises ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{day!.type === "CARDIO" ? "Dia de cardio." : "Nenhum exercício neste dia ainda."}</p>
          <ButtonLink href={`/treino/fichas/dia/${day!.id}`} variant="secondary" block>
            Adicionar exercícios
          </ButtonLink>
        </div>
      ) : (
        <form action={startSessionAction.bind(null, day!.id)}>
          <Button type="submit" size="xl" block>
            <Play className="size-5 fill-current" /> COMEÇAR TREINO
          </Button>
        </form>
      )}

      {swapDays.length > 0 && (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-sm text-muted hover:text-fg">
            <ArrowLeftRight className="size-4" /> {isRest ? "Fazer o treino de outro dia" : "Trocar o treino de hoje"}
          </summary>
          <p className="mt-2 text-xs text-faint">O treino conta no dia da ficha dele — a semana não fica bagunçada.</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {swapDays.map((d) => (
              <li key={d.id}>
                <form action={startSessionAction.bind(null, d.id)}>
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-accent">
                    <span className="w-10 shrink-0 text-xs font-bold text-muted">{WEEKDAY_SHORT[d.weekday]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.name}</span>
                      <span className="block truncate text-xs text-muted">{d.exercises.map((e) => e.exercise.name).join(" · ")}</span>
                    </span>
                    <Play className="size-4 shrink-0 text-accent" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function Label() {
  return <div className="eyebrow mb-2">Treino de hoje</div>;
}
