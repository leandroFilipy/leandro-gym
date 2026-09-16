import { NextResponse } from "next/server";
import { db } from "@/server/db";

// ROTA TEMPORÁRIA — aplica a migração session_pause no banco de produção via SQL idempotente
// (o `migrate deploy` do build não roda sobre a conexão pooled). Remover após uso.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== "diag-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const out: Record<string, unknown> = {};
  const run = async (label: string, sql: string) => {
    try {
      await db.$executeRawUnsafe(sql);
      out[label] = "ok";
    } catch (e) {
      out[label] = "erro: " + String((e as Error)?.message ?? e);
    }
  };

  if (url.searchParams.get("fix") === "1") {
    await run("col pausedAt", `ALTER TABLE "WorkoutSession" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);`);
    await run("col pausedSeconds", `ALTER TABLE "WorkoutSession" ADD COLUMN IF NOT EXISTS "pausedSeconds" INTEGER NOT NULL DEFAULT 0;`);
    await run(
      "registrar migração",
      `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
       SELECT gen_random_uuid()::text, 'manual-diag', '20260916120000_session_pause', now(), now(), 1
       WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260916120000_session_pause');`,
    );
  }

  // Confirma o estado das colunas
  try {
    const cols = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'WorkoutSession'`,
    );
    const names = cols.map((c) => c.column_name);
    out.has = { pausedAt: names.includes("pausedAt"), pausedSeconds: names.includes("pausedSeconds") };
  } catch (e) {
    out.error = String((e as Error)?.message ?? e);
  }

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
