import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { fmtRepRange } from "@/features/workout/format";
import { WEEKDAY_LONG } from "@/lib/format";
import { MUSCLE_LABEL } from "@/lib/labels";
import { importSharedPlanAction } from "@/server/actions/plans";
import { requireUserId } from "@/server/session";
import { getSharedPlan } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Ficha compartilhada" };

export default async function ImportPlanPage({ params }: PageProps<"/treino/fichas/importar/[token]">) {
  const { token } = await params;
  await requireUserId();
  const plan = await getSharedPlan(token);

  if (!plan) {
    return (
      <>
        <PageHeader title="Ficha compartilhada" back="/treino/fichas" />
        <EmptyState title="Link inválido" text="Esta ficha não existe mais ou o compartilhamento foi desativado." />
      </>
    );
  }

  const workoutDays = plan.days.filter((d) => d.type !== "REST");

  return (
    <>
      <PageHeader title={plan.name} subtitle={plan.ownerName ? `Compartilhada por ${plan.ownerName}` : "Ficha compartilhada"} back="/treino/fichas" />
      <div className="flex flex-col gap-4">
        <form action={importSharedPlanAction.bind(null, token)}>
          <Button type="submit" size="lg" block>
            <Download className="size-5" /> Importar para minhas fichas
          </Button>
        </form>
        <p className="-mt-2 text-center text-xs text-muted">
          Uma cópia fica na sua conta. Exercícios que você ainda não tem são criados na sua biblioteca.
        </p>

        {workoutDays.length === 0 ? (
          <EmptyState title="Ficha vazia" text="Esta ficha ainda não tem dias de treino." />
        ) : (
          workoutDays.map((d) => (
            <Card key={d.weekday}>
              <div className="eyebrow mb-1">{WEEKDAY_LONG[d.weekday]}</div>
              <h2 className="mb-2 text-2xl font-bold uppercase italic leading-none">{d.name}</h2>
              {d.exercises.length === 0 ? (
                <p className="text-sm text-muted">{d.type === "CARDIO" ? "Cardio" : "Sem exercícios"}</p>
              ) : (
                <ol className="flex flex-col divide-y divide-line">
                  {d.exercises.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{e.exercise.name}</span>
                        <span className="text-xs text-muted">{MUSCLE_LABEL[e.exercise.muscleGroup]}</span>
                      </span>
                      <span className="tabular shrink-0 text-sm">
                        <span className="font-semibold">{e.plannedSets}×</span> {fmtRepRange(e.repMin, e.repMax)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          ))
        )}
      </div>
    </>
  );
}
