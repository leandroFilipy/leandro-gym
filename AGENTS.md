# Guia para agentes / quem for continuar o projeto

1. Leia `docs/ARCHITECTURE.md` (decisões) e `docs/ROADMAP.md` (o que falta).
2. Stack: Next.js 16 (App Router), React 19, TS strict, Tailwind v4, Prisma 7, Auth.js v5.
   - Next 16: o arquivo de middleware se chama `src/proxy.ts`. Docs locais em
     `node_modules/next/dist/docs/` — consulte antes de usar APIs que você não conhece.
   - Prisma 7: URL do banco fica em `prisma.config.ts`; o client é importado de
     `@/generated/prisma/client` e usa `@prisma/adapter-pg`. Rode `npx prisma generate`
     depois de mudar o schema.
3. Regras do código:
   - Toda leitura/escrita passa por `requireUserId()` e filtra por `userId`.
   - Regras de negócio puras em `src/lib/domain` (sem Prisma/React).
   - Mutations = server actions em `src/server/actions/*` validadas com Zod.
   - Nada de `any`. Componentes pequenos; um módulo por pasta em `src/features`.
   - Textos da interface em português (pt-BR).
4. Antes de terminar: `npx tsc --noEmit` e `npm run lint` sem erros; atualize o ROADMAP.
5. Ideias recusadas pelo dono — **não sugerir** de novo:
   - Calculadora/contador de anilhas.
   - Trocar exercício/máquina quando o aparelho estiver ocupado.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
