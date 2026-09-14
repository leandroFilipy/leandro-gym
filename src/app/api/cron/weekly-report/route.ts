import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { isAuthorizedCron } from "@/server/cron/auth";
import { getEmailSender, weeklyReportEmail } from "@/server/email";
import { buildWeeklyReport } from "@/server/services/reports";
import { addDays, startOfIsoWeek, toDbDate, todayIn } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gera e envia o relatório semanal. Pensado para rodar 1×/semana (ex.: domingo
 * à noite, `0 21 * * 0`). Por padrão usa a semana ISO que contém "hoje" no fuso
 * do usuário; `?weekOffset=-1` reporta a semana anterior.
 * Grava `WeeklyReport` e marca `emailedAt` de quem tem o relatório por e-mail ativo.
 */
async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const offsetParam = Number(req.nextUrl.searchParams.get("weekOffset") ?? "0");
  const weekOffset = Number.isFinite(offsetParam) ? Math.trunc(offsetParam) : 0;

  const now = new Date();
  const sender = getEmailSender();

  const users = await db.user.findMany({
    where: { settings: { weeklyReportEnabled: true } },
    select: {
      id: true,
      email: true,
      settings: { select: { timezone: true } },
    },
  });

  let emailed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const timezone = user.settings?.timezone ?? "America/Sao_Paulo";
    const weekStart = addDays(startOfIsoWeek(todayIn(timezone, now)), weekOffset * 7);

    try {
      const report = await buildWeeklyReport(user.id, weekStart);

      await db.weeklyReport.upsert({
        where: { userId_weekStart: { userId: user.id, weekStart: toDbDate(weekStart) } },
        create: { userId: user.id, weekStart: toDbDate(weekStart), data: { ...report }, emailedAt: new Date() },
        update: { data: { ...report }, emailedAt: new Date() },
      });

      const { subject, html, text } = weeklyReportEmail(report);
      await sender.send({ to: user.email, subject, html, text });
      emailed++;
    } catch (err) {
      errors.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, candidates: users.length, emailed, errors });
}

export const GET = run;
export const POST = run;
