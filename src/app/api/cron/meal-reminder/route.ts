import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { isAuthorizedCron } from "@/server/cron/auth";
import { sendPushToUser } from "@/server/push";
import { hourIn, todayIn, toDbDate } from "@/lib/dates";
import type { MealType } from "@/generated/prisma/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lembrete push de registrar refeição. Roda 2×/dia (vercel.json: ~13h30 e ~21h de Brasília —
 * o plano Hobby só permite crons diários). A refeição é escolhida pela hora local de cada
 * usuário: antes das 17h confere o almoço, depois o jantar. Só avisa se ela estiver vazia.
 */
async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const users = await db.user.findMany({
    where: { settings: { mealRemindersEnabled: true, pushEnabled: true } },
    select: { id: true, settings: { select: { timezone: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const timezone = user.settings?.timezone ?? "America/Sao_Paulo";
    const hour = hourIn(timezone, now);
    // Fora das janelas (madrugada, manhã) não incomoda.
    const meal: MealType | null = hour >= 12 && hour < 17 ? "LUNCH" : hour >= 19 && hour < 24 ? "DINNER" : null;
    if (!meal) {
      skipped++;
      continue;
    }

    try {
      const logged = await db.mealFood.count({
        where: { meal: { userId: user.id, date: toDbDate(todayIn(timezone, now)), type: meal } },
      });
      if (logged > 0) {
        skipped++;
        continue;
      }
      const delivered = await sendPushToUser(user.id, {
        title: meal === "LUNCH" ? "Registrou o almoço? 🍽️" : "Registrou o jantar? 🍽️",
        body: meal === "LUNCH" ? "Leva 30 segundos: foto do prato ou a favorita de sempre." : "Fecha o dia na dieta antes de esquecer.",
        url: "/dieta",
        tag: `meal-reminder-${meal}`,
      });
      if (delivered > 0) sent++;
    } catch (err) {
      errors.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, candidates: users.length, sent, skipped, errors });
}

export const GET = run;
export const POST = run;
