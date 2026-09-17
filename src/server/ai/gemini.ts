import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Cliente compartilhado do Google Gemini (plano gratuito) para leituras com visão.
// Se o modelo principal não existir, estiver sobrecarregado ou sem cota, tenta os próximos.

const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"];

function models(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  return [...new Set([...(preferred ? [preferred] : []), ...FALLBACK_MODELS])];
}

/** Erro com mensagem pronta para mostrar ao usuário. */
export class AiError extends Error {}

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Data URL (já compactada no cliente) → imagem para a IA. null se o formato for inválido. */
export function parseImageDataUrl(dataUrl: string): ImageInput | null {
  const m = DATA_URL.exec(dataUrl);
  return m ? { mediaType: m[1] as ImageInput["mediaType"], base64: m[2] } : null;
}

export async function generateJsonFromImage<T>(schema: z.ZodType<T>, opts: { system: string; prompt: string; image: ImageInput }): Promise<T> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let lastStatus: number | undefined;
  let quotaHit = false;

  for (const model of models()) {
    let text: string | undefined;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: opts.image.mediaType, data: opts.image.base64 } }, { text: opts.prompt }],
          },
        ],
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(schema),
        },
      });
      text = response.text;
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if ((e.status === 400 || e.status === 401 || e.status === 403) && /api[ _-]?key|permission|unauthori[sz]ed/i.test(e.message)) {
        throw new AiError("Chave da IA (GEMINI_API_KEY) inválida ou sem permissão.");
      }
      console.warn(`[gemini] ${model} falhou (${e.status}): ${e.message.slice(0, 200)}`);
      lastStatus = e.status;
      if (e.status === 429) quotaHit = true;
      continue; // modelo inexistente, sobrecarregado ou sem cota: tenta o próximo
    }

    const parsed = text ? schema.safeParse(safeJson(text)) : null;
    if (parsed?.success) return parsed.data;
    console.warn(`[gemini] ${model} devolveu JSON inválido`);
  }

  if (quotaHit) throw new AiError("Limite gratuito da IA atingido por agora. Tente de novo mais tarde.");
  throw new AiError(`A IA não respondeu${lastStatus ? ` (erro ${lastStatus})` : ""}. Tente de novo em instantes.`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
