"use server";

import { z } from "zod";
import { db } from "../db";
import { requireUserId } from "../session";
import { isValidDateStr, toDbDate } from "@/lib/dates";
import { MEASUREMENT_FIELDS } from "@/lib/domain/measurements";
import { PhotoPose } from "@/generated/prisma/enums";
import { recalcAutoNutritionGoal } from "../services/nutrition-goal";
import { fail, formToObject, ok, refreshApp, validate, type ActionResult } from "./_utils";

const weightSchema = z.object({
  date: z.string().refine(isValidDateStr, "Data inválida"),
  weightKg: z.coerce.number().min(20, "Peso inválido").max(400, "Peso inválido"),
});

/** Um registro por dia: salvar de novo no mesmo dia substitui. */
export async function saveWeightAction(input: { date: string; weightKg: number }): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(weightSchema, input);
  if (error !== undefined) return fail(error);
  const date = toDbDate(data.date);
  await db.bodyWeight.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, weightKg: data.weightKg },
    update: { weightKg: data.weightKg },
  });
  // Se o modo automático estiver ligado, atualiza a meta de macros/calorias com o novo peso.
  await recalcAutoNutritionGoal(userId);
  refreshApp();
  return ok;
}

export async function deleteWeightAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.bodyWeight.deleteMany({ where: { id, userId } });
  refreshApp();
  return ok;
}

// ───────────── Medidas ─────────────

/** Campo numérico opcional vindo de formulário: vazio → null; aceita vírgula decimal. */
const optionalCm = (min: number, max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim().replace(",", ".") : v))
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), "Medida fora do intervalo");

const measurementSchema = z
  .object({
    date: z.string().refine(isValidDateStr, "Data inválida"),
    waist: optionalCm(30, 250),
    hip: optionalCm(30, 250),
    chest: optionalCm(30, 250),
    arm: optionalCm(10, 80),
    thigh: optionalCm(20, 120),
    calf: optionalCm(15, 80),
    neck: optionalCm(20, 70),
    bodyFat: optionalCm(2, 70),
  })
  .refine((m) => MEASUREMENT_FIELDS.some((f) => m[f] !== null), "Preencha pelo menos uma medida");

/** Um registro por dia: salvar de novo no mesmo dia substitui os campos. */
export async function saveMeasurementAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(measurementSchema, formToObject(fd));
  if (error !== undefined) return fail(error);
  const { date: dateStr, ...values } = data;
  const date = toDbDate(dateStr);
  await db.bodyMeasurement.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...values },
    update: values,
  });
  refreshApp();
  return ok;
}

export async function deleteMeasurementAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.bodyMeasurement.deleteMany({ where: { id, userId } });
  refreshApp();
  return ok;
}

// ───────────── Fotos de progresso ─────────────

const jpegDataUrl = (max: number) =>
  z
    .string()
    .max(max, "Foto muito grande")
    .refine((v) => /^data:image\/(jpeg|png|webp);base64,/.test(v), "Imagem inválida");

const photoSchema = z.object({
  date: z.string().refine(isValidDateStr, "Data inválida"),
  pose: z.enum(PhotoPose),
  imageUrl: jpegDataUrl(900_000),
  thumbUrl: jpegDataUrl(80_000),
});

/** Uma foto por dia e pose: enviar de novo substitui. */
export async function saveBodyPhotoAction(input: z.input<typeof photoSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(photoSchema, input);
  if (error !== undefined) return fail(error);
  const date = toDbDate(data.date);
  await db.bodyPhoto.upsert({
    where: { userId_date_pose: { userId, date, pose: data.pose } },
    create: { userId, date, pose: data.pose, imageUrl: data.imageUrl, thumbUrl: data.thumbUrl },
    update: { imageUrl: data.imageUrl, thumbUrl: data.thumbUrl },
  });
  refreshApp();
  return ok;
}

export async function deleteBodyPhotoAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.bodyPhoto.deleteMany({ where: { id, userId } });
  refreshApp();
  return ok;
}
