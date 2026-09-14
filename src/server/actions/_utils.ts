import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

export const ok = { ok: true } as const;

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * Valida e devolve os dados ou a primeira mensagem de erro.
 * Uso: `const { data, error } = validate(...); if (error !== undefined) return fail(error);`
 * (a comparação com undefined é o que faz o TS saber que `data` existe depois).
 */
export function validate<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { data: z.infer<S>; error: undefined } | { data: undefined; error: string } {
  const r = schema.safeParse(input);
  if (r.success) return { data: r.data, error: undefined };
  return { data: undefined, error: r.error.issues[0]?.message ?? "Dados inválidos" };
}

/** Converte FormData em objeto simples (para validar com Zod). */
export function formToObject(fd: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(fd.entries());
}

/** App pequeno: revalidar tudo é simples e barato. */
export function refreshApp() {
  revalidatePath("/", "layout");
}
