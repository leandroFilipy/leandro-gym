import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logError } from "@/server/monitoring/errors";
import { getUserId } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 32_000;

const reportSchema = z.object({
  message: z.string().min(1).max(4000),
  stack: z.string().max(12_000).nullish(),
  digest: z.string().max(200).nullish(),
  kind: z.string().max(50).nullish(),
  path: z.string().max(1000).nullish(),
});

/** Recebe erros do navegador (reportClientError). Aceita anônimos: a tela de login também quebra. */
export async function POST(req: NextRequest) {
  const text = await req.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return new NextResponse(null, { status: 413 });

  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // corpo inválido
  }
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const { message, stack, digest, kind, path } = parsed.data;
  const error = Object.assign(new Error(message), { stack: stack ?? `Error: ${message}` });
  await logError({
    source: "client",
    error,
    path,
    digest,
    userId: await getUserId().catch(() => null),
    userAgent: req.headers.get("user-agent"),
    details: kind ? `tipo: ${kind}` : null,
  });
  return new NextResponse(null, { status: 204 });
}
