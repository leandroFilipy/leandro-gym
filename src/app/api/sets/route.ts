import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { getUserId } from "@/server/session";
import { evaluateRecord } from "@/server/services/records";

// Usado pela outbox do modo academia. O id vem do cliente → reenvio é idempotente.
const setSchema = z.object({
  id: z.uuid(),
  workoutExerciseId: z.string().min(1),
  setNumber: z.number().int().min(1).max(50),
  weight: z.number().min(0).max(1000),
  repetitions: z.number().int().min(0).max(200),
  rir: z.number().int().min(0).max(10).nullable(),
});

export type SetPayload = z.infer<typeof setSchema>;

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = setSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const input = parsed.data;

  // Garante que o exercício da sessão pertence ao usuário.
  const we = await db.workoutExercise.findFirst({
    where: { id: input.workoutExerciseId, session: { userId } },
    select: { id: true, exerciseId: true },
  });
  if (!we) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Se o id já existe, precisa ser do mesmo exercício (evita sobrescrever série de outro usuário).
  const existing = await db.exerciseSet.findUnique({ where: { id: input.id }, select: { workoutExerciseId: true } });
  if (existing && existing.workoutExerciseId !== we.id) {
    return NextResponse.json({ error: "conflict" }, { status: 409 });
  }

  const data = {
    setNumber: input.setNumber,
    weight: input.weight,
    repetitions: input.repetitions,
    rir: input.rir,
    completed: true,
    completedAt: new Date(),
  };

  // Mesmo número de série já salvo com outro id (ex.: dois aparelhos) → atualiza aquele.
  const sameNumber = await db.exerciseSet.findUnique({
    where: { workoutExerciseId_setNumber: { workoutExerciseId: we.id, setNumber: input.setNumber } },
    select: { id: true },
  });
  const targetId = existing ? input.id : (sameNumber?.id ?? input.id);

  const set = await db.exerciseSet.upsert({
    where: { id: targetId },
    create: { id: targetId, workoutExerciseId: we.id, ...data },
    update: data,
  });

  const record = await evaluateRecord(userId, we.exerciseId, set);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: set.id, record });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await db.exerciseSet.deleteMany({ where: { id, workoutExercise: { session: { userId } } } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
