import "server-only";
import { db } from "../db";
import { addDays, fromDbDate, toDbDate, type DateStr } from "@/lib/dates";
import { sumMacros } from "@/lib/domain/nutrition";
import type { DatedValue, Macros } from "@/lib/domain/types";
import { MEAL_TYPES } from "@/lib/labels";

export async function getActiveGoal(userId: string, date: DateStr) {
  return db.nutritionGoal.findFirst({
    where: { userId, startDate: { lte: toDbDate(date) } },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getDiary(userId: string, date: DateStr) {
  const meals = await db.meal.findMany({
    where: { userId, date: toDbDate(date) },
    include: {
      foods: { orderBy: { createdAt: "asc" }, include: { food: { select: { name: true, unit: true } } } },
    },
  });
  const goal = await getActiveGoal(userId, date);

  const byType = MEAL_TYPES.map((type) => {
    const meal = meals.find((m) => m.type === type);
    const items = meal?.foods ?? [];
    return {
      type,
      mealId: meal?.id ?? null,
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

  return { date, meals: byType, totals: sumMacros(byType.map((m) => m.totals)), goal };
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
