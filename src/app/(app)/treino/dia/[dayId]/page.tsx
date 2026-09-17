import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { startSessionAction } from "@/server/actions/sessions";
import { Card } from "@/components/ui/Card";
import { fmtDayMonth, fmtRest, WEEKDAY_LONG } from "@/lib/format";
import { MUSCLE_LABEL } from "@/lib/labels";
import { requireUserId } from "@/server/session";
import { getDayView } from "@/server/services/workouts";
import { fmtRepRange } from "@/features/workout/format";

export const metadata: Metadata = { title: "Treino" };

export default async function DayViewPage({ params }: PageProps<"/treino/dia/[dayId]">) {
  const { dayId } = await params;
  const userId = await requireUserId();
  const day = await getDayView(userId, dayId);
  if (!day) notFound();

  const totalSets = day.exercises.reduce((n, e) => n + e.plannedSets, 0);

  return (
    <>
      <PageHeader title={day.name} subtitle={`${day.planName} · ${WEEKDAY_LONG[day.weekday]}`} back="/treino" />

      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {day.exercises.length} exercício{day.exercises.length === 1 ? "" : "s"} · {totalSets} séries
        </p>

        {day.exercises.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            <Dumbbell className="mx-auto mb-2 size-6 text-faint" />
            Este dia ainda não tem exercícios.
            <div className="mt-3">
              <ButtonLink href={`/treino/fichas/dia/${day.id}`} variant="secondary" block>
                Adicionar exercícios
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <ol className="flex flex-col gap-2">
            {day.exercises.map((e, i) => (
              <li key={e.id}>
                <Card className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{e.name}</span>
                      <span className="tabular shrink-0 text-sm">
                        <span className="font-bold">{e.plannedSets}×</span> {fmtRepRange(e.repMin, e.repMax)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {MUSCLE_LABEL[e.muscleGroup]} · descanso {fmtRest(e.restSeconds)}
                    </div>
                    {e.last && e.last.weight != null ? (
                      <div className="mt-1 text-xs text-accent">
                        Último: {e.last.weight} kg × {e.last.reps} reps
                        <span className="text-faint"> · {fmtDayMonth(e.last.date)}</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-faint">Sem registro anterior</div>
                    )}
                    {e.record && (
                      <div className="mt-1 text-xs font-medium text-warn">
                        🔥 Recorde: {e.record.weight} kg × {e.record.reps} reps
                        <span className="font-normal text-faint"> · {fmtDayMonth(e.record.date)}</span>
                      </div>
                    )}
                    {e.notes && <div className="mt-1 text-xs text-muted">📝 {e.notes}</div>}
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}

        {day.exercises.length > 0 && (
          <form action={startSessionAction.bind(null, day.id)}>
            <Button type="submit" size="lg" block>
              <Play className="size-5 fill-current" /> Fazer este treino hoje
            </Button>
          </form>
        )}

        <ButtonLink href={`/treino/fichas/dia/${day.id}`} variant="ghost" block>
          Editar treino
        </ButtonLink>
      </div>
    </>
  );
}
