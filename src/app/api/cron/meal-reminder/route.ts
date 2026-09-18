import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { isAuthorizedCron } from "@/server/cron/auth";
import { sendPushToUser } from "@/server/push";
import { getWaterDay } from "@/server/services/water";
import { hourIn, todayIn, toDbDate } from "@/lib/dates";
import { isWaterBehind } from "@/lib/domain/water";
import type { MealType } from "@/generated/prisma/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fmtL = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

/**
 * Lembretes push de refeição e de água. Roda 2×/dia (vercel.json: ~13h30 e ~21h de Brasília —
 * o plano Hobby só permite crons diários). Refeição: pela hora local, antes das 17h confere o
 * almoço, depois o jantar; só avisa se ela estiver vazia. Água: avisa se estiver bem abaixo do
 * esperado para a hora.
 */
async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const users = await db.user.findMany({
    where: { settings: { pushEnabled: true, OR: [{ mealRemindersEnabled: true }, { waterRemindersEnabled: true }] } },
    select: { id: true, settings: { select: { timezone: true, mealRemindersEnabled: true, waterRemindersEnabled: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const timezone = user.settings?.timezone ?? "America/Sao_Paulo";
    const hour = hourIn(timezone, now);
    const today = todayIn(timezone, now);

    try {
      if (user.settings?.mealRemindersEnabled) {
        // Fora das janelas (madrugada, manhã) não incomoda.
        const meal: MealType | null = hour >= 12 && hour < 17 ? "LUNCH" : hour >= 19 && hour < 24 ? "DINNER" : null;
        const logged = meal ? await db.mealFood.count({ where: { meal: { userId: user.id, date: toDbDate(today), type: meal } } }) : 1;
        if (meal && logged === 0) {
          const delivered = await sendPushToUser(user.id, {
            title: meal === "LUNCH" ? "Registrou o almoço? 🍽️" : "Registrou o jantar? 🍽️",
            body: meal === "LUNCH" ? "Leva 30 segundos: foto do prato ou a favorita de sempre." : "Fecha o dia na dieta antes de esquecer.",
            url: "/dieta",
            tag: `meal-reminder-${meal}`,
          });
          if (delivered > 0) sent++;
        } else skipped++;
      }

      if (user.settings?.waterRemindersEnabled && hour >= 10 && hour < 23) {
        const water = await getWaterDay(user.id, today);
        if (isWaterBehind(water.ml, water.goalMl, hour)) {
          const delivered = await sendPushToUser(user.id, {
            title: "Bora beber água? 💧",
            body: `Você está em ${fmtL(water.ml)} de ${fmtL(water.goalMl)} hoje.`,
            url: "/agua",
            tag: "water-reminder",
          });
          if (delivered > 0) sent++;
        } else skipped++;
      }
    } catch (err) {
      errors.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, candidates: users.length, sent, skipped, errors });
}

export const GET = run;
export const POST = run;
