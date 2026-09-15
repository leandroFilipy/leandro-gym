import "dotenv/config";
import { defineConfig } from "prisma/config";

// Em produção (Vercel) o runtime usa a URL *pooled* (DATABASE_URL). Migrações precisam de
// conexão *direta*: se DIRECT_URL existir, usamos ela para migrate/db push; senão, caímos
// de volta na DATABASE_URL (útil localmente, onde não há pooler).
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
