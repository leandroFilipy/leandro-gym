"use server";

import { z } from "zod";
import { db } from "../db";
import { getSettings, requireUserId } from "../session";
import { isValidDateStr, todayIn, toDbDate } from "@/lib/dates";
import { scaleMacros } from "@/lib/domain/nutrition";
import { FoodUnit, MealType } from "@/generated/prisma/enums";
import { fail, formToObject, ok, refreshApp, validate, type ActionResult } from "./_utils";

const dateSchema = z.string().refine(isValidDateStr, "Data inválida");
const quantitySchema = z.coerce.number().positive("Quantidade inválida").max(10_000);

/** Alimento visível para o usuário: dele ou da base compartilhada. */
function findVisibleFood(userId: string, foodId: string) {
  return db.food.findFirst({ where: { id: foodId, OR: [{ userId }, { userId: null }] } });
}

async function getOrCreateMeal(userId: string, date: string, type: MealType) {
  const d = toDbDate(date);
  return db.meal.upsert({
    where: { userId_date_type: { userId, date: d, type } },
    create: { userId, date: d, type },
    update: {},
  });
}

// ───────────── Diário ─────────────

const addFoodSchema = z.object({
  date: dateSchema,
  mealType: z.enum(MealType),
  foodId: z.string().min(1),
  quantity: quantitySchema,
});

export async function addFoodToMealAction(input: z.input<typeof addFoodSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(addFoodSchema, input);
  if (error !== undefined) return fail(error);

  const food = await findVisibleFood(userId, data.foodId);
  if (!food) return fail("Alimento não encontrado");

  const meal = await getOrCreateMeal(userId, data.date, data.mealType);
  await db.mealFood.create({
    data: { mealId: meal.id, foodId: food.id, quantity: data.quantity, ...scaleMacros(food, data.quantity) },
  });
  refreshApp();
  return ok;
}

export async function updateMealFoodAction(id: string, quantity: number): Promise<ActionResult> {
  const userId = await requireUserId();
  const q = quantitySchema.safeParse(quantity);
  if (!q.success) return fail("Quantidade inválida");

  const item = await db.mealFood.findFirst({ where: { id, meal: { userId } }, include: { food: true } });
  if (!item) return fail("Item não encontrado");
  await db.mealFood.update({ where: { id }, data: { quantity: q.data, ...scaleMacros(item.food, q.data) } });
  refreshApp();
  return ok;
}

export async function removeMealFoodAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.mealFood.deleteMany({ where: { id, meal: { userId } } });
  refreshApp();
  return ok;
}

// ───────────── Favoritas ─────────────

export async function applyFavoriteAction(favoriteId: string, date: string, mealType: MealType): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!isValidDateStr(date)) return fail("Data inválida");
  const fav = await db.favoriteMeal.findFirst({ where: { id: favoriteId, userId }, include: { items: { include: { food: true } } } });
  if (!fav) return fail("Refeição favorita não encontrada");

  const meal = await getOrCreateMeal(userId, date, mealType);
  await db.mealFood.createMany({
    data: fav.items.map((i) => ({ mealId: meal.id, foodId: i.foodId, quantity: i.quantity, ...scaleMacros(i.food, i.quantity) })),
  });
  refreshApp();
  return ok;
}

export async function saveMealAsFavoriteAction(mealId: string, name: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const n = z.string().trim().min(1, "Informe o nome").max(60).safeParse(name);
  if (!n.success) return fail(n.error.issues[0].message);

  const meal = await db.meal.findFirst({ where: { id: mealId, userId }, include: { foods: true } });
  if (!meal || meal.foods.length === 0) return fail("Refeição vazia");
  await db.favoriteMeal.create({
    data: {
      userId,
      name: n.data,
      items: { create: meal.foods.map((f) => ({ foodId: f.foodId, quantity: f.quantity })) },
    },
  });
  refreshApp();
  return ok;
}

export async function deleteFavoriteAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.favoriteMeal.deleteMany({ where: { id, userId } });
  refreshApp();
  return ok;
}

// ───────────── Alimentos ─────────────

const foodSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  servingSize: z.coerce.number().positive("Quantidade inválida"),
  unit: z.enum(FoodUnit),
  kcal: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  imageUrl: z.string().trim().max(500_000, "Imagem muito grande").refine(
    (value) => !value || value.startsWith("data:image/") || /^https?:\/\//i.test(value),
    "Use uma imagem válida ou uma URL iniciada por http",
  ).transform((value) => value || null),
});

export async function createFoodAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(foodSchema, formToObject(fd));
  if (error !== undefined) return fail(error);
  await db.food.create({ data: { ...data, userId } });
  refreshApp();
  return ok;
}

export async function updateFoodAction(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(foodSchema, formToObject(fd));
  if (error !== undefined) return fail(error);
  // Alimentos da base (userId null) não podem ser editados.
  const r = await db.food.updateMany({ where: { id, userId }, data });
  if (!r.count) return fail("Só é possível editar alimentos criados por você");
  refreshApp();
  return ok;
}

export async function archiveFoodAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.food.updateMany({ where: { id, userId }, data: { archived: true } });
  refreshApp();
  return ok;
}

// ───────────── Metas ─────────────

const goalSchema = z.object({
  kcal: z.coerce.number().int().min(500).max(10_000),
  protein: z.coerce.number().int().min(0).max(1000),
  carbs: z.coerce.number().int().min(0).max(2000),
  fat: z.coerce.number().int().min(0).max(1000),
});

/** Nova meta vale a partir de hoje (histórico preservado). */
export async function saveGoalAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(goalSchema, formToObject(fd));
  if (error !== undefined) return fail(error);
  const settings = await getSettings(userId);
  const startDate = toDbDate(todayIn(settings.timezone));

  const existing = await db.nutritionGoal.findFirst({ where: { userId, startDate } });
  if (existing) await db.nutritionGoal.update({ where: { id: existing.id }, data });
  else await db.nutritionGoal.create({ data: { ...data, userId, startDate } });
  refreshApp();
  return ok;
}
