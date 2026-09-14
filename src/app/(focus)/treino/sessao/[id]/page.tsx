import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GymSession } from "@/features/workout/session/GymSession";
import { requireUserId } from "@/server/session";
import { getGymSession, listExercises } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Treino" };

export default async function SessionPage({ params }: PageProps<"/treino/sessao/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();
  const session = await getGymSession(userId, id);
  if (!session) notFound();
  if (session.finishedAt) redirect(`/treino/sessao/${id}/resumo`);

  const library = await listExercises(userId);
  return (
    <GymSession
      session={session}
      library={library.map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup }))}
    />
  );
}
