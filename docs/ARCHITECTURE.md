# Arquitetura — Leandro Gym

App de treino, dieta e evolução física. PWA mobile-first (uso na academia) com telas
mais completas para consulta no desktop.

## Stack

| Camada        | Escolha                                   | Observação                                       |
|---------------|-------------------------------------------|--------------------------------------------------|
| Framework     | Next.js 16 (App Router) + React 19 + TS   | `proxy.ts` substitui o antigo `middleware.ts`    |
| Estilo        | Tailwind CSS v4                           | Tokens de tema em `src/app/globals.css`          |
| Banco         | PostgreSQL                                | Local: `npx prisma dev` (Prisma Postgres local)  |
| ORM           | Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) | Client gerado em `src/generated/prisma`   |
| Auth          | Auth.js (next-auth v5) — Credentials + JWT | Senha com bcrypt                                |
| Validação     | Zod 4                                     | Toda entrada de server action / API é validada   |
| Gráficos      | Recharts                                  |                                                  |
| Ícones        | lucide-react                              |                                                  |
| E-mail (fase 2) | Resend                                  | Interface `EmailSender` em `src/server/email` (via `fetch`, sem SDK) |
| Push (fase 2) | Web Push (`web-push` + VAPID)             | `src/server/push`; inscrições em `PushSubscription`; handler no `sw.js` |
| Cron (fase 2) | Rotas `/api/cron/*` protegidas por `CRON_SECRET` | Compatível com Vercel Cron / cron externo |

## Princípios

1. **Experiência de treino primeiro.** A tela de sessão (`/treino/sessao/[id]`) é um único
   componente cliente que nunca navega: série → descanso → próxima série.
2. **Cada série é um registro.** `ExerciseSet` é salvo individualmente assim que a série é concluída.
3. **Toda query é escopada por `userId`.** Nenhuma função de serviço recebe só um `id`;
   sempre `(userId, id)`. Relações filhas são verificadas via relação (`session: { userId }`).
   Isso impede acessar dados de outro usuário trocando IDs na URL/API.
4. **Regras de negócio são funções puras** em `src/lib/domain/*` (volume, progressão, PR,
   média móvel, balanço energético). Sem Prisma, sem React → testáveis e reutilizáveis pela IA.
5. **Snapshots.** Sessões copiam os parâmetros da ficha (séries, faixa de reps, descanso) e
   refeições copiam os macros do alimento. Editar a ficha/alimento não reescreve o histórico.
6. **Datas "de calendário"** (peso, refeição, sessão) usam `@db.Date` calculado no fuso do
   usuário (`UserSettings.timezone`). Helpers em `src/lib/dates.ts`.
7. **Offline-ready.** IDs de `ExerciseSet` são gerados no cliente (UUID) e o endpoint faz
   *upsert* → reenvio é idempotente. O cliente usa uma fila (outbox) em `localStorage`
   (`src/lib/offline/outbox.ts`) e reenvia quando a conexão volta.

## Estrutura de pastas

```
prisma/
  schema.prisma        modelo de dados
  seed.ts              alimentos base + usuário demo (opcional)
prisma.config.ts       config do Prisma 7 (URL do banco vem do .env)
src/
  proxy.ts             protege rotas (redireciona para /login)
  auth.ts              Auth.js completo (Credentials + Prisma)
  auth.config.ts       parte "edge-safe" usada pelo proxy
  app/
    (auth)/login, (auth)/register
    (app)/             layout com BottomNav (mobile) / sidebar (desktop)
      page.tsx         Home / Dashboard
      treino/          hoje + calendário semanal
      treino/fichas/   CRUD de fichas e dias
      treino/exercicios/ biblioteca + histórico por exercício
      treino/historico/ sessões passadas
      dieta/           diário do dia, metas, favoritas
      dieta/alimentos/ tabela de alimentos
      progresso/       peso, gráficos, estatísticas
      perfil/          configurações, TDEE, metas
    (focus)/treino/sessao/[id]  MODO ACADEMIA (sem navegação)
    api/sets/          upsert/delete de série (usado pela outbox)
    api/auth/[...nextauth]
    manifest.ts        manifesto PWA
  components/ui/       Button, Card, Stepper, ProgressBar, Sheet, ...
  components/layout/   BottomNav, AppHeader
  features/<módulo>/   componentes específicos de cada módulo
  lib/
    domain/            funções puras (volume, progression, records, weight, energy)
    dates.ts           datas no fuso do usuário
    format.ts          formatação pt-BR
    offline/           outbox
  server/
    db.ts              PrismaClient singleton
    session.ts         requireUserId()
    services/          leituras (sempre por userId)
    actions/           server actions (mutations validadas com Zod)
  generated/prisma/    client gerado (não editar, fora do git)
```

## Modelo de dados (resumo)

```
User 1─1 UserSettings
User 1─* Exercise                       (biblioteca do usuário)
User 1─* WorkoutPlan 1─* WorkoutDay 1─* WorkoutDayExercise *─1 Exercise
User 1─* WorkoutSession 1─* WorkoutExercise 1─* ExerciseSet
                              WorkoutExercise *─1 Exercise
User 1─* PersonalRecord  (aponta para o ExerciseSet que bateu o recorde)
User 1─* Food (userId nulo = alimento base compartilhado, somente leitura;
               unidade, foto e procedência nutricional ficam no próprio alimento)
User 1─* Meal 1─* MealFood *─1 Food      (MealFood guarda snapshot dos macros)
User 1─* FavoriteMeal 1─* FavoriteMealItem *─1 Food
User 1─* BodyWeight   (um por dia)
User 1─* BodyMeasurement (um por dia; medidas em cm + % gordura, todas opcionais)
User 1─* BodyPhoto    (um por dia+pose; data URL grande + miniatura)
User 1─* NutritionGoal (histórico; vale a mais recente com startDate <= dia)
User 1─* WeeklyReport (JSON com o resumo da semana)
User 1─* PushSubscription (uma por dispositivo/navegador inscrito)
```

Detalhes e comentários em `prisma/schema.prisma`.

### Dia da semana
`WorkoutDay.weekday` usa ISO: 1 = segunda … 7 = domingo. Apenas uma ficha fica `active`
por usuário; o "treino de hoje" é o `WorkoutDay` da ficha ativa com o weekday de hoje.

## Fluxo do treino (núcleo)

1. `/treino` mostra o dia de hoje → **COMEÇAR** chama `startSession(workoutDayId)`.
   - Se já existe sessão aberta hoje para esse dia, reutiliza.
   - Senão cria `WorkoutSession` + `WorkoutExercise` (snapshot da ficha).
2. `/treino/sessao/[id]` (server) carrega: sessão, séries já feitas, **último treino de cada
   exercício** e **sugestão de carga** (`lib/domain/progression.ts`).
3. `GymSession` (client):
   - Stepper de carga/reps pré-preenchidos (última série > sugestão > último treino).
   - **CONCLUIR SÉRIE** → atualização otimista + outbox → `POST /api/sets` (upsert).
   - Resposta pode conter `personalRecord` → toast "🔥 NOVO RECORDE".
   - Inicia descanso (`RestTimer`): baseado em timestamp final (resiste a app em 2º plano),
     `+30s`, vibração, beep opcional, notificação, Wake Lock para a tela não apagar.
4. **FINALIZAR** → `finishSession` grava `finishedAt` → resumo com volume vs último treino.

## Regras de negócio (lib/domain)

- **Volume** = Σ carga × reps das séries concluídas.
- **Progressão** (regra simples, sem IA): olha o último treino do exercício.
  - Todas as séries planejadas ≥ repMax → sugerir `carga + incremento` (config do usuário).
  - Média de reps < repMin − 2 → sugerir reduzir ~10% (arredondado ao passo).
  - Caso contrário → manter carga e buscar mais reps.
- **Recorde (PR)** = maior 1RM estimado (Epley: `w × (1 + reps/30)`) do exercício.
  Empate/menor não gera PR. Primeira série de um exercício não conta como PR.
- **Peso**: média móvel de 7 dias; comparação média últimos 7 dias × 7 anteriores.
- **Balanço energético**: `TDEE (config) − média de consumo nos dias com registro`.
  Sempre exibido como **estimativa**.
- **TDEE adaptativo** (fase 3): `consumo médio − (Δpeso_tendência × 7700 / dias)`;
  exige ≥ 14 dias com peso e dieta. Função já existe em `lib/domain/energy.ts`.
- **Platô** (`stagnation.ts`): métrica = melhor 1RM estimado de cada sessão (últimas 8, janela
  de 120 dias). Sessões desde o último ganho ≥ 0,5%: ≥ 3 → platô; média das últimas 3 < 95% do
  melhor → regressão. Sugestões: deload −10%, trocar faixa de reps, variação (≥ 5), recuperação.
- **Volume por músculo** (`muscle-volume.ts`): séries concluídas na semana ISO e séries
  planejadas na ficha ativa comparadas a `VOLUME_TARGETS` (ex.: peito/costas/quadríceps 10–20).
- **Código de barras** (`barcode.ts`): valida EAN/UPC pelo dígito verificador e converte o
  produto do Open Food Facts em alimento por 100 g/ml. Consulta feita no servidor
  (`lookupBarcodeAction`); o alimento importado vira alimento do usuário com `barcode`.

## Automações (e-mail, cron e push) — fase 2

**E-mail (`src/server/email`).** `getEmailSender()` devolve um `ResendSender` (chama a API
do Resend via `fetch`, sem SDK) quando `RESEND_API_KEY` e `EMAIL_FROM` estão definidos; caso
contrário, um `ConsoleSender` (dev). Templates HTML dark em `templates.ts`
(`dailyWorkoutEmail`, `weeklyReportEmail`) usam o mesmo layout (`layout.ts`) e reutilizam os
formatadores de `lib/format` e `lib/labels`. O relatório reaproveita `WeeklyReportData` de
`server/services/reports.ts` — o app já mostrava os dados; a fase 2 só adicionou o envio.

**Cron (`src/app/api/cron/*`).** Rotas `runtime = "nodejs"`, `dynamic = "force-dynamic"`,
com `GET` e `POST`, protegidas por `isAuthorizedCron` (`Authorization: Bearer $CRON_SECRET`
ou `?secret=`).
- `daily-email`: rode de hora em hora. Para cada usuário com e-mail **ou** push ativos,
  envia quando a hora local (`hourIn(timezone)`) bate com `dailyEmailTime`.
- `weekly-report`: rode 1×/semana (domingo). Gera o `WeeklyReport` (upsert, marca `emailedAt`)
  e envia o e-mail a quem tem `weeklyReportEnabled`.

**Push (`src/server/push`).** `web-push` com VAPID (`VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT`).
`sendPushToUser(userId, payload)` envia a todas as inscrições do usuário e remove as expiradas
(404/410). O cliente (`features/profile/PushToggle.tsx`) pega a chave pública em `GET /api/push`,
faz `pushManager.subscribe` e registra a inscrição em `POST /api/push` (upsert por `endpoint`).
O `sw.js` trata o evento `push` mostrando a notificação e navega para `data.url` no clique.
Sem as chaves VAPID, a UI informa que o recurso não está configurado.

## Fase 5 — compartilhamento e IA na dieta

- **Ficha por link.** `WorkoutPlan.shareToken` (aleatório, 16 caracteres). `getSharedPlan(token)`
  é a **única leitura fora do escopo do usuário**: o token é a autorização e só a estrutura do
  treino é exposta. Desativar o link = `shareToken` null.
- **Foto do prato.** `server/ai/plate.ts` usa o SDK `@google/genai` (Gemini, padrão
  `gemini-3.8-flash`, plano gratuito; `GEMINI_MODEL` troca o modelo) com `responseJsonSchema`
  gerado do schema Zod e validação da resposta. Limite gratuito (429) vira mensagem amigável.
  No plano gratuito o Google pode usar o conteúdo para melhorar produtos. A foto é compactada no cliente
  (1024px) e não é salva. Nada é registrado sem confirmação do usuário.

## Segurança

- `proxy.ts` redireciona não autenticados para `/login` (checagem otimista).
- **Checagem real** acontece em `requireUserId()` dentro de cada page/action/route.
- Serviços sempre filtram por `userId`; mutações de filhos usam `updateMany/deleteMany`
  com filtro de relação ou verificam posse antes.
- Rotas de cron exigem `Authorization: Bearer ${CRON_SECRET}`.

## IA (fase futura)

A IA deve chamar *ferramentas* que consultam o banco (ex.: `getExerciseHistory`,
`getWeeklyNutrition`, `getMuscleVolume`) — as mesmas funções de `server/services` +
`lib/domain`. Nunca responder sem dados; se não houver registros, dizer isso.
