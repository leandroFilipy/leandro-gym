import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { toDbDate, type DateStr } from "@/lib/dates";
import { waterGoalMl } from "@/lib/domain/water";

/** Água do dia + meta (manual ou pelo peso mais recente). */
export async function getWaterDay(userId: string, date: DateStr) {
  const [settings, log, lastWeight] = await Promise.all([
    getSettings(userId),
    db.waterLog.findUnique({ where: { userId_date: { userId, date: toDbDate(date) } }, select: { ml: true } }),
    db.bodyWeight.findFirst({ where: { userId, date: { lte: toDbDate(date) } }, orderBy: { date: "desc" }, select: { weightKg: true } }),
  ]);
  return {
    date,
    ml: log?.ml ?? 0,
    goalMl: waterGoalMl(lastWeight?.weightKg, settings.waterGoalMl),
    auto: settings.waterGoalMl == null,
  };
}
