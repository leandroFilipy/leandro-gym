// O plano Hobby só permite crons diários, então há um cron por hora (vercel.json:
// /api/cron/daily-email/05 … /22). Todos usam o mesmo handler, que envia para quem escolheu a
// hora local atual — o segmento [hour] só diferencia os caminhos.
export { GET, POST } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
