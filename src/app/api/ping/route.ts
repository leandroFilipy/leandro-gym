import { NextResponse } from "next/server";

// Endpoint leve de "keep-alive": mantém a função serverless aquecida quando
// chamado periodicamente por um pinger externo (ex.: cron-job.org a cada 5 min).
// Não toca no banco de propósito — só precisa acordar a função.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
