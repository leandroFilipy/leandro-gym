import "server-only";
import { db } from "../db";
import { todayIn, toDbDate } from "@/lib/dates";
import { ageFromBirthDate, computeNutritionGoal } from "@/lib/domain/energy";

/**
 * Recalcula a meta diária de nutrição a partir do perfil do usuário e do peso mais
 * recente, gravando-a como a meta que vale a partir de hoje (upsert em `startDate = hoje`).
 *
 * Só age quando `autoNutritionGoal` está ligado e o perfil tem os dados mínimos
 * (altura, sexo, data de nascimento e ao menos um registro de peso). Retorna a meta
 * calculada, ou `null` quando não há dados suficientes / o modo automático está desligado.
 */
export async function recalcAutoNutritionGoal(userId: string) {
  const settings = await db.userSettings.findUnique({ where: { userId } });
  if (!settings?.autoNutritionGoal) return null;
  if (settings.heightCm == null || settings.sex == null || settings.birthDate == null) return null;

  const lastWeight = await db.bodyWeight.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
  });
  if (!lastWeight) return null;

  const goal = computeNutritionGoal({
    weightKg: lastWeight.weightKg,
    heightCm: settings.heightCm,
    ageYears: ageFromBirthDate(settings.birthDate),
    sex: settings.sex,
    activityLevel: settings.activityLevel,
    dietGoal: settings.dietGoal,
  });

  const startDate = toDbDate(todayIn(settings.timezone));
  const existing = await db.nutritionGoal.findFirst({ where: { userId, startDate } });
  if (existing) await db.nutritionGoal.update({ where: { id: existing.id }, data: goal });
  else await db.nutritionGoal.create({ data: { ...goal, userId, startDate } });

  return goal;
}
