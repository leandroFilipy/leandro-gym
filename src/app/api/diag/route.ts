import { NextResponse } from "next/server";
import { db } from "@/server/db";

// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover depois.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== "diag-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const user = await db.user.findFirst({ where: { email: { not: { contains: "demo" } } }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ error: "sem usuario" });

  // Exercícios do usuário e quantas séries concluídas cada um tem
  const exercises = await db.exercise.findMany({ where: { userId: user.id }, select: { id: true, name: true } });
  const out = [];
  for (const ex of exercises) {
    const setCount = await db.exerciseSet.count({
      where: { completed: true, workoutExercise: { exerciseId: ex.id, session: { userId: user.id } } },
    });
    const lastSet = await db.exerciseSet.findFirst({
      where: { completed: true, workoutExercise: { exerciseId: ex.id, session: { userId: user.id } } },
      orderBy: { completedAt: "desc" },
      select: { weight: true, repetitions: true },
    });
    out.push({ nome: ex.name, seriesRegistradas: setCount, ultima: lastSet });
  }

  const totalSessions = await db.workoutSession.count({ where: { userId: user.id } });
  const finishedSessions = await db.workoutSession.count({ where: { userId: user.id, finishedAt: { not: null } } });

  return NextResponse.json(
    { email: user.email, totalSessions, finishedSessions, exercises: out },
    { headers: { "Cache-Control": "no-store" } },
  );
}
