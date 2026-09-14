import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";

/** Usuário autenticado ou redireciona para /login. Use em pages e server actions. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

/** Para route handlers: devolve null em vez de redirecionar. */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Configurações do usuário (cria com padrões se ainda não existir). */
export const getSettings = cache(async (userId: string) => {
  return db.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
});
