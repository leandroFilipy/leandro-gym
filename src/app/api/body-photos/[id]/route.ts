import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { getUserId } from "@/server/session";
import { isBlobConfigured, isBlobRef, readPhoto, storePhoto } from "@/server/storage/photos";
import { fromDbDate } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entrega uma foto de progresso só para o dono. `?size=thumb` (galeria) ou `full` (comparação).
 * Foto antiga guardada como data URL é migrada para o Blob privado na primeira leitura.
 */
export async function GET(req: NextRequest, { params }: RouteContext<"/api/body-photos/[id]">) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const size = req.nextUrl.searchParams.get("size") === "full" ? "full" : "thumb";
  // Busca só a coluna do tamanho pedido (a foto grande pesa ~1 MB em registros antigos).
  const photo =
    size === "full"
      ? await db.bodyPhoto.findFirst({ where: { id, userId }, select: { id: true, date: true, pose: true, imageUrl: true } })
      : await db.bodyPhoto.findFirst({ where: { id, userId }, select: { id: true, date: true, pose: true, thumbUrl: true } });
  if (!photo) return new NextResponse("Not found", { status: 404 });

  let value = "imageUrl" in photo ? photo.imageUrl : photo.thumbUrl;
  if (!isBlobRef(value) && isBlobConfigured()) {
    try {
      const ref = await storePhoto(userId, `${fromDbDate(photo.date)}-${photo.pose.toLowerCase()}-${size}`, value);
      if (isBlobRef(ref)) {
        await db.bodyPhoto.update({ where: { id: photo.id }, data: size === "full" ? { imageUrl: ref } : { thumbUrl: ref } });
        value = ref;
      }
    } catch (e) {
      console.error("[body-photos] migração para o Blob falhou; servindo do banco", e);
    }
  }

  const result = await readPhoto(value, req.headers.get("if-none-match") ?? undefined);
  if (result.status === 404) return new NextResponse("Not found", { status: 404 });
  if (result.status === 304) {
    return new NextResponse(null, { status: 304, headers: { ETag: result.etag, "Cache-Control": "private, no-cache" } });
  }
  return new NextResponse(result.body as BodyInit, {
    headers: {
      "Content-Type": result.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
      ...(result.etag ? { ETag: result.etag } : {}),
    },
  });
}
