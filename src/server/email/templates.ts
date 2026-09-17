import "server-only";
import { emailLayout, esc, LINE, MUTED, ACCENT, FG } from "./layout";
import { MUSCLE_LABEL } from "@/lib/labels";
import { fmtFullDate, fmtInt, fmtKg, fmtPercent, fmtRest, WEEKDAY_LONG } from "@/lib/format";
import type { MuscleGroup } from "@/generated/prisma/enums";
import type { WeeklyReportData } from "@/server/services/reports";
import type { DateStr } from "@/lib/dates";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

// ───────────── Treino do dia ─────────────

export interface DailyWorkoutExercise {
  name: string;
  muscleGroup: MuscleGroup;
  plannedSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
}

export interface DailyWorkoutEmailInput {
  name: string; // nome do treinador/usuário (opcional em texto)
  date: DateStr;
  weekday: number; // ISO
  dayName: string | null; // ex.: "Peito + Tríceps" — null = descanso/sem treino
  isRest: boolean;
  exercises: DailyWorkoutExercise[];
}

export function dailyWorkoutEmail(input: DailyWorkoutEmailInput): { subject: string; html: string; text: string } {
  const weekdayLabel = WEEKDAY_LONG[input.weekday] ?? "";
  const dateLabel = fmtFullDate(input.date);

  if (input.isRest || !input.dayName) {
    const subject = `Hoje é dia de descanso 😴 — ${dateLabel}`;
    const bodyHtml = `<p style="margin:0 0 12px;">Hoje (${esc(weekdayLabel)}, ${esc(dateLabel)}) não há treino na sua ficha ativa. Aproveite para descansar e se recuperar.</p>
      <p style="margin:0;color:${MUTED};">Bora manter a hidratação e a proteína em dia. 💪</p>`;
    return {
      subject,
      html: emailLayout({ title: "Dia de descanso", preview: "Sem treino hoje — foco na recuperação.", bodyHtml, ctaText: "Abrir o app", ctaHref: `${appUrl()}/treino` }),
      text: `Hoje (${weekdayLabel}, ${dateLabel}) é dia de descanso. Aproveite para se recuperar.`,
    };
  }

  const rows = input.exercises
    .map(
      (e, i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};vertical-align:top;">
          <div style="font-weight:600;color:${FG};">${i + 1}. ${esc(e.name)}</div>
          <div style="font-size:12px;color:${MUTED};margin-top:2px;">${esc(MUSCLE_LABEL[e.muscleGroup] ?? "")}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};text-align:right;vertical-align:top;white-space:nowrap;color:${MUTED};font-size:13px;">
          <span style="color:${FG};font-weight:600;">${e.plannedSets}×${e.repMin}–${e.repMax}</span><br>
          descanso ${esc(fmtRest(e.restSeconds))}
        </td>
      </tr>`,
    )
    .join("");

  const bodyHtml = `<p style="margin:0 0 4px;">Treino de <strong>${esc(weekdayLabel)}</strong> — ${esc(dateLabel)}</p>
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${ACCENT};">${esc(input.dayName)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;

  const text = [
    `Treino de ${weekdayLabel} (${dateLabel}): ${input.dayName}`,
    ...input.exercises.map((e, i) => `${i + 1}. ${e.name} — ${e.plannedSets}x${e.repMin}-${e.repMax}, descanso ${fmtRest(e.restSeconds)}`),
  ].join("\n");

  return {
    subject: `Treino de hoje: ${input.dayName} 💪`,
    html: emailLayout({ title: input.dayName, preview: `${input.exercises.length} exercícios — bora treinar!`, bodyHtml, ctaText: "Começar treino", ctaHref: `${appUrl()}/treino` }),
    text,
  };
}

// ───────────── Relatório semanal ─────────────

function statRow(label: string, value: string, hint?: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${LINE};color:${MUTED};font-size:14px;">${esc(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${LINE};text-align:right;color:${FG};font-weight:600;">${value}${hint ? ` <span style="color:${MUTED};font-weight:400;font-size:12px;">${esc(hint)}</span>` : ""}</td>
  </tr>`;
}

export function weeklyReportEmail(report: WeeklyReportData): { subject: string; html: string; text: string } {
  const period = `${fmtFullDate(report.weekStart)} a ${fmtFullDate(report.weekEnd)}`;

  const volumeHint = report.volumeChangePct == null ? undefined : `(${fmtPercent(report.volumeChangePct)} vs semana anterior)`;
  const weightLine =
    report.weightEnd != null
      ? statRow("Peso médio", `${report.weightEnd.toFixed(1)} kg`, report.weightStart != null ? `(${(report.weightEnd - report.weightStart >= 0 ? "+" : "−")}${Math.abs(report.weightEnd - report.weightStart).toFixed(1)} kg)` : undefined)
      : "";
  const kcalLine = report.avgKcal != null ? statRow("Média de calorias", `${fmtInt(report.avgKcal)} kcal`, `(${report.daysLogged} dias registrados)`) : "";
  const proteinLine = report.avgProtein != null ? statRow("Média de proteína", `${fmtInt(report.avgProtein)} g`) : "";

  const recordsHtml = report.records.length
    ? `<p style="margin:20px 0 8px;font-weight:700;color:${ACCENT};">🔥 Recordes da semana</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
         ${report.records.map((r) => statRow(r.exercise, `${fmtKg(r.weight)} × ${r.repetitions}`)).join("")}
       </table>`
    : "";

  const bodyHtml = `<p style="margin:0 0 16px;color:${MUTED};">Resumo da semana — ${esc(period)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${statRow("Treinos realizados", `${report.workoutsDone}${report.workoutsPlanned ? ` / ${report.workoutsPlanned}` : ""}`)}
      ${statRow("Volume total", `${fmtInt(report.volume)} kg`, volumeHint)}
      ${weightLine}
      ${kcalLine}
      ${proteinLine}
    </table>
    ${recordsHtml}`;

  const text = [
    `Relatório semanal (${period})`,
    `Treinos: ${report.workoutsDone}${report.workoutsPlanned ? `/${report.workoutsPlanned}` : ""}`,
    `Volume: ${fmtInt(report.volume)} kg${volumeHint ? ` ${volumeHint}` : ""}`,
    report.weightEnd != null ? `Peso médio: ${report.weightEnd.toFixed(1)} kg` : "",
    report.avgKcal != null ? `Calorias médias: ${fmtInt(report.avgKcal)} kcal (${report.daysLogged} dias)` : "",
    report.records.length ? `Recordes: ${report.records.map((r) => `${r.exercise} ${r.weight}kg×${r.repetitions}`).join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Seu resumo da semana 📊 (${fmtFullDate(report.weekStart)})`,
    html: emailLayout({ title: "Resumo da semana", preview: `${report.workoutsDone} treinos, ${fmtInt(report.volume)} kg de volume.`, bodyHtml, ctaText: "Ver progresso", ctaHref: `${appUrl()}/progresso` }),
    text,
  };
}

export function passwordResetEmail(input: { name: string; url: string }): { subject: string; html: string; text: string } {
  const hello = input.name ? `Oi, ${esc(input.name.split(" ")[0])}!` : "Oi!";
  const bodyHtml = `<p style="margin:0 0 12px;">${hello} Recebemos um pedido para redefinir a senha da sua conta.</p>
    <p style="margin:0 0 4px;color:${MUTED};">O link vale por <strong style="color:${FG};">1 hora</strong> e só pode ser usado uma vez.</p>`;
  return {
    subject: "Redefinir sua senha — Leandro Gym",
    html: emailLayout({
      title: "Redefinir senha",
      preview: "Link para criar uma nova senha (vale por 1 hora).",
      bodyHtml,
      ctaText: "Criar nova senha",
      ctaHref: input.url,
      footerHtml: "Não foi você? Pode ignorar este e-mail — sua senha continua a mesma.",
    }),
    text: `${input.name ? `Oi, ${input.name.split(" ")[0]}! ` : ""}Para redefinir sua senha, abra o link (vale por 1 hora):\n${input.url}\n\nNão foi você? Ignore este e-mail.`,
  };
}
