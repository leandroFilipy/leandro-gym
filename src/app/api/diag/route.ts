import { NextResponse } from "next/server";
import { db } from "@/server/db";

// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover depois.
// Reporta se as colunas das últimas migrações existem no banco de PRODUÇÃO e captura o
// erro real de cada consulta. Não expõe dados de usuário. Protegida por um token simples
// na query (?k=) para não ficar totalmente aberta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== "diag-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const out: Record<string, unknown> = {};

  // 1) Migrações aplicadas (tabela do Prisma)
  try {
    const migrations = await db.$queryRawUnsafe<{ migration_name: string; finished_at: Date | null }[]>(
      `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at`,
    );
    out.migrations = migrations.map((m) => ({ name: m.migration_name, applied: m.finished_at != null }));
  } catch (e) {
    out.migrationsError = String((e as Error)?.message ?? e);
  }

  // 2) Colunas novas de UserSettings
  try {
    const cols = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'UserSettings'`,
    );
    const names = cols.map((c) => c.column_name);
    out.userSettingsHas = {
      heightCm: names.includes("heightCm"),
      sex: names.includes("sex"),
      birthDate: names.includes("birthDate"),
      activityLevel: names.includes("activityLevel"),
      dietGoal: names.includes("dietGoal"),
      autoNutritionGoal: names.includes("autoNutritionGoal"),
    };
  } catch (e) {
    out.userSettingsError = String((e as Error)?.message ?? e);
  }

  // 3) Colunas novas de Food
  try {
    const cols = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Food'`,
    );
    const names = cols.map((c) => c.column_name);
    out.foodHas = {
      imageUrl: names.includes("imageUrl"),
      sourceName: names.includes("sourceName"),
      sourceUrl: names.includes("sourceUrl"),
    };
    out.foodCount = Number((await db.food.count({ where: { userId: null } })) ?? 0);
  } catch (e) {
    out.foodError = String((e as Error)?.message ?? e);
  }

  // 4) Consulta idêntica à da home (getSettings faz upsert) — captura o erro real
  try {
    const first = await db.userSettings.findFirst({ select: { id: true } });
    out.userSettingsQueryOk = true;
    out.hasAnySettings = first != null;
  } catch (e) {
    out.userSettingsQueryError = String((e as Error)?.message ?? e);
  }

  // 5) fix=1 → aplica a migração de perfil nutricional de forma idempotente, via SQL bruto
  //    (a conexão pooled aceita DDL simples; o `migrate deploy` do build não estava aplicando).
  if (url.searchParams.get("fix") === "1") {
    const steps: Record<string, string> = {};
    const run = async (label: string, sql: string) => {
      try {
        await db.$executeRawUnsafe(sql);
        steps[label] = "ok";
      } catch (e) {
        steps[label] = "erro: " + String((e as Error)?.message ?? e);
      }
    };

    // Enums (idempotente via DO/exception)
    await run("enum Sex", `DO $$ BEGIN CREATE TYPE "Sex" AS ENUM ('MALE','FEMALE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await run("enum ActivityLevel", `DO $$ BEGIN CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY','LIGHT','MODERATE','ACTIVE','VERY_ACTIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await run("enum DietGoal", `DO $$ BEGIN CREATE TYPE "DietGoal" AS ENUM ('LOSE','MAINTAIN','GAIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

    // Colunas (IF NOT EXISTS = idempotente)
    await run("col activityLevel", `ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "activityLevel" "ActivityLevel" NOT NULL DEFAULT 'MODERATE';`);
    await run("col autoNutritionGoal", `ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "autoNutritionGoal" BOOLEAN NOT NULL DEFAULT false;`);
    await run("col birthDate", `ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "birthDate" DATE;`);
    await run("col dietGoal", `ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "dietGoal" "DietGoal" NOT NULL DEFAULT 'MAINTAIN';`);
    await run("col heightCm", `ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "heightCm" DOUBLE PRECISION;`);
    await run("col sex", `ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "sex" "Sex";`);

    // Registra a migração no controle do Prisma (evita conflito em deploys futuros)
    await run(
      "registrar migração",
      `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
       SELECT gen_random_uuid()::text, 'manual-diag', '20260915170000_perfil_nutricional', now(), now(), 1
       WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260915170000_perfil_nutricional');`,
    );

    out.fix = steps;
  }

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
