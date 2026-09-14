# Leandro Gym 🏋️

PWA de treino, dieta e evolução física — feita para usar no celular durante a academia.

## Rodando localmente

Requisitos: Node 20+ (testado com Node 24).

```powershell
npm install
copy .env.example .env      # depois edite AUTH_SECRET

# 1) Banco Postgres local (sem instalar nada) — deixe rodando em um terminal:
npx prisma dev
#    Copie a DATABASE_URL (postgres://...) que ele mostrar para o .env

# 2) Em outro terminal: cria as tabelas e os alimentos base
npx prisma migrate dev
npm run db:seed

# 3) App
npm run dev
```

Abra http://localhost:3000, crie sua conta e monte sua ficha em **Treino → Fichas**.

> Quer dados de exemplo? `npm run db:seed -- --demo` cria o usuário
> `demo@leandrogym.app` / senha `demo1234` com ficha e histórico.

### Banco na nuvem
Qualquer Postgres serve (Neon, Supabase, Prisma Postgres, Railway). Coloque a URL em
`DATABASE_URL` e rode `npx prisma migrate deploy`.

## Instalar no celular
Faça o deploy (ex.: Vercel, precisa de HTTPS) → abra no celular → "Adicionar à tela inicial".

## Deploy na Vercel

Requisitos: um Postgres na nuvem (Neon, Supabase, Railway…) e uma conta na Vercel.

```powershell
# 1) Aplique o schema no banco de produção (use a URL DIRETA, não a pooled)
$env:DATABASE_URL="postgres://...neon.tech/db?sslmode=require"
npx prisma migrate deploy

# 2) Login e vínculo do projeto
npx vercel login
npx vercel link

# 3) Variáveis de ambiente (production)
#    DATABASE_URL aqui deve ser a POOLED (serverless abre muitas conexões)
npx vercel env add DATABASE_URL production
npx vercel env add AUTH_SECRET production      # npx auth secret
npx vercel env add AUTH_TRUST_HOST production  # true
npx vercel env add APP_URL production          # https://seu-app.vercel.app
npx vercel env add CRON_SECRET production
npx vercel env add VAPID_PUBLIC_KEY production
npx vercel env add VAPID_PRIVATE_KEY production
npx vercel env add VAPID_SUBJECT production    # mailto:voce@dominio.com
# opcionais (e-mail real; sem eles o envio só vai para o log)
npx vercel env add RESEND_API_KEY production
npx vercel env add EMAIL_FROM production

# 4) Deploy
npx vercel --prod
```

Depois abra a URL no celular e use "Adicionar à tela inicial" — aí o service worker
registra e as notificações push passam a funcionar (só em HTTPS/produção).

### Cron na Vercel
Os horários ficam em `vercel.json`, em **UTC**:

| Cron                      | Schedule      | Equivale a (BRT, UTC−3) |
|---------------------------|---------------|-------------------------|
| `/api/cron/daily-email`   | `0 10 * * *`  | 07:00 todos os dias     |
| `/api/cron/weekly-report` | `0 21 * * 0`  | 18:00 de domingo        |

O `CRON_SECRET` é enviado automaticamente pela Vercel como `Authorization: Bearer`.

> **Plano Hobby:** cron roda no máximo 1×/dia e a Vercel dispara em qualquer minuto
> dentro da hora agendada. Como o app compara apenas a *hora* do `dailyEmailTime`,
> `0 10 * * *` atende quem usa `07:00`. Se você mudar o horário no app, ajuste o
> `vercel.json` também. No plano Pro dá para usar `0 * * * *` (de hora em hora) e
> cada usuário recebe no seu próprio horário.


## Scripts
| Script            | O que faz                         |
|-------------------|-----------------------------------|
| `npm run dev`     | servidor de desenvolvimento       |
| `npm run build`   | build de produção                 |
| `npm run lint`    | ESLint                            |
| `npm run typecheck` | TypeScript sem emitir           |
| `npm run db:seed` | alimentos base (+ `--demo`)       |

## Documentação
- [Arquitetura](docs/ARCHITECTURE.md)
- [Roadmap / status](docs/ROADMAP.md)
