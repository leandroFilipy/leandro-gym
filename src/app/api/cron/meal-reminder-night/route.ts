// Segundo horário do lembrete de refeição (jantar). A Vercel identifica crons pelo caminho,
// então o mesmo handler fica exposto em dois caminhos com agendas diferentes.
export { GET, POST } from "../meal-reminder/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
