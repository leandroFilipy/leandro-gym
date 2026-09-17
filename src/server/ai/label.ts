import "server-only";
import { z } from "zod";
import { generateJsonFromImage, type ImageInput } from "./gemini";

// Leitura da tabela nutricional de uma embalagem (Google Gemini com visão). Serve para
// cadastrar qualquer produto que não está no Open Food Facts; o usuário confere antes de salvar.

const NutritionLabel = z.object({
  isLabel: z.boolean().describe("false se a foto não mostra uma tabela nutricional legível"),
  name: z.string().describe("Nome do produto com a marca, se aparecer na foto (ex.: 'Pão de mel (Bauducco)'); string vazia se não aparecer"),
  servingSize: z.number().describe("Quantidade de referência dos valores: 100 se usar a coluna 'por 100 g/ml'; senão o tamanho da porção"),
  unit: z.enum(["G", "ML"]).describe("G para sólidos, ML para líquidos"),
  kcal: z.number().describe("Valor energético em kcal para servingSize"),
  protein: z.number().describe("Proteínas em gramas para servingSize"),
  carbs: z.number().describe("Carboidratos em gramas para servingSize"),
  fat: z.number().describe("Gorduras totais em gramas para servingSize"),
});

export type NutritionLabel = z.infer<typeof NutritionLabel>;

const SYSTEM = `Você lê tabelas nutricionais de embalagens brasileiras (padrão ANVISA).
Copie os números exatamente como estão impressos, sem estimar. Prefira a coluna "100 g" ou "100 ml" quando existir; senão use a coluna da porção e informe o tamanho dela em servingSize.
Use kcal (não kJ). Se a foto não tiver uma tabela nutricional legível, devolva isLabel=false com zeros.`;

export function readNutritionLabel(image: ImageInput): Promise<NutritionLabel> {
  return generateJsonFromImage(NutritionLabel, { system: SYSTEM, prompt: "Leia a tabela nutricional desta embalagem.", image });
}
