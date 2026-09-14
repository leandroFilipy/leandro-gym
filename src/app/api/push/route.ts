import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { getUserId } from "@/server/session";
import { getVapidPublicKey, isPushConfigured } from "@/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/** Devolve a chave pública VAPID (para o cliente inscrever). */
export async function GET() {
  return NextResponse.json({ configured: isPushConfigured(), publicKey: getVapidPublicKey() });
}

/** Registra (ou atualiza) a inscrição de push do dispositivo atual. */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get("user-agent");

  // endpoint é único: reinscrever no mesmo dispositivo apenas atualiza o dono/chaves.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  await db.userSettings.upsert({
    where: { userId },
    create: { userId, pushEnabled: true },
    update: { pushEnabled: true },
  });

  return NextResponse.json({ ok: true });
}

/** Remove a inscrição (unsubscribe) pelo endpoint. */
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });

  const remaining = await db.pushSubscription.count({ where: { userId } });
  if (remaining === 0) {
    await db.userSettings.updateMany({ where: { userId }, data: { pushEnabled: false } });
  }

  return NextResponse.json({ ok: true });
}
