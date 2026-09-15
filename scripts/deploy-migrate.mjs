// Aplica as migrações do Prisma durante o build da Vercel.
//
// Contexto: o runtime serverless usa a DATABASE_URL *pooled*, mas migrações precisam de
// conexão *direta*. Se DIRECT_URL existir, usamos ela; senão caímos na DATABASE_URL.
//
// Regra de ouro: NUNCA derrubar o build por causa disso. Se a migração falhar (ex.: banco
// dormindo, pooler recusando DDL), registramos o erro e seguimos — o deploy anterior de
// código continua válido e dá para reprocessar depois. Assim evitamos travar todos os
// deploys por um problema de conexão pontual.

import { execSync } from "node:child_process";

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.warn("[deploy-migrate] Sem DATABASE_URL/DIRECT_URL — pulando migrate deploy.");
  process.exit(0);
}

try {
  console.log("[deploy-migrate] Aplicando migrações (prisma migrate deploy)…");
  execSync("prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: directUrl },
  });
  console.log("[deploy-migrate] Migrações aplicadas com sucesso.");
} catch (err) {
  console.error("[deploy-migrate] Falha ao aplicar migrações (build segue mesmo assim):", err?.message ?? err);
  // Não propaga o erro: o build não deve quebrar por causa da migração.
}
