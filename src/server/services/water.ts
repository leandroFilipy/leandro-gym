import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, fromDbDate, toDbDate, type DateStr } from "@/lib/dates";
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

/** Água dos últimos `days` dias antes de `today` (mais recente primeiro; dias sem registro = 0). */
export async function getWaterHistory(userId: string, today: DateStr, days = 7) {
  const from = addDays(today, -days);
  const logs = await db.waterLog.findMany({
    where: { userId, date: { gte: toDbDate(from), lt: toDbDate(today) } },
    select: { date: true, ml: true },
  });
  const byDate = new Map(logs.map((l) => [fromDbDate(l.date), l.ml]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(i + 1));
    return { date, ml: byDate.get(date) ?? 0 };
  });
}
