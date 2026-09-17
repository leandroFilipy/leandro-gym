import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getUserId } from "@/server/session";
import { toCsv, type CsvValue } from "@/lib/csv";
import { fromDbDate } from "@/lib/dates";
import { MEAL_LABEL, MUSCLE_LABEL, UNIT_LABEL } from "@/lib/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["treinos", "peso", "medidas", "dieta"] as const;
type Kind = (typeof KINDS)[number];

async function build(userId: string, kind: Kind): Promise<{ header: string[]; rows: CsvValue[][] }> {
  switch (kind) {
    case "treinos": {
      const sets = await db.exerciseSet.findMany({
        where: { workoutExercise: { session: { userId } } },
        orderBy: [{ workoutExercise: { session: { startedAt: "asc" } } }, { workoutExercise: { order: "asc" } }, { setNumber: "asc" }],
        select: {
          setNumber: true, weight: true, repetitions: true, rir: true, completed: true,
          workoutExercise: { select: { exercise: { select: { name: true, muscleGroup: true } }, session: { select: { date: true, name: true } } } },
        },
      });
      return {
        header: ["data", "treino", "exercicio", "grupo_muscular", "serie", "carga_kg", "repeticoes", "rir", "concluida"],
        rows: sets.map((s) => [
          fromDbDate(s.workoutExercise.session.date), s.workoutExercise.session.name, s.workoutExercise.exercise.name,
          MUSCLE_LABEL[s.workoutExercise.exercise.muscleGroup], s.setNumber, s.weight, s.repetitions, s.rir, s.completed ? "sim" : "não",
        ]),
      };
    }
    case "peso": {
      const rows = await db.bodyWeight.findMany({ where: { userId }, orderBy: { date: "asc" } });
      return { header: ["data", "peso_kg"], rows: rows.map((r) => [fromDbDate(r.date), r.weightKg]) };
    }
    case "medidas": {
      const rows = await db.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: "asc" } });
      return {
        header: ["data", "cintura_cm", "quadril_cm", "peitoral_cm", "braco_cm", "coxa_cm", "panturrilha_cm", "pescoco_cm", "gordura_pct"],
        rows: rows.map((r) => [fromDbDate(r.date), r.waist, r.hip, r.chest, r.arm, r.thigh, r.calf, r.neck, r.bodyFat]),
      };
    }
    case "dieta": {
      const items = await db.mealFood.findMany({
        where: { meal: { userId } },
        orderBy: [{ meal: { date: "asc" } }, { createdAt: "asc" }],
        select: { quantity: true, kcal: true, protein: true, carbs: true, fat: true, food: { select: { name: true, unit: true } }, meal: { select: { date: true, type: true } } },
      });
      return {
        header: ["data", "refeicao", "alimento", "quantidade", "unidade", "kcal", "proteina_g", "carboidrato_g", "gordura_g"],
        rows: items.map((i) => [fromDbDate(i.meal.date), MEAL_LABEL[i.meal.type], i.food.name, i.quantity, UNIT_LABEL[i.food.unit], i.kcal, i.protein, i.carbs, i.fat]),
      };
    }
  }
}

/** Download dos dados do usuário em CSV (abre no Excel/Planilhas). */
export async function GET(_req: Request, { params }: RouteContext<"/api/export/[kind]">) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { kind } = await params;
  if (!(KINDS as readonly string[]).includes(kind)) return new NextResponse("Not found", { status: 404 });

  const { header, rows } = await build(userId, kind as Kind);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leandro-gym-${kind}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
