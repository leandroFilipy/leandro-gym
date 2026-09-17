"use server";

import { z } from "zod";
import { db } from "../db";
import { getSettings, requireUserId } from "../session";
import { isValidDateStr, todayIn, toDbDate } from "@/lib/dates";
import { scaleMacros } from "@/lib/domain/nutrition";
import { barcodeVariants, isValidBarcode, normalizeBarcode, offProductBasics, offProductToFood, type FoodPrefill, type OffProduct } from "@/lib/domain/barcode";
import { FoodUnit, MealType } from "@/generated/prisma/enums";
import type { Food } from "@/generated/prisma/client";
import type { FoodOption } from "@/features/diet/types";
import { AiError, isAiConfigured, parseImageDataUrl } from "../ai/gemini";
import { readNutritionLabel } from "../ai/label";
import { estimatePlate, type PlateEstimate } from "../ai/plate";
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

const addFoodsSchema = z.object({
  date: dateSchema,
  mealType: z.enum(MealType),
  items: z.array(z.object({ foodId: z.string().min(1), quantity: quantitySchema })).min(1).max(20),
});

/** Registra vários alimentos de uma vez (sugestões e foto do prato). */
export async function addFoodsToMealAction(input: z.input<typeof addFoodsSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(addFoodsSchema, input);
  if (error !== undefined) return fail(error);

  const foods = await db.food.findMany({
    where: { id: { in: data.items.map((i) => i.foodId) }, OR: [{ userId }, { userId: null }] },
  });
  const byId = new Map(foods.map((f) => [f.id, f]));
  if (data.items.some((i) => !byId.has(i.foodId))) return fail("Alimento não encontrado");

  const meal = await getOrCreateMeal(userId, data.date, data.mealType);
  await db.mealFood.createMany({
    data: data.items.map((i) => ({ mealId: meal.id, foodId: i.foodId, quantity: i.quantity, ...scaleMacros(byId.get(i.foodId)!, i.quantity) })),
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
  barcode: z
    .string()
    .optional()
    .transform((value) => normalizeBarcode(value ?? ""))
    .refine((value) => !value || isValidBarcode(value), "Código de barras inválido")
    .transform((value) => value || null),
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

// ───────────── Código de barras ─────────────

export type BarcodeLookup =
  | { status: "found"; food: FoodOption; created: boolean }
  /** prefill: nome/foto quando o produto existe no Open Food Facts mas sem tabela nutricional. */
  | { status: "not_found"; barcode: string; prefill: FoodPrefill | null };

const OFF_FIELDS = "product_name,product_name_pt,generic_name_pt,brands,quantity,image_front_small_url,image_front_url,nutriments";

function toFoodOption(f: Food): FoodOption {
  return {
    id: f.id, name: f.name, servingSize: f.servingSize, unit: f.unit,
    kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
    imageUrl: f.imageUrl, sourceName: f.sourceName, barcode: f.barcode, mine: f.userId !== null,
  };
}

/** Busca no Open Food Facts (base aberta e colaborativa). null se não achar ou falhar. */
async function fetchOpenFoodFacts(barcode: string): Promise<OffProduct | null> {
  for (const code of barcodeVariants(barcode)) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, {
        headers: { "User-Agent": "LeandroGym/0.1 (app pessoal de treino e dieta)" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { status?: number; product?: OffProduct };
      if (json.status === 1 && json.product) return json.product;
    } catch {
      // rede lenta ou fora do ar: tenta a próxima variação
    }
  }
  return null;
}

/**
 * Código lido → alimento. Ordem: alimentos do usuário/base com esse código → Open Food Facts
 * (cria um alimento do usuário com os dados por 100 g/ml) → não encontrado (cadastro manual).
 */
export async function lookupBarcodeAction(raw: string): Promise<ActionResult<BarcodeLookup>> {
  const userId = await requireUserId();
  const barcode = normalizeBarcode(raw);
  if (!isValidBarcode(barcode)) return fail("Código de barras inválido");

  const existing = await db.food.findFirst({
    where: { barcode: { in: barcodeVariants(barcode) }, archived: false, OR: [{ userId }, { userId: null }] },
    orderBy: { userId: { sort: "desc", nulls: "last" } }, // prefere o do usuário
  });
  if (existing) return { ok: true, data: { status: "found", food: toFoodOption(existing), created: false } };

  const product = await fetchOpenFoodFacts(barcode);
  const draft = product ? offProductToFood(product) : null;
  if (!draft) return { ok: true, data: { status: "not_found", barcode, prefill: product ? offProductBasics(product) : null } };

  const food = await db.food.create({
    data: {
      ...draft,
      userId,
      barcode,
      sourceName: "Open Food Facts",
      sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
    },
  });
  refreshApp();
  return { ok: true, data: { status: "found", food: toFoodOption(food), created: true } };
}

// ───────────── Foto do prato (IA) ─────────────

const PHOTO_SOURCE = "Estimativa por foto (IA)";

export type PlateItem = PlateEstimate["items"][number];

/** Analisa a foto (data URL já compactada no cliente) e devolve os itens estimados. Não grava nada. */
export async function analyzePlatePhotoAction(dataUrl: string): Promise<ActionResult<{ items: PlateItem[]; note: string }>> {
  await requireUserId();
  if (!isAiConfigured()) return fail("A análise por foto ainda não foi configurada (falta GEMINI_API_KEY).");
  if (dataUrl.length > 3_000_000) return fail("Foto muito grande");
  const image = parseImageDataUrl(dataUrl);
  if (!image) return fail("Formato de imagem inválido");

  try {
    const r = await estimatePlate(image);
    if (!r.isFood || r.items.length === 0) return fail("Não encontrei comida nesta foto. Tente enquadrar o prato de cima.");
    const items = r.items
      .filter((i) => i.grams > 0)
      .map((i) => ({ ...i, name: i.name.trim().slice(0, 80), grams: Math.round(i.grams), kcal: Math.max(0, i.kcal), protein: Math.max(0, i.protein), carbs: Math.max(0, i.carbs), fat: Math.max(0, i.fat) }));
    return { ok: true, data: { items, note: r.note } };
  } catch (e) {
    console.error("[analyzePlatePhotoAction]", e);
    return fail(e instanceof AiError ? e.message : "Falha ao analisar a foto. Tente de novo.");
  }
}

/** Foto da tabela nutricional → valores para pré-preencher o cadastro do alimento. Não grava nada. */
export async function readNutritionLabelAction(dataUrl: string): Promise<ActionResult<FoodPrefill>> {
  await requireUserId();
  if (!isAiConfigured()) return fail("A leitura por foto ainda não foi configurada (falta GEMINI_API_KEY).");
  if (dataUrl.length > 3_000_000) return fail("Foto muito grande");
  const image = parseImageDataUrl(dataUrl);
  if (!image) return fail("Formato de imagem inválido");

  try {
    const r = await readNutritionLabel(image);
    if (!r.isLabel || r.servingSize <= 0) return fail("Não consegui ler a tabela nutricional. Tire a foto de perto, reta e com boa luz.");
    const round1 = (n: number) => Math.round(Math.max(0, n) * 10) / 10;
    return {
      ok: true,
      data: {
        ...(r.name.trim() ? { name: r.name.trim().slice(0, 80) } : {}),
        servingSize: round1(r.servingSize),
        unit: r.unit,
        kcal: Math.round(Math.max(0, r.kcal)),
        protein: round1(r.protein),
        carbs: round1(r.carbs),
        fat: round1(r.fat),
      },
    };
  } catch (e) {
    console.error("[readNutritionLabelAction]", e);
    return fail(e instanceof AiError ? e.message : "Falha ao ler a foto. Tente de novo.");
  }
}

const plateItemsSchema = z.object({
  date: dateSchema,
  mealType: z.enum(MealType),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        grams: z.coerce.number().positive().max(5000),
        kcal: z.coerce.number().min(0).max(10_000),
        protein: z.coerce.number().min(0).max(1000),
        carbs: z.coerce.number().min(0).max(1000),
        fat: z.coerce.number().min(0).max(1000),
      }),
    )
    .min(1, "Selecione ao menos um item")
    .max(20),
});

/**
 * Registra os itens confirmados. Cada item vira um alimento do usuário arquivado (não aparece
 * na busca) com os macros da porção estimada — assim editar a quantidade depois recalcula certo.
 */
export async function logPlateItemsAction(input: z.input<typeof plateItemsSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(plateItemsSchema, input);
  if (error !== undefined) return fail(error);

  const meal = await getOrCreateMeal(userId, data.date, data.mealType);
  await db.$transaction(async (tx) => {
    for (const i of data.items) {
      const food = await tx.food.create({
        data: {
          userId, name: i.name, servingSize: i.grams, unit: FoodUnit.G,
          kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat,
          sourceName: PHOTO_SOURCE, archived: true,
        },
      });
      await tx.mealFood.create({ data: { mealId: meal.id, foodId: food.id, quantity: i.grams, ...scaleMacros(food, i.grams) } });
    }
  });
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
