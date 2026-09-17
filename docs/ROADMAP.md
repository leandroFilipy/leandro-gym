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

## Fase 4 — Inteligência de treino e corpo
- [x] Detecção de platô/regressão por exercício + sugestões (deload, faixa de reps, variação)
- [x] Volume semanal por músculo × faixa-alvo × ficha ativa
- [x] Leitor de código de barras (câmera + Open Food Facts)
- [x] Medidas corporais e fotos de progresso com comparação

## Fase 5 — Social, praticidade e IA na dieta
- [x] Força relativa (1RM ÷ peso corporal) com nível por exercício
- [x] Trocar o dia do treino sem bagunçar a semana
- [x] Compartilhar ficha por link (importar cópia)
- [x] "O que eu como agora?" — sugestões para fechar a meta do dia
- [x] Foto do prato com IA (Gemini, plano gratuito) — estimativa revisável antes de registrar

## Fase 6 — Corpo, dieta e acompanhamento
- [x] % de gordura estimado pelas medidas (fórmula da Marinha)
- [x] Meta diferente em dia de treino e de descanso (ciclo de carboidrato)
- [x] Lembrete push de registrar almoço/jantar
- [x] Relatório mensal (salvar em PDF / compartilhar)

## Fase 7 — Prontidão, compras e monitoramento
- [x] Nota de prontidão antes do treino (sono, dor, energia) ajustando a carga sugerida
- [x] Prontidão × desempenho no Progresso
- [x] Lista de compras pela dieta registrada (checklist + compartilhar)
- [x] Monitoramento de erros próprio (servidor, navegador e IA) com página e alerta push

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
- 2026-09-16 — Fase 4: (1) `lib/domain/stagnation.ts`: melhor 1RM estimado por sessão; ≥ 3
  sessões sem ganho de 0,5% = platô, média recente ≥ 5% abaixo do melhor = regressão. Sugere
  deload −10% (arredondado ao passo), outra faixa de reps, variação (platô ≥ 5) e recuperação.
  `server/services/insights.ts` → card "Platô detectado" na Home e diagnóstico no histórico do
  exercício. (2) `lib/domain/muscle-volume.ts`: faixas-alvo de séries/semana por grupo; card na
  Home e no Progresso com feito (semana ISO) × planejado (ficha ativa). (3) Leitor de código de
  barras em Dieta → Adicionar: `BarcodeDetector` nativo com fallback `@zxing/browser` (carregado
  sob demanda) e digitação manual; `lookupBarcodeAction` procura `Food.barcode`, depois o Open
  Food Facts (cria alimento do usuário por 100 g/ml) e, se não achar, abre o cadastro com o código.
  (4) `/progresso/corpo`: `BodyMeasurement` (1/dia) com evolução, gráfico e tabela; `BodyPhoto`
  (1 por dia+pose, data URL 1080px + miniatura 240px, compactadas em `lib/image.ts`) com galeria e
  comparação antes × depois. Migração `20260916150000_body_progress_and_barcode` validada no banco
  local; telas conferidas logado com dados de teste. `typecheck`, `lint`, `test` (110) e `build` ok.
- 2026-09-17 — Fase 5: (1) `lib/domain/strength.ts`: nível (Iniciante → Elite) por razão 1RM/peso
  para supino, agachamento, terra, desenvolvimento, remada, rosca, leg press e elevação pélvica,
  casados pelo nome do exercício; card no histórico do exercício e badge em Recordes. (2) Trocar
  dia: "Trocar o treino de hoje" no card de hoje e "Fazer este treino hoje" na tela do dia; o
  calendário conta a sessão no dia da ficha (`workoutDayId`) e mostra "feito ter". (3)
  `WorkoutPlan.shareToken` (migração `20260917120000_plan_share_token`) + `/treino/fichas/importar/[token]`;
  a importação cria uma cópia inativa (ativa se não houver outra) casando exercícios pelo nome.
  Login/cadastro agora respeitam `callbackUrl` (só caminhos internos, `lib/safe-next.ts`).
  (4) `lib/domain/meal-suggestions.ts`: até 12 alimentos habituais (60 dias, quantidade mediana),
  combinações de 1–2 itens para o alvo de uma refeição (`mealTarget`, ~35% da meta do dia),
  priorizando proteína sem estourar kcal. (5) `server/ai/plate.ts`: Claude (`claude-opus-5`, SDK
  oficial, saída estruturada com Zod, fallback de recusa no servidor) estima itens/porções da
  foto; o usuário revisa e cada item vira um alimento arquivado "Estimativa por foto (IA)".
  Requer `ANTHROPIC_API_KEY`. Validado no banco local com dois usuários (login, força relativa,
  troca de dia, importação, sugestões); a chamada real à IA não foi testada (sem chave).
  Obs.: o Postgres local do `prisma dev` (PGlite) falha com consultas em paralelo
  ("bind message supplies 2 parameters") — limitação só do ambiente local.
- 2026-09-17 — Foto do prato migrada do Claude para o Google Gemini (`@google/genai`,
  `gemini-3.8-flash`, plano gratuito) para não ter custo. Variável: `GEMINI_API_KEY`
  (opcional `GEMINI_MODEL`). Erro 429 (limite gratuito) e chave inválida viram mensagens claras.
- 2026-09-17 — Fase 6: (1) `lib/domain/body-fat.ts`: fórmula da Marinha (homem: cintura−pescoço;
  mulher: cintura+quadril−pescoço), série carregando a última medida conhecida, faixas ACE;
  `BodyFatCard` em `/progresso/corpo` (precisa altura e sexo no Perfil). (2)
  `lib/domain/carb-cycling.ts` + `getDayGoal` em `services/nutrition.ts`: com
  `carbCyclingEnabled`, descanso = meta − `restDayCarbsCut` g de carbo; treino recebe o total
  dividido pelos dias de treino da ficha ativa (média semanal igual). Dia é de treino se a ficha
  tem treino no weekday ou se houve sessão na data. Usado na Dieta (com aviso do tipo do dia),
  nas sugestões e na Home. (3) `/api/cron/meal-reminder` (+ `-night`, mesmo handler): push se
  almoço (12–17h local) ou jantar (19–24h) estiverem vazios; `mealRemindersEnabled`. Agendado
  16:30 e 00:00 UTC (Hobby só permite crons diários). (4) `/progresso/relatorio/mensal`
  (`services/monthly-report.ts`): treinos × planejado, séries, horas, volume vs mês anterior,
  evolução do 1RM (mês × antes), recordes, peso/cintura/% gordura, médias de dieta e dias
  batendo proteína; "Salvar PDF" (`window.print`, CSS de impressão claro em `globals.css`,
  menus `print:hidden`) e "Compartilhar" (texto). Migração
  `20260917140000_carb_cycling_meal_reminders`. Validado ponta a ponta no banco local (20
  verificações). `typecheck`, `lint`, `test` (142) e `build` ok.
- 2026-09-17 — Revisão de qualidade (6 correções): (1) Lembrete do treino só funcionava às 7h
  (cron diário único): agora há um cron por hora 05–22h e o Perfil oferece só horas cheias.
  (2) "Esqueci minha senha" com token de 1 h (hash no banco) e e-mail via Resend. (3) Fotos de
  progresso no Vercel Blob privado (store `leandro-gym-fotos`, gru1) servidas por
  `/api/body-photos/[id]`; registros antigos migram na primeira leitura; a página Corpo não embute
  mais as imagens no HTML. (4) Bloqueio de login (5 erros/15 min por e-mail, 20 por IP) e limite
  de pedidos de redefinição. (5) Recordes calculados em SQL (`DISTINCT ON`) — antes carregava
  todas as séries. (6) Exportar CSV (treinos, dieta, peso, medidas) e excluir conta
  (`/perfil/excluir-conta`). Migração `20260917160000_password_reset_and_throttle`. Validado no
  banco local (39 verificações ponta a ponta) e Blob privado testado de verdade (403 sem token).
  Obs.: formulário com `useActionState` + `.bind()` e página que chama função de arquivo
  "use server" travava a resposta sem JS — token virou campo escondido e a checagem foi para
  `services/password-reset.ts`.
- 2026-09-17 — Código de barras e IA mais robustos: (1) `server/ai/gemini.ts` compartilhado tenta
  `GEMINI_MODEL` e depois `gemini-flash-latest`, `gemini-2.5-flash`, `-lite` quando o modelo
  não existe/está sobrecarregado/sem cota; erros mostram o status. (2) Produto fora do Open Food
  Facts: `LabelReader` no cadastro lê a tabela nutricional por foto (`server/ai/label.ts`) e
  pré-preenche o formulário; se o OFF tem o produto sem nutrientes, o nome/foto já vêm
  preenchidos (`offProductBasics`). (3) Leitor: câmera 1080p com foco contínuo, lanterna, ITF-14,
  ZXing com TRY_HARDER, "Foto do código" (decodifica foto) e dica após 7 s sem leitura.
  UPC-A/EAN-13 com zero à esquerda são tratados como o mesmo código.
- 2026-09-17 — Fase 7: (1) Prontidão: ao abrir um treino sem séries, `ReadinessCheck` pergunta
  sono/dor/energia (1–5) → `lib/domain/readiness.ts` (nota 0–100, pesos 40/25/35; < 45 baixa,
  ≥ 75 alta). Colunas `readiness*` em `WorkoutSession`; `getGymSession` aplica
  `adjustForReadiness` (baixa: não sobe e usa −10% da carga de trabalho; alta: incentiva recorde).
  `GymSession` remonta via `key` ao responder. Card "Prontidão × desempenho" em `/progresso`
  (`getReadinessInsight`: volume ÷ treino anterior do mesmo dia da ficha, dias ruins × bons).
  (2) `/dieta/compras`: `lib/domain/shopping-list.ts` (média diária × dias da compra, só itens
  comidos em ≥ 2 dias, arredonda 50 g / 0,1 kg / unidade, marca peso "pronto"); checklist em
  localStorage e compartilhar. (3) Monitoramento: tabela `ErrorLog` + `server/monitoring/errors.ts`
  (fingerprint normalizado, máx. 20/h por grupo, retenção 30 dias, push aos `ADMIN_EMAILS` no
  primeiro do dia). Fontes: `src/instrumentation.ts` (`onRequestError`), `instrumentation-client.ts`
  (window error/unhandledrejection → `/api/errors`), `error.tsx` em (app)/(focus) + `global-error.tsx`,
  e erros da IA com as tentativas de cada modelo. Página `/perfil/erros` só para admins. Migração
  `20260917180000_readiness_error_log`. Validado ponta a ponta no banco local (sugestão 66 → 58 kg
  em dia ruim, insight, lista, agrupamento e limite). `typecheck`, `lint`, `test` (170) e `build` ok.
