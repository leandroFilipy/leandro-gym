"use server";

import { db } from "../db";
import { isAdmin } from "../monitoring/errors";
import { requireUserId } from "../session";
import { fail, ok, refreshApp, type ActionResult } from "./_utils";

/** Apaga um grupo de erros (já resolvido) ou todos. Só admins. */
export async function clearErrorsAction(fingerprint: string | null): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!(await isAdmin(userId))) return fail("Sem permissão");
  await db.errorLog.deleteMany({ where: fingerprint ? { fingerprint } : {} });
  refreshApp();
  return ok;
}
