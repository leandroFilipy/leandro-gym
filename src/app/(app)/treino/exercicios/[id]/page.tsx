import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, EmptyState, Stat } from "@/components/ui/Card";
import { ArchiveExerciseButton } from "@/features/workout/exercises/ArchiveExerciseButton";
import { ExerciseCharts } from "@/features/workout/exercises/ExerciseCharts";
import { ExerciseSheetButton } from "@/features/workout/exercises/ExerciseSheetButton";
import { fmtSet } from "@/features/workout/format";
import { bestSet, estimate1RM } from "@/lib/domain/volume";
import { getStrengthContext } from "@/server/services/strength";
import { StrengthCard } from "@/features/workout/insights/StrengthCard";
import { fmtDayMonth, fmtInt, fmtNumber } from "@/lib/format";
import { MUSCLE_LABEL } from "@/lib/labels";
import { requireUserId } from "@/server/session";
import { getExerciseHistory } from "@/server/services/workouts";
import { getExerciseStagnation } from "@/server/services/insights";
import { StagnationDetail } from "@/features/workout/insights/StagnationCard";

export const metadata: Metadata = { title: "Histórico do exercício" };

export default async function ExerciseHistoryPage({ params }: PageProps<"/treino/exercicios/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();
  const [h, stagnation, strength] = await Promise.all([
    getExerciseHistory(userId, id),
    getExerciseStagnation(userId, id),
    getStrengthContext(userId),
  ]);
  if (!h) notFound();

  const allBest = bestSet(h.sessions.flatMap((s) => s.sets));
  const oneRm = allBest ? estimate1RM(allBest.weight, allBest.repetitions) : null;
  const maxWeight = h.sessions.length ? Math.max(...h.sessions.map((s) => s.topWeight)) : null;
  const chartData = [...h.sessions].reverse().map((s) => ({
    date: fmtDayMonth(s.date),
    carga: s.topWeight,
    reps: s.totalReps,
    volume: Math.round(s.volume),
  }));

  return (
    <>
      <PageHeader
        title={h.exercise.name}
        subtitle={MUSCLE_LABEL[h.exercise.muscleGroup]}
        back="/treino/exercicios"
        action={<ExerciseSheetButton label="Editar" variant="secondary" exercise={h.exercise} />}
      />
      <div className="flex flex-col gap-4">
        <Card className="grid grid-cols-3 gap-3">
          <Stat label="Melhor série" value={allBest ? fmtSet(allBest) : "—"} />
          <Stat label="Carga máx." value={maxWeight !== null ? `${fmtNumber(maxWeight)}kg` : "—"} />
          <Stat label="Treinos" value={h.sessions.length} />
        </Card>

        <StrengthCard result={oneRm ? strength.evaluate(h.exercise.name, oneRm) : null} oneRm={oneRm} bodyWeightKg={strength.bodyWeightKg} />

        <StagnationDetail result={stagnation} />

        {chartData.length >= 2 && <ExerciseCharts data={chartData} />}

        <Card>
          <CardHeader title="Histórico" />
          {h.sessions.length === 0 ? (
            <EmptyState title="Ainda sem registros" text="Faça este exercício em um treino para ver a evolução." />
          ) : (
            <ul className="divide-y divide-line">
              {h.sessions.map((s) => (
                <li key={s.sessionId} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-semibold">{fmtDayMonth(s.date)}</div>
                    <div className="tabular mt-0.5 text-sm text-muted">
                      {s.sets.map((x, i) => (
                        <span key={i} className="mr-2 inline-block">
                          {fmtNumber(x.weight)}×{x.repetitions}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="tabular shrink-0 text-right text-xs text-muted">{fmtInt(s.volume)} kg</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {h.records.length > 0 && (
          <Card>
            <CardHeader title="🔥 Recordes" />
            <ul className="flex flex-col gap-1 text-sm">
              {h.records.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span className="text-muted">{r.achievedAt.toLocaleDateString("pt-BR")}</span>
                  <span className="tabular font-semibold">{fmtSet(r)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex justify-center">
          <ArchiveExerciseButton id={h.exercise.id} />
        </div>
      </div>
    </>
  );
}
