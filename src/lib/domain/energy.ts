import { daysBetween } from "../dates";
import type { DatedValue, Macros } from "./types";

/** kcal aproximadas por kg de variação de peso corporal. */
export const KCAL_PER_KG = 7700;

// ───────────────────────────── Meta automática de nutrição ─────────────────────────────
// Espelham os enums do Prisma (mantidos como literais para o domínio ficar puro).

export type Sex = "MALE" | "FEMALE";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type DietGoal = "LOSE" | "MAINTAIN" | "GAIN";

/** Multiplicador da TMB para estimar o TDEE por nível de atividade. */
export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/** Ajuste calórico sobre o TDEE conforme o objetivo (déficit/manutenção/superávit). */
export const GOAL_KCAL_ADJUST: Record<DietGoal, number> = {
  LOSE: -0.2, // ~20% de déficit
  MAINTAIN: 0,
  GAIN: 0.1, // ~10% de superávit
};

/** Proteína alvo (g/kg de peso corporal) por objetivo. */
const PROTEIN_G_PER_KG: Record<DietGoal, number> = {
  LOSE: 2.2,
  MAINTAIN: 1.8,
  GAIN: 2,
};

/** Gordura alvo (g/kg de peso corporal). Restante das calorias vai para carboidratos. */
const FAT_G_PER_KG = 0.9;

export interface NutritionProfile {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  dietGoal: DietGoal;
}

/**
 * Taxa metabólica basal (TMB) pela equação de Mifflin-St Jeor.
 *   homens:   10·peso + 6.25·altura − 5·idade + 5
 *   mulheres: 10·peso + 6.25·altura − 5·idade − 161
 */
export function mifflinStJeorBMR(p: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears;
  return base + (p.sex === "MALE" ? 5 : -161);
}

/**
 * Meta diária de nutrição a partir do perfil.
 * BMR (Mifflin-St Jeor) → TDEE (× fator de atividade) → ajuste por objetivo → macros.
 * Proteína e gordura são definidas por kg de peso; o restante das calorias vira carboidrato
 * (piso de 0 g). Retorna valores inteiros, prontos para gravar em `NutritionGoal`.
 */
export function computeNutritionGoal(profile: NutritionProfile): Macros {
  return computeNutritionGoalBreakdown(profile).goal;
}

export interface NutritionGoalBreakdown {
  bmr: number; // TMB (kcal em repouso)
  tdee: number; // gasto total = TMB × fator de atividade
  goal: Macros; // meta após ajuste do objetivo
}

/**
 * Igual a `computeNutritionGoal`, mas também devolve a TMB e o TDEE intermediários
 * (para mostrar o cálculo ao usuário no Perfil).
 */
export function computeNutritionGoalBreakdown(profile: NutritionProfile): NutritionGoalBreakdown {
  const bmr = mifflinStJeorBMR(profile);
  const tdee = bmr * ACTIVITY_FACTOR[profile.activityLevel];
  const kcal = Math.max(0, tdee * (1 + GOAL_KCAL_ADJUST[profile.dietGoal]));

  const protein = PROTEIN_G_PER_KG[profile.dietGoal] * profile.weightKg;
  const fat = FAT_G_PER_KG * profile.weightKg;
  const remainingKcal = Math.max(0, kcal - protein * 4 - fat * 9);
  const carbs = remainingKcal / 4;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goal: {
      kcal: Math.round(kcal),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    },
  };
}

/** Idade em anos completos a partir da data de nascimento (referência = hoje). */
export function ageFromBirthDate(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

export interface EnergyBalance {
  avgIntake: number | null;
  daysLogged: number;
  dailyBalance: number | null; // positivo = superávit, negativo = déficit
  weeklyBalance: number | null;
}

/** Balanço estimado = consumo médio (só dias com registro) − TDEE informado. */
export function energyBalance(tdee: number | null, dailyIntakes: readonly DatedValue[]): EnergyBalance {
  const logged = dailyIntakes.filter((d) => d.value > 0);
  const avgIntake = logged.length ? logged.reduce((s, d) => s + d.value, 0) / logged.length : null;
  const dailyBalance = tdee && avgIntake !== null ? avgIntake - tdee : null;
  return {
    avgIntake,
    daysLogged: logged.length,
    dailyBalance,
    weeklyBalance: dailyBalance !== null ? dailyBalance * 7 : null,
  };
}

export interface AdaptiveTdee {
  tdee: number;
  avgIntake: number;
  weightTrendKgPerWeek: number;
  days: number;
}

/**
 * TDEE adaptativo (fase 3): gasto ≈ consumo médio − (variação de peso × 7700 / dias).
 * Usa a inclinação (regressão linear) do peso para reduzir ruído diário.
 * Retorna null se houver menos de `minDays` de dados.
 */
export function estimateAdaptiveTdee(
  weights: readonly DatedValue[],
  intakes: readonly DatedValue[],
  minDays = 14,
): AdaptiveTdee | null {
  const loggedIntakes = intakes.filter((d) => d.value > 0);
  if (weights.length < 7 || loggedIntakes.length < minDays * 0.7) return null;

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const span = daysBetween(sorted[0].date, sorted[sorted.length - 1].date);
  if (span < minDays) return null;

  const xs = sorted.map((w) => daysBetween(sorted[0].date, w.date));
  const ys = sorted.map((w) => w.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slopePerDay = den ? num / den : 0;

  const avgIntake = loggedIntakes.reduce((s, d) => s + d.value, 0) / loggedIntakes.length;
  return {
    tdee: avgIntake - slopePerDay * KCAL_PER_KG,
    avgIntake,
    weightTrendKgPerWeek: slopePerDay * 7,
    days: span,
  };
}
