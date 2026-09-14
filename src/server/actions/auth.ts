"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "../db";
import { todayIn, toDbDate } from "@/lib/dates";
import { fail, formToObject, validate, type ActionResult } from "./_utils";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(60),
  email: z.email("E-mail inválido").transform((e) => e.toLowerCase().trim()),
  password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
});

export async function registerAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { data, error } = validate(registerSchema, formToObject(fd));
  if (error !== undefined) return fail(error);

  const exists = await db.user.findUnique({ where: { email: data.email } });
  if (exists) return fail("Já existe uma conta com esse e-mail");

  const settingsTz = "America/Sao_Paulo";
  await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
      settings: { create: { timezone: settingsTz } },
      // Meta inicial genérica — o usuário ajusta no Perfil.
      nutritionGoals: {
        create: { kcal: 2500, protein: 160, carbs: 280, fat: 70, startDate: toDbDate(todayIn(settingsTz)) },
      },
    },
  });

  return loginWith(data.email, data.password);
}

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "");
  const password = String(fd.get("password") ?? "");
  return loginWith(email, password);
}

async function loginWith(email: string, password: string): Promise<ActionResult> {
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return fail("E-mail ou senha incorretos");
    throw e; // NEXT_REDIRECT precisa propagar
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
