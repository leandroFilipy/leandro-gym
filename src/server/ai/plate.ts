import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Estimativa de calorias/macros a partir da foto de um prato (Claude com visão).
// Sempre exibida como estimativa: o usuário revisa antes de registrar.

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

export function isPlateAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function estimatePlate(image: { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string }): Promise<PlateEstimate> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    // Se o modelo recusar a imagem, a própria API tenta de novo com um modelo alternativo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(PlateEstimate) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: "Estime os alimentos, as porções e os macros deste prato." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("A IA não conseguiu analisar esta foto.");
  if (!response.parsed_output) throw new Error("Não foi possível ler a resposta da IA. Tente outra foto.");
  return response.parsed_output;
}
