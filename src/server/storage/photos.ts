import "server-only";
import { del, get, put } from "@vercel/blob";

// Fotos de progresso no Vercel Blob PRIVADO. No banco guardamos "blob:<pathname>"; a imagem só é
// entregue por /api/body-photos/[id], depois de conferir o dono. Sem Blob configurado (dev local)
// continua salvando o data URL direto no banco, como antes.

const BLOB_PREFIX = "blob:";
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

export const isBlobRef = (value: string) => value.startsWith(BLOB_PREFIX);

/** data URL → valor para o banco ("blob:<pathname>" com Blob configurado; senão o próprio data URL). */
export async function storePhoto(userId: string, name: string, dataUrl: string): Promise<string> {
  const m = DATA_URL.exec(dataUrl);
  if (!m || !isBlobConfigured()) return dataUrl;
  const ext = m[1].split("/")[1] === "jpeg" ? "jpg" : m[1].split("/")[1];
  const blob = await put(`body-photos/${userId}/${name}.${ext}`, Buffer.from(m[2], "base64"), {
    access: "private",
    contentType: m[1],
    addRandomSuffix: true,
  });
  return `${BLOB_PREFIX}${blob.pathname}`;
}

/** Apaga do Blob os valores que forem referências (data URLs são ignorados). */
export async function deletePhotos(values: string[]) {
  const paths = values.filter(isBlobRef).map((v) => v.slice(BLOB_PREFIX.length));
  if (paths.length && isBlobConfigured()) await del(paths);
}

export type PhotoRead =
  | { status: 200; body: ReadableStream<Uint8Array> | Uint8Array; contentType: string; etag?: string }
  | { status: 304; etag: string }
  | { status: 404 };

export async function readPhoto(value: string, ifNoneMatch?: string): Promise<PhotoRead> {
  if (isBlobRef(value)) {
    const r = await get(value.slice(BLOB_PREFIX.length), { access: "private", ifNoneMatch });
    if (!r) return { status: 404 };
    if (r.statusCode === 304) return { status: 304, etag: r.blob.etag };
    return { status: 200, body: r.stream, contentType: r.blob.contentType, etag: r.blob.etag };
  }
  const m = DATA_URL.exec(value);
  if (!m) return { status: 404 };
  return { status: 200, body: new Uint8Array(Buffer.from(m[2], "base64")), contentType: m[1] };
}
