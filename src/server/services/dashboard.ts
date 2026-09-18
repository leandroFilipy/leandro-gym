import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { hourIn, todayIn } from "@/lib/dates";
import { getLastFinishedSession, getToday, getWeekCalendar } from "./workouts";
import { getDayGoal, getDayTotals } from "./nutrition";
import { getWeightSummary } from "./body";
import { listRecentRecords } from "./records";
import { getStagnationAlerts, getWeeklyMuscleVolume } from "./insights";
import { getWaterDay } from "./water";

export async function getDashboard(userId: string) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const hour = hourIn(settings.timezone);

  const [user, todayInfo, week, lastSession, totals, goal, weight, records, stagnation, muscleVolume, water] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    getToday(userId),
    getWeekCalendar(userId),
    getLastFinishedSession(userId),
    getDayTotals(userId, today),
    getDayGoal(userId, today).then((g) => g.goal),
    getWeightSummary(userId, today),
    listRecentRecords(userId, 3),
    getStagnationAlerts(userId),
    getWeeklyMuscleVolume(userId),
    getWaterDay(userId, today),
  ]);

  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.name?.split(" ")[0] ?? null;

  return { greeting, firstName, today, todayInfo, week, lastSession, totals, goal, weight, records, stagnation, muscleVolume, water };
}
