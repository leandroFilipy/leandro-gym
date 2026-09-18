import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { isAuthorizedCron } from "@/server/cron/auth";
import { fmtLiters, sendPatraoPush } from "@/server/push/patrao";
import { getDayGoal, getDayTotals } from "@/server/services/nutrition";
import { getWaterDay } from "@/server/services/water";
import { hourIn, isoWeekday, todayIn, toDbDate } from "@/lib/dates";
import { isWaterBehind } from "@/lib/domain/water";
import type { PatraoVars } from "@/lib/domain/patrao";
import type { MealType } from "@/generated/prisma/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cobra proteína à noite abaixo desta fração da meta (só se algo foi registrado no dia). */
const PROTEIN_NIGHT_RATIO = 0.8;

/**
 * Lembretes push no tom do usuário (Manso / Sem dó / Carrasco). Roda 2×/dia (vercel.json: ~13h30 e
 * ~21h de Brasília — o plano Hobby só permite crons diários). Refeição: antes das 17h confere o
 * almoço, depois o jantar; só avisa se estiver vazia. Água: avisa se estiver bem abaixo do esperado.
 * Cobrança da noite (20h+): treino da ficha não feito hoje e proteína bem abaixo da meta.
 */
async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const users = await db.user.findMany({
    where: { settings: { pushEnabled: true, OR: [{ mealRemindersEnabled: true }, { waterRemindersEnabled: true }, { nightCheckEnabled: true }] } },
    select: {
      id: true,
      name: true,
      settings: { select: { timezone: true, mealRemindersEnabled: true, waterRemindersEnabled: true, nightCheckEnabled: true, patraoTone: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const settings = user.settings;
    if (!settings) continue;
    const hour = hourIn(settings.timezone, now);
    const today = todayIn(settings.timezone, now);
    const tone = settings.patraoTone;
    const nome = user.name?.trim().split(/\s+/)[0];
    const base: PatraoVars = nome ? { nome, hora: String(hour) } : { hora: String(hour) };
    const push = async (p: Omit<Parameters<typeof sendPatraoPush>[1], "tone" | "date">) => {
      if ((await sendPatraoPush(user.id, { ...p, tone, date: today, vars: { ...base, ...p.vars } })) > 0) sent++;
    };

    try {
      if (settings.mealRemindersEnabled) {
        // Fora das janelas (madrugada, manhã) não incomoda.
        const meal: MealType | null = hour >= 12 && hour < 17 ? "LUNCH" : hour >= 19 && hour < 24 ? "DINNER" : null;
        const logged = meal ? await db.mealFood.count({ where: { meal: { userId: user.id, date: toDbDate(today), type: meal } } }) : 1;
        if (meal && logged === 0) {
          await push({ scenario: "meal", vars: { refeicao: meal === "LUNCH" ? "almoço" : "jantar" }, url: "/dieta", tag: `meal-reminder-${meal}` });
        } else skipped++;
      }

      if (settings.waterRemindersEnabled && hour >= 10 && hour < 23) {
        const water = await getWaterDay(user.id, today);
        if (isWaterBehind(water.ml, water.goalMl, hour)) {
          await push({ scenario: "water", vars: { agua: fmtLiters(water.ml), meta_agua: fmtLiters(water.goalMl) }, url: "/agua", tag: "water-reminder" });
        } else skipped++;
      }

      if (settings.nightCheckEnabled && hour >= 20) {
        const missed = await missedWorkoutToday(user.id, today);
        if (missed) await push({ scenario: "missed", vars: { treino: missed }, url: "/treino", tag: "night-missed" });

        const [{ goal }, totals] = await Promise.all([getDayGoal(user.id, today), getDayTotals(user.id, today)]);
        if (goal && goal.protein > 0 && totals.kcal > 0 && totals.protein < goal.protein * PROTEIN_NIGHT_RATIO) {
          await push({
            scenario: "protein",
            vars: { proteina: String(Math.round(totals.protein)), falta_proteina: String(Math.round(goal.protein - totals.protein)) },
            url: "/dieta",
            tag: "night-protein",
          });
        }
      }
    } catch (err) {
      errors.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, candidates: users.length, sent, skipped, errors });
}

/** Nome do treino da ficha previsto para hoje, se nenhum treino (com série feita) aconteceu hoje. */
async function missedWorkoutToday(userId: string, today: string): Promise<string | null> {
  const [day, trained] = await Promise.all([
    db.workoutDay.findFirst({
      where: { weekday: isoWeekday(today), type: { not: "REST" }, plan: { userId, active: true }, exercises: { some: {} } },
      select: { name: true },
    }),
    db.workoutSession.count({
      where: { userId, date: toDbDate(today), OR: [{ finishedAt: { not: null } }, { exercises: { some: { sets: { some: { completed: true } } } } }] },
    }),
  ]);
  return day && trained === 0 ? day.name : null;
}

export const GET = run;
export const POST = run;
