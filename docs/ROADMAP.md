# Roadmap e status

> **Para quem for continuar (humano ou IA):** leia `AGENTS.md` e `docs/ARCHITECTURE.md`
> primeiro. Marque `[x]` SOMENTE quando o item estiver implementado e compilando.
> Adicione notas no "Log" no fim do arquivo.

## Fase 1 — MVP

### Bloco 0 — Fundação
- [x] Next.js 16 + TS + Tailwind v4 + dependências
- [x] Documentação (ARCHITECTURE, ROADMAP, AGENTS)
- [x] Schema Prisma completo (todas as entidades, inclusive fases futuras)
- [x] Prisma 7 config + client singleton (`src/server/db.ts`)
- [x] Seed de alimentos base (`prisma/seed.ts`)
- [x] Auth.js config + proxy de rotas (`src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`)
- [x] Telas de login/cadastro + action de registro
- [x] PWA: manifest, ícones, service worker básico

### Camada de servidor
- [x] Regras puras: `src/lib/domain/*` (volume, progressão, PR, peso, energia, nutrição)
- [x] Helpers de data/formatação/labels (`src/lib/dates.ts`, `format.ts`, `labels.ts`)
- [x] Serviços de leitura: `src/server/services/{workouts,records,nutrition,body}.ts`
- [x] Serviço de dashboard e estatísticas
- [x] Server actions: exercícios, fichas, sessão, peso, dieta, configurações
- [x] `POST/DELETE /api/sets` (upsert idempotente + detecção de PR)

### Bloco 1 — Layout e UI base
- [x] Tema dark, tokens de cor
- [x] Componentes UI (Button, Card, Stepper, ProgressBar, Sheet, Field)
- [x] BottomNav (mobile) + sidebar (desktop)

### Bloco 2 — Exercícios e fichas
- [x] Biblioteca de exercícios (CRUD, grupo muscular)
- [x] Fichas (CRUD, ativar ficha), dias da semana, exercícios do dia

### Bloco 3 — Treino de hoje / Modo academia (PRIORIDADE MÁXIMA)
- [x] Iniciar sessão a partir do dia (snapshot)
- [x] Tela de sessão: exercício atual, último treino, meta, sugestão de carga
- [x] Stepper de carga/reps, RIR, CONCLUIR SÉRIE, pré-preencher próxima
- [x] Outbox offline de séries
- [x] Cronômetro de descanso (+30s, vibração, som, notificação, wake lock)
- [x] Aviso de PR, finalizar treino + resumo (volume vs anterior)

### Bloco 4 — Histórico
- [x] Histórico por exercício, lista de sessões, calendário semanal

### Bloco 5 — Peso corporal
- [x] Registro diário, média móvel 7 dias, variação semanal

### Bloco 6 — Dieta
- [x] Tabela de alimentos, diário por refeição, favoritas, metas, TDEE/déficit
- [x] Catálogo nutricional pesquisado, procedência, novas unidades e cadastro com foto

### Bloco 7 — Dashboard
- [x] Home com treino de hoje, dieta, peso, treinos da semana, último treino, PRs

## Fase 2
- [x] Página Progresso com gráficos + filtros de período
- [x] Área de recordes pessoais
- [x] Estatísticas (consistência, músculos mais/menos treinados)
- [x] E-mail do treino do dia (Resend + cron)
- [x] Relatório semanal (app + e-mail)
- [x] Push notifications

## Fase 3
- [x] Offline completo (service worker cacheando a sessão)
- [x] TDEE adaptativo na UI (função pronta em `lib/domain/energy.ts`)
- [ ] IA com ferramentas que consultam o banco
- [x] Testes (Vitest) para `lib/domain`

## Log
- 2026-09-11 — Fundação, schema, auth config, regras de domínio e serviços de leitura.
  Registro inicial; os blocos seguintes foram implementados sem atualização deste arquivo.
- 2026-09-11 — Estado real revisado. Corrigidos o typegen de rotas do Next 16, o link
  interno do seletor de exercícios, o export do `proxy.ts` e a dependência de Google Fonts
  no build. `npm run typecheck`, `npm run lint` e `npm run build` concluídos sem erros
  (build validado com variáveis de ambiente temporárias; configuração local ainda necessária).
- 2026-09-11 — Interface redesenhada com estética tecnológica minimalista. Catálogo base
  ampliado para 48 alimentos pesquisados em TACO, TBCA e informação nutricional da Growth,
  com fonte visível. Cadastro próprio agora aceita foto, calorias, macros e medidas em g, kg,
  ml, L, unidade ou porção.
- 2026-09-11 — Fase 2 concluída: camada de e-mail (`src/server/email`, Resend via `fetch` com
  fallback console + templates dark pt-BR), rotas de cron `/api/cron/daily-email` (treino do
  dia, de hora em hora) e `/api/cron/weekly-report` (domingo), ambas protegidas por
  `CRON_SECRET`. Push notifications: modelo `PushSubscription` + `UserSettings.pushEnabled`,
  `web-push` com VAPID (`src/server/push`), endpoints `/api/push` (subscribe/unsubscribe),
  handler `push` no `sw.js` e toggle no Perfil. Migração criada em
  `20260911184000_push_notifications` (aplicar com `prisma migrate deploy`; o banco local
  estava offline). `npm run typecheck` e `npm run lint` sem erros.
- 2026-09-14 — Fase 3 (parcial): (1) Testes com Vitest para `lib/domain` + `lib/dates`
  (`vitest.config.ts`, scripts `test`/`test:watch`, 50 testes em 7 arquivos, todos passando).
  (2) TDEE adaptativo na UI: `getAdaptiveTdee` em `server/services/body.ts` (janela de 28d,
  mínimo 14d) + `features/body/AdaptiveTdeeCard.tsx` na página `/progresso/peso`; validado
  ponta a ponta contra o banco (perda de 0,1 kg/dia com 2000 kcal → TDEE 2770). (3) Offline
  completo: `sw.js` v2 pré-cacheia `public/offline.html` e usa fallback de navegação para a
  última versão da rota em cache (sessão de treino) e, na falta, a página offline dedicada.
  Falta: IA com ferramentas que consultam o banco. `npm run typecheck`, `npm run lint`,
  `npm test` e `npm run build` sem erros.
- 2026-09-15 — Novo design com estética de academia: preto-ferro + laranja de sinalização
  (`#ff5b14`), Barlow / Barlow Condensed (títulos em caixa alta e itálico), cantos quase retos
  via tokens `--radius-*`, utilitários `eyebrow` e `hazard`, bottom nav encaixada e marca
  `components/layout/Wordmark.tsx`. A foto de perfil saiu da interface e ficou só nos ícones
  (aba, PWA, notificações), recortada com zoom para remover as bordas pretas. E-mail e
  `offline.html` seguem a nova paleta.
