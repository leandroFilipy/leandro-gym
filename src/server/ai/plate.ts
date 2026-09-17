import "server-only";
import { z } from "zod";
import { generateJsonFromImage, type ImageInput } from "./gemini";

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
Considere o preparo aparente (frito, grelhado, com molho) e óleo de preparo típico. Se for um alimento embalado, use a porção de uma unidade. Não invente itens que não aparecem. Se não houver comida na foto, devolva isFood=false e nenhum item.`;

export function estimatePlate(image: ImageInput): Promise<PlateEstimate> {
  return generateJsonFromImage(PlateEstimate, { system: SYSTEM, prompt: "Estime os alimentos, as porções e os macros desta foto.", image });
}
