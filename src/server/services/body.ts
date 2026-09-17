import "server-only";
import { db } from "../db";
import { addDays, fromDbDate, toDbDate, type DateStr } from "@/lib/dates";
import { movingAverage, weeklyComparison } from "@/lib/domain/weight";
import { estimateAdaptiveTdee, type AdaptiveTdee } from "@/lib/domain/energy";
import type { DatedValue } from "@/lib/domain/types";
import type { PhotoPose } from "@/generated/prisma/enums";
import { getIntakeSeries } from "./nutrition";

export async function getWeightSeries(userId: string, from?: DateStr): Promise<(DatedValue & { id: string })[]> {
  const rows = await db.bodyWeight.findMany({
    where: { userId, ...(from ? { date: { gte: toDbDate(from) } } : {}) },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({ id: r.id, date: fromDbDate(r.date), value: r.weightKg }));
}

export async function getWeightSummary(userId: string, today: DateStr) {
  // 13 dias para a comparação + 6 de folga para a média móvel do início
  const series = await getWeightSeries(userId, addDays(today, -60));
  const latest = series.at(-1) ?? null;
  const todayEntry = series.find((s) => s.date === today) ?? null;
  const trend = movingAverage(series, 7);
  return {
    latest,
    todayEntry,
    comparison: weeklyComparison(series, today),
    // série e média móvel alinhadas por índice (ambas ordenadas por data)
    chart: series.map((s, i) => ({ date: s.date, peso: s.value, media: Math.round(trend[i].value * 10) / 10 })),
    recent: [...series].reverse().slice(0, 14),
  };
}

// ───────────── Medidas e fotos ─────────────

export async function getMeasurements(userId: string) {
  const rows = await db.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { id: true, date: true, waist: true, hip: true, chest: true, arm: true, thigh: true, calf: true, neck: true, bodyFat: true },
  });
  return rows.map((r) => ({ ...r, date: fromDbDate(r.date) }));
}

/** Galeria: só miniaturas (as fotos grandes são carregadas apenas na comparação). */
export async function listBodyPhotos(userId: string) {
  const rows = await db.bodyPhoto.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { pose: "asc" }],
    select: { id: true, date: true, pose: true },
  });
  return rows.map((r) => ({ ...r, date: fromDbDate(r.date), thumbUrl: `/api/body-photos/${r.id}?size=thumb` }));
}

export async function getBodyPhoto(userId: string, date: DateStr, pose: PhotoPose) {
  const r = await db.bodyPhoto.findFirst({
    where: { userId, date: toDbDate(date), pose },
    select: { id: true, date: true, pose: true },
  });
  return r ? { ...r, date: fromDbDate(r.date), imageUrl: `/api/body-photos/${r.id}?size=full` } : null;
}

/**
 * TDEE adaptativo: cruza a tendência de peso com o consumo médio registrado.
 * Usa uma janela de `days` (padrão 28) e exige pelo menos `minDays` de dados.
 * Retorna null quando ainda não há histórico suficiente.
 */
export async function getAdaptiveTdee(
  userId: string,
  today: DateStr,
  days = 28,
  minDays = 14,
): Promise<AdaptiveTdee | null> {
  const [weights, intakes] = await Promise.all([
    getWeightSeries(userId, addDays(today, -(days - 1))),
    getIntakeSeries(userId, today, days),
  ]);
  return estimateAdaptiveTdee(weights, intakes, minDays);
}
