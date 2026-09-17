import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Estimativa de calorias/macros a partir da foto de um prato (Google Gemini com visão, plano
// gratuito). Sempre exibida como estimativa: o usuário revisa antes de registrar.

const PlateEstimate = z.object({
  isFood: z.boolean().describe("false se a foto não mostra comida"),
  items: z.array(
    z.object({
      name: z.string().describe("Nome do alimento em português do Brasil, como numa tabela nutricional (ex.: 'Arroz branco cozido')"),
      grams: z.number().describe("Peso estimado da porção na foto, em gramas"),
      kcal: z.number(),
      protein: z.number().describe("Proteína em gramas para a porção estimada"),
      carbs: z.number().describe("Carboidratos em gramas para a porção estimada"),
      fat: z.number().describe("Gorduras em gramas para a porção estimada"),
      confidence: z.enum(["baixa", "media", "alta"]),
    }),
  ),
  note: z.string().describe("Observação curta para o usuário (ex.: molho ou óleo não visível), ou string vazia"),
});

export type PlateEstimate = z.infer<typeof PlateEstimate>;

const SYSTEM = `Você é um nutricionista que estima porções a partir de fotos de refeições brasileiras.
Identifique cada alimento visível separadamente (arroz, feijão, carne, salada…), estime o peso em gramas usando pratos, talheres e embalagens como referência de escala e calcule calorias e macros daquela porção com base em tabelas como TACO/TBCA.
Considere o preparo aparente (frito, grelhado, com molho) e óleo de preparo típico. Não invente itens que não aparecem. Se não houver comida na foto, devolva isFood=false e nenhum item.`;

/** Modelo com plano gratuito; pode ser trocado por env sem mexer no código. */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/** Erro com mensagem pronta para mostrar ao usuário. */
export class PlateAiError extends Error {}

export function isPlateAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function estimatePlate(image: { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string }): Promise<PlateEstimate> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: image.mediaType, data: image.base64 } },
            { text: "Estime os alimentos, as porções e os macros deste prato." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(PlateEstimate),
      },
    });
    text = response.text;
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      throw new PlateAiError("Limite gratuito da IA atingido por agora. Tente de novo mais tarde ou registre manualmente.");
    }
    if (e instanceof ApiError && (e.status === 400 || e.status === 403) && /api key/i.test(e.message)) {
      throw new PlateAiError("Chave da IA (GEMINI_API_KEY) inválida.");
    }
    throw e;
  }

  const parsed = text ? PlateEstimate.safeParse(safeJson(text)) : null;
  if (!parsed?.success) throw new PlateAiError("Não foi possível ler a resposta da IA. Tente outra foto.");
  return parsed.data;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
