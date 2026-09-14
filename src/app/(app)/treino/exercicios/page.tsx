import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { ExerciseSheetButton } from "@/features/workout/exercises/ExerciseSheetButton";
import { MUSCLE_LABEL } from "@/lib/labels";
import { requireUserId } from "@/server/session";
import { listExercises } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Exercícios" };

export default async function ExercisesPage() {
  const userId = await requireUserId();
  const exercises = await listExercises(userId);
  const groups = Map.groupBy(exercises, (e) => e.muscleGroup);

  return (
    <>
      <PageHeader
        title="Exercícios"
        back="/treino"
        action={<ExerciseSheetButton label={<><Plus className="size-4" /> Novo</>} />}
      />
      {exercises.length === 0 ? (
        <EmptyState title="Sua biblioteca está vazia" text="Cadastre os exercícios que você faz para montar as fichas." />
      ) : (
        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([group, list]) => (
            <section key={group}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{MUSCLE_LABEL[group]}</h2>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {list.map((e) => (
                    <li key={e.id}>
                      <Link href={`/treino/exercicios/${e.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2">
                        <span>{e.name}</span>
                        <ChevronRight className="size-4 text-faint" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
