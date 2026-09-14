import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DayEditor } from "@/features/workout/plans/DayEditor";
import { WEEKDAY_LONG } from "@/lib/format";
import { requireUserId } from "@/server/session";
import { getDay, listExercises } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Editar dia" };

export default async function DayPage({ params }: PageProps<"/treino/fichas/dia/[dayId]">) {
  const { dayId } = await params;
  const userId = await requireUserId();
  const [day, library] = await Promise.all([getDay(userId, dayId), listExercises(userId)]);
  if (!day) notFound();

  return (
    <>
      <PageHeader title={WEEKDAY_LONG[day.weekday]} subtitle={day.plan.name} back={`/treino/fichas/${day.plan.id}`} />
      <DayEditor
        day={{
          id: day.id,
          name: day.name,
          type: day.type,
          exercises: day.exercises.map((e) => ({
            id: e.id,
            exerciseId: e.exerciseId,
            name: e.exercise.name,
            plannedSets: e.plannedSets,
            repMin: e.repMin,
            repMax: e.repMax,
            restSeconds: e.restSeconds,
            notes: e.notes ?? "",
          })),
        }}
        library={library.map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup }))}
      />
    </>
  );
}
