import "server-only";
import { db } from "../db";
import { addDays, fromDbDate, isoWeekday, toDbDate, type DateStr } from "@/lib/dates";
import { goalForDay, type DayKind } from "@/lib/domain/carb-cycling";
import { getSettings } from "../session";
import { sumMacros } from "@/lib/domain/nutrition";
import { median, suggestMeals, type SuggestionFood } from "@/lib/domain/meal-suggestions";
import type { DatedValue, Macros } from "@/lib/domain/types";
import { MEAL_TYPES } from "@/lib/labels";

export async function getActiveGoal(userId: string, date: DateStr) {
  return db.nutritionGoal.findFirst({
    where: { userId, startDate: { lte: toDbDate(date) } },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Meta que vale no dia. Com o ciclo de carboidrato ligado, ajusta pelo tipo do dia: treino se a
 * ficha ativa tem treino nesse dia da semana ou se houve sessão na data; descanso caso contrário.
 */
export async function getDayGoal(userId: string, date: DateStr) {
  const [base, settings] = await Promise.all([getActiveGoal(userId, date), getSettings(userId)]);
  if (!base) return { goal: null, base: null, dayKind: null, carbsDelta: 0 };
  const baseMacros = { kcal: base.kcal, protein: base.protein, carbs: base.carbs, fat: base.fat };
  if (!settings.carbCyclingEnabled) return { goal: baseMacros, base: baseMacros, dayKind: null, carbsDelta: 0 };

  const [plan, session] = await Promise.all([
    db.workoutPlan.findFirst({ where: { userId, active: true }, select: { days: { select: { weekday: true, type: true } } } }),
    db.workoutSession.findFirst({ where: { userId, date: toDbDate(date) }, select: { id: true } }),
  ]);
  if (!plan) return { goal: baseMacros, base: baseMacros, dayKind: null, carbsDelta: 0 };

  const trainingDays = plan.days.filter((d) => d.type !== "REST").length;
  const planDay = plan.days.find((d) => d.weekday === isoWeekday(date));
  const dayKind: DayKind = session || (planDay && planDay.type !== "REST") ? "training" : "rest";
  const goal = goalForDay(baseMacros, dayKind, { restDayCarbsCut: settings.restDayCarbsCut, trainingDays, restDays: 7 - trainingDays });
  return { goal, base: baseMacros, dayKind, carbsDelta: goal.carbs - baseMacros.carbs };
}

export async function getDiary(userId: string, date: DateStr) {
  const [meals, previousMeals] = await Promise.all([
    db.meal.findMany({
      where: { userId, date: toDbDate(date) },
      include: {
        foods: { orderBy: { createdAt: "asc" }, include: { food: { select: { name: true, unit: true } } } },
      },
    }),
    // Dia anterior: atalho "repetir de ontem" nas refeições vazias.
    db.meal.findMany({
      where: { userId, date: toDbDate(addDays(date, -1)), foods: { some: {} } },
      select: { type: true, foods: { select: { kcal: true, food: { select: { name: true } } } } },
    }),
  ]);
  const { goal, dayKind, carbsDelta } = await getDayGoal(userId, date);

  const byType = MEAL_TYPES.map((type) => {
    const meal = meals.find((m) => m.type === type);
    const items = meal?.foods ?? [];
    const prev = previousMeals.find((m) => m.type === type);
    return {
      type,
      mealId: meal?.id ?? null,
      previous: prev
        ? { count: prev.foods.length, kcal: prev.foods.reduce((n, f) => n + f.kcal, 0), names: prev.foods.map((f) => f.food.name) }
        : null,
      items: items.map((i) => ({
        id: i.id,
        name: i.food.name,
        unit: i.food.unit,
        quantity: i.quantity,
        kcal: i.kcal,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
      })),
      totals: sumMacros(items),
    };
  });

  return { date, meals: byType, totals: sumMacros(byType.map((m) => m.totals)), goal, dayKind, carbsDelta };
}

export async function getDayTotals(userId: string, date: DateStr): Promise<Macros> {
  const items = await db.mealFood.findMany({
    where: { meal: { userId, date: toDbDate(date) } },
    select: { kcal: true, protein: true, carbs: true, fat: true },
  });
  return sumMacros(items);
}

/** Totais por dia no intervalo [from, to]. Dias sem registro não aparecem. */
export async function getDailyTotals(userId: string, from: DateStr, to: DateStr) {
  const items = await db.mealFood.findMany({
    where: { meal: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } } },
    select: { kcal: true, protein: true, carbs: true, fat: true, meal: { select: { date: true } } },
  });
  const map = new Map<DateStr, Macros>();
  for (const i of items) {
    const d = fromDbDate(i.meal.date);
    map.set(d, sumMacros([map.get(d) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }, i]));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, m]) => ({ date, ...m }));
}

export async function getIntakeSeries(userId: string, today: DateStr, days: number): Promise<DatedValue[]> {
  const totals = await getDailyTotals(userId, addDays(today, -(days - 1)), today);
  return totals.map((t) => ({ date: t.date, value: t.kcal }));
}

export function listFoods(userId: string, query?: string) {
  return db.food.findMany({
    where: {
      archived: false,
      OR: [{ userId }, { userId: null }],
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    take: query ? 30 : 500,
  });
}

/** Alimentos usados com mais frequência (atalhos na busca). */
export async function listFrequentFoods(userId: string, take = 8) {
  const grouped = await db.mealFood.groupBy({
    by: ["foodId"],
    where: { meal: { userId } },
    _count: { foodId: true },
    orderBy: { _count: { foodId: "desc" } },
    take,
  });
  const foods = await db.food.findMany({ where: { id: { in: grouped.map((g) => g.foodId) }, archived: false } });
  return grouped.map((g) => foods.find((f) => f.id === g.foodId)).filter((f) => f !== undefined);
}

/**
 * "O que eu como agora?": até 12 alimentos mais registrados nos últimos 60 dias, com a
 * quantidade habitual, combinados para fechar o que falta da meta.
 */
export async function getMealSuggestions(userId: string, today: DateStr, target: Macros) {
  const rows = await db.mealFood.findMany({
    where: { meal: { userId, date: { gte: toDbDate(addDays(today, -60)) } }, food: { archived: false } },
    orderBy: { createdAt: "desc" },
    take: 1500,
    select: { quantity: true, food: true },
  });

  const byFood = new Map<string, { food: (typeof rows)[number]["food"]; quantities: number[] }>();
  for (const r of rows) {
    const entry = byFood.get(r.food.id) ?? { food: r.food, quantities: [] };
    entry.quantities.push(r.quantity);
    byFood.set(r.food.id, entry);
  }
  const foods: SuggestionFood[] = [...byFood.values()]
    .sort((a, b) => b.quantities.length - a.quantities.length)
    .slice(0, 12)
    .map(({ food: f, quantities }) => ({
      id: f.id, name: f.name, unit: f.unit, servingSize: f.servingSize,
      kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
      usualQuantity: median(quantities),
    }));

  return { hasHistory: foods.length > 0, suggestions: suggestMeals(target, foods) };
}

export async function listFavorites(userId: string) {
  const favs = await db.favoriteMeal.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { items: { include: { food: true } } },
  });
  return favs.map((f) => ({
    id: f.id,
    name: f.name,
    items: f.items.map((i) => ({ id: i.id, name: i.food.name, unit: i.food.unit, quantity: i.quantity })),
    totals: sumMacros(
      f.items.map((i) => {
        const k = i.food.servingSize > 0 ? i.quantity / i.food.servingSize : 0;
        return { kcal: i.food.kcal * k, protein: i.food.protein * k, carbs: i.food.carbs * k, fat: i.food.fat * k };
      }),
    ),
  }));
}
