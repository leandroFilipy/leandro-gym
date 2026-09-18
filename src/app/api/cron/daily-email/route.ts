import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { isAuthorizedCron } from "@/server/cron/auth";
import { getEmailSender, dailyWorkoutEmail, type DailyWorkoutExercise } from "@/server/email";
import { sendPushToUser } from "@/server/push";
import { getStagnationAlerts } from "@/server/services/insights";
import { getPreviousPerformance } from "@/server/services/workouts";
import { hourIn, isoWeekday, todayIn } from "@/lib/dates";
import { pickMessage, type PatraoVars } from "@/lib/domain/patrao";

// Executa no runtime Node (Prisma + pg não rodam no edge).
export const runtime = "nodejs";
// Nunca em cache: o horário atual muda a cada execução.
export const dynamic = "force-dynamic";

/**
 * Lembrete do treino do dia (e-mail e/ou push) para cada usuário cujo horário
 * configurado (HH no fuso dele) bate com "agora". Idempotente por hora: pensado
 * para rodar de hora em hora (ex.: Vercel Cron `0 * * * *`).
 */
async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const sender = getEmailSender();

  const users = await db.user.findMany({
    where: { settings: { OR: [{ dailyEmailEnabled: true }, { pushEnabled: true }] } },
    select: {
      id: true,
      email: true,
      name: true,
      settings: { select: { timezone: true, dailyEmailTime: true, dailyEmailEnabled: true, pushEnabled: true, patraoTone: true } },
    },
  });

  let emails = 0;
  let pushes = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const settings = user.settings;
    if (!settings) {
      skipped++;
      continue;
    }

    const targetHour = Number(settings.dailyEmailTime.slice(0, 2));
    if (hourIn(settings.timezone, now) !== targetHour) {
      skipped++;
      continue;
    }

    try {
      const date = todayIn(settings.timezone, now);
      const weekday = isoWeekday(date);

      const plan = await db.workoutPlan.findFirst({
        where: { userId: user.id, active: true },
        select: {
          days: {
            where: { weekday },
            select: {
              name: true,
              type: true,
              exercises: {
                orderBy: { order: "asc" },
                select: {
                  exerciseId: true,
                  plannedSets: true,
                  repMin: true,
                  repMax: true,
                  restSeconds: true,
                  exercise: { select: { name: true, muscleGroup: true } },
                },
              },
            },
          },
        },
      });

      const day = plan?.days[0] ?? null;
      const isRest = !day || day.type === "REST" || day.exercises.length === 0;
      const dayName = isRest ? null : (day?.name ?? null);
      const exercises: DailyWorkoutExercise[] = (day?.exercises ?? []).map((e) => ({
        name: e.exercise.name,
        muscleGroup: e.exercise.muscleGroup,
        plannedSets: e.plannedSets,
        repMin: e.repMin,
        repMax: e.repMax,
        restSeconds: e.restSeconds,
      }));

      if (settings.dailyEmailEnabled) {
        const { subject, html, text } = dailyWorkoutEmail({ name: user.name ?? "", date, weekday, dayName, isRest, exercises });
        await sender.send({ to: user.email, subject, html, text });
        emails++;
      }

      if (settings.pushEnabled) {
        // Sem dó / Carrasco: se um exercício de hoje está em platô, o corpo do push vira cobrança.
        const plateau = !isRest && settings.patraoTone !== "MANSO" ? await plateauVars(user.id, day?.exercises.map((e) => e.exerciseId) ?? []) : null;
        const delivered = await sendPushToUser(user.id, {
          title: isRest ? "Hoje é dia de descanso 😴" : `Treino de hoje: ${dayName}`,
          body: isRest
            ? "Sem treino na ficha ativa. Foco na recuperação."
            : plateau
              ? pickMessage("plateau", settings.patraoTone, plateau, `${user.id}:${date}`)
              : `${exercises.length} exercícios — bora treinar! 💪`,
          url: "/treino",
          tag: "daily-workout",
        });
        if (delivered > 0) pushes++;
      }
    } catch (err) {
      errors.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, candidates: users.length, emails, pushes, skipped, errors });
}

/** Primeiro exercício do dia em platô/regressão, com a carga mais alta do último treino dele. */
async function plateauVars(userId: string, exerciseIds: string[]): Promise<PatraoVars | null> {
  if (exerciseIds.length === 0) return null;
  const alert = (await getStagnationAlerts(userId)).find((a) => exerciseIds.includes(a.exerciseId));
  if (!alert) return null;
  const last = await getPreviousPerformance(userId, alert.exerciseId);
  const top = last?.sets.length ? Math.max(...last.sets.map((s) => s.weight)) : null;
  return top ? { exercicio: alert.name, carga: top.toLocaleString("pt-BR") } : null;
}

export const GET = run;
export const POST = run;
