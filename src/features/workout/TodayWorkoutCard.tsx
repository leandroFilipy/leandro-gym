import { Play } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WEEKDAY_LONG } from "@/lib/format";
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

  return (
    <Card className={isRest ? "" : "border-l-4 border-l-accent"}>
      <Label />
      <h2 className="mb-2 text-5xl font-extrabold uppercase italic leading-none">{day?.name ?? "Descanso"}</h2>
      {day && !isRest && (
        <p className="mb-4 text-sm text-muted">
          {day.exercises.length} exercícios · {day.exercises.reduce((n, e) => n + e.plannedSets, 0)} séries
        </p>
      )}

      {showExercises && day && hasExercises && (
        <ul className="mb-4 flex flex-col gap-1 text-sm">
          {day.exercises.map((e) => (
            <li key={e.id} className="flex justify-between gap-2">
              <span>{e.exercise.name}</span>
              <span className="tabular text-muted">
                {e.plannedSets}× {fmtRepRange(e.repMin, e.repMax)}
              </span>
            </li>
          ))}
        </ul>
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
            {nextDay && ` Próximo: ${nextDay.day.name} (${WEEKDAY_LONG[nextDay.day.weekday].toLowerCase()}).`}
          </p>
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
    </Card>
  );
}

function Label() {
  return <div className="eyebrow mb-2">Treino de hoje</div>;
}
