import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { relativeStrength } from "@/lib/domain/strength";

/** Peso mais recente + sexo do perfil: base da força relativa. */
export async function getStrengthContext(userId: string) {
  const [latest, settings] = await Promise.all([
    db.bodyWeight.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { weightKg: true } }),
    getSettings(userId),
  ]);
  const bodyWeightKg = latest?.weightKg ?? null;
  const sex = settings.sex ?? null;
  return {
    bodyWeightKg,
    sex,
    evaluate: (exerciseName: string, oneRm: number) =>
      bodyWeightKg ? relativeStrength(exerciseName, oneRm, bodyWeightKg, sex) : null,
  };
}
