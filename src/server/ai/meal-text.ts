import "server-only";
import { z } from "zod";
import { generateJsonFromText } from "./gemini";

// Refeição descrita em texto (falada ou digitada) → itens com porção e macros estimados.
// Mesmo formato da foto do prato: o usuário revisa antes de registrar.

const MealTextEstimate = z.object({
  isFood: z.boolean().describe("false se o texto não descreve comida ou bebida"),
  items: z.array(
    z.object({
      name: z.string().describe("Nome do alimento em português do Brasil, como numa tabela nutricional (ex.: 'Ovo de galinha cozido')"),
      grams: z.number().describe("Peso total da quantidade dita, em gramas (ml para bebidas)"),
      kcal: z.number(),
      protein: z.number().describe("Proteína em gramas para a quantidade dita"),
      carbs: z.number().describe("Carboidratos em gramas para a quantidade dita"),
      fat: z.number().describe("Gorduras em gramas para a quantidade dita"),
      confidence: z.enum(["baixa", "media", "alta"]).describe("alta quando a quantidade foi dita claramente; baixa quando precisou supor"),
    }),
  ),
  note: z.string().describe("Observação curta para o usuário (ex.: porção suposta por não ter sido dita), ou string vazia"),
});

export type MealTextEstimate = z.infer<typeof MealTextEstimate>;

const SYSTEM = `Você é um nutricionista brasileiro. O usuário descreve o que comeu, em linguagem falada (pode vir de reconhecimento de voz, com erros de transcrição).
Separe cada alimento, converta medidas caseiras em gramas (ex.: 1 ovo ≈ 50 g, 1 pão francês ≈ 50 g, 1 colher de sopa de arroz ≈ 25 g, 1 concha de feijão ≈ 90 g, 1 scoop de whey ≈ 30 g, 1 copo ≈ 200 ml) e calcule calorias e macros daquela quantidade com base em tabelas como TACO/TBCA ou no rótulo típico da marca citada.
Se a quantidade não for dita, use uma porção comum e marque confidence "baixa". Não invente alimentos que não foram citados.`;

export function estimateMealText(text: string): Promise<MealTextEstimate> {
  return generateJsonFromText(MealTextEstimate, { system: SYSTEM, prompt: `O que eu comi: ${text}` });
}
