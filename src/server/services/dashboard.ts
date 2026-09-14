import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { hourIn, todayIn } from "@/lib/dates";
import { getLastFinishedSession, getToday, getWeekCalendar } from "./workouts";
import { getActiveGoal, getDayTotals } from "./nutrition";
import { getWeightSummary } from "./body";
import { listRecentRecords } from "./records";

export async function getDashboard(userId: string) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const hour = hourIn(settings.timezone);

  const [user, todayInfo, week, lastSession, totals, goal, weight, records] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    getToday(userId),
    getWeekCalendar(userId),
    getLastFinishedSession(userId),
    getDayTotals(userId, today),
    getActiveGoal(userId, today),
    getWeightSummary(userId, today),
    listRecentRecords(userId, 3),
  ]);

  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.name?.split(" ")[0] ?? null;

  return { greeting, firstName, today, todayInfo, week, lastSession, totals, goal, weight, records };
}
