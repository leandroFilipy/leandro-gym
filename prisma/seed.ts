// Seed: alimentos base (compartilhados) e, opcionalmente, um usuário demo.
//   npm run db:seed            → só alimentos
//   npm run db:seed -- --demo  → alimentos + usuário demo com ficha e histórico
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DayType, FoodUnit, MuscleGroup } from "../src/generated/prisma/enums";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TACO_URL = "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf";
const TBCA_URL = "https://www.tbca.net.br/base-dados/composicao_alimentos.php";
const GROWTH_URL = "https://gsuplementos.live/top-whey-protein-concentrado-750g-natural/";
const USDA_URL = "https://fdc.nal.usda.gov/";
const LABEL_URL = "https://www.tbca.net.br/base-dados/composicao_alimentos.php"; // valores típicos de rótulo (média de mercado)

type FoodSeed = {
  name: string;
  servingSize: number;
  unit: FoodUnit;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sourceName: "TACO" | "TBCA" | "Growth" | "USDA" | "Rótulo";
  sourceUrl: string;
  imageUrl: string;
};

// TACO/TBCA: valores por 100 g de parte comestível, salvo quando a porção é indicada.
// Whey/creatina/suplementos: porção e macros do rótulo (média de mercado / fabricante).
// imageUrl: fotos públicas do Wikimedia Commons (Special:FilePath devolve a imagem atual).
const img = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=320`;

const FOODS: FoodSeed[] = [
  { name: "Arroz branco cozido", servingSize: 100, unit: "G", kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Cooked rice.jpg") },
  { name: "Arroz integral cozido", servingSize: 100, unit: "G", kcal: 124, protein: 2.6, carbs: 25.8, fat: 1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Cooked brown rice (unpolished long-grain rice).jpg") },
  { name: "Feijão carioca cozido", servingSize: 100, unit: "G", kcal: 71, protein: 4.77, carbs: 15.3, fat: 0.53, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Carioca beans.jpg") },
  { name: "Feijão preto cozido", servingSize: 100, unit: "G", kcal: 77, protein: 4.5, carbs: 14, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Black beans.jpg") },
  { name: "Feijão branco cozido", servingSize: 100, unit: "G", kcal: 129, protein: 8.7, carbs: 25.1, fat: 0.5, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("White beans.jpg") },
  { name: "Lentilha cozida", servingSize: 100, unit: "G", kcal: 93, protein: 6.3, carbs: 16.3, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Cooked lentils.jpg") },
  { name: "Grão-de-bico cozido", servingSize: 100, unit: "G", kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: img("Cooked chickpeas.jpg") },
  { name: "Ovo de galinha cozido", servingSize: 1, unit: "UNIT", kcal: 73, protein: 6.65, carbs: 0.3, fat: 4.75, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Boiled egg.jpg") },
  { name: "Ovo de galinha frito", servingSize: 100, unit: "G", kcal: 240, protein: 15.6, carbs: 1.2, fat: 18.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Fried egg, sunny side up.jpg") },
  { name: "Clara de ovo cozida", servingSize: 1, unit: "UNIT", kcal: 18, protein: 4.02, carbs: 0, fat: 0.03, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Egg white.jpg") },
  { name: "Peito de frango grelhado", servingSize: 100, unit: "G", kcal: 159, protein: 32, carbs: 0, fat: 2.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Grilled chicken breast.jpg") },
  { name: "Coxa de frango sem pele cozida", servingSize: 100, unit: "G", kcal: 167, protein: 26.9, carbs: 0, fat: 5.8, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Chicken thigh.jpg") },
  { name: "Filé de frango à milanesa", servingSize: 100, unit: "G", kcal: 221, protein: 28.5, carbs: 7.5, fat: 7.8, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Chicken schnitzel.jpg") },
  { name: "Patinho sem gordura grelhado", servingSize: 100, unit: "G", kcal: 219, protein: 35.9, carbs: 0, fat: 7.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Grilled beef steak.jpg") },
  { name: "Carne moída (acém) refogada", servingSize: 100, unit: "G", kcal: 216, protein: 26.7, carbs: 0.9, fat: 11.7, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Ground beef.jpg") },
  { name: "Músculo bovino refogado na panela", servingSize: 100, unit: "G", kcal: 196, protein: 27.6, carbs: 0.75, fat: 9.21, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Beef stew.jpg") },
  { name: "Alcatra sem gordura grelhada", servingSize: 100, unit: "G", kcal: 241, protein: 31.9, carbs: 0, fat: 11.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Sirloin steak.jpg") },
  { name: "Contrafilé com gordura grelhado", servingSize: 100, unit: "G", kcal: 278, protein: 32.4, carbs: 0, fat: 15.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Striploin steak.jpg") },
  { name: "Contrafilé sem gordura grelhado", servingSize: 100, unit: "G", kcal: 194, protein: 35.9, carbs: 0, fat: 4.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Striploin steak.jpg") },
  { name: "Coxão mole sem gordura cozido", servingSize: 100, unit: "G", kcal: 219, protein: 32.4, carbs: 0, fat: 8.9, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Beef.jpg") },
  { name: "Coxão duro sem gordura cozido", servingSize: 100, unit: "G", kcal: 217, protein: 31.9, carbs: 0, fat: 8.9, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Beef.jpg") },
  { name: "Maminha grelhada", servingSize: 100, unit: "G", kcal: 153, protein: 30.7, carbs: 0, fat: 2.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Grilled beef steak.jpg") },
  { name: "Picanha com gordura grelhada", servingSize: 100, unit: "G", kcal: 289, protein: 26.4, carbs: 0, fat: 19.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Picanha.jpg") },
  { name: "Picanha sem gordura grelhada", servingSize: 100, unit: "G", kcal: 238, protein: 31.9, carbs: 0, fat: 11.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Picanha.jpg") },
  { name: "Costela bovina assada", servingSize: 100, unit: "G", kcal: 373, protein: 28.8, carbs: 0, fat: 27.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Beef ribs.jpg") },
  { name: "Lombo suíno assado", servingSize: 100, unit: "G", kcal: 210, protein: 35.7, carbs: 0, fat: 6.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Roast pork loin.jpg") },
  { name: "Bisteca suína grelhada", servingSize: 100, unit: "G", kcal: 247, protein: 28.9, carbs: 0, fat: 14.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Pork chop.jpg") },
  { name: "Tilápia grelhada", servingSize: 100, unit: "G", kcal: 128, protein: 26, carbs: 0, fat: 2.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Grilled tilapia.jpg") },
  { name: "Salmão grelhado", servingSize: 100, unit: "G", kcal: 231, protein: 25.4, carbs: 0, fat: 14.2, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: img("Grilled salmon.jpg") },
  { name: "Atum em lata em água", servingSize: 100, unit: "G", kcal: 116, protein: 26, carbs: 0, fat: 1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Canned tuna.jpg") },
  { name: "Sardinha em lata em óleo", servingSize: 100, unit: "G", kcal: 208, protein: 24.6, carbs: 0, fat: 11.5, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: img("Canned sardines.jpg") },
  { name: "Macarrão cozido sem óleo", servingSize: 100, unit: "G", kcal: 101, protein: 3.73, carbs: 21, fat: 0.48, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Cooked spaghetti.jpg") },
  { name: "Macarrão integral cozido", servingSize: 100, unit: "G", kcal: 123, protein: 4.89, carbs: 26.3, fat: 0.56, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Whole wheat pasta.jpg") },
  { name: "Macarrão com ovos cozido", servingSize: 100, unit: "G", kcal: 166, protein: 4.73, carbs: 35.2, fat: 0.9, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Egg noodles.jpg") },
  { name: "Banana prata", servingSize: 100, unit: "G", kcal: 98, protein: 1.3, carbs: 26, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Banana.jpg") },
  { name: "Banana nanica", servingSize: 100, unit: "G", kcal: 92, protein: 1.4, carbs: 23.8, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Bananas.jpg") },
  { name: "Banana da terra", servingSize: 100, unit: "G", kcal: 128, protein: 1.4, carbs: 33.7, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Plantains.jpg") },
  { name: "Maçã", servingSize: 100, unit: "G", kcal: 56, protein: 0.3, carbs: 15.2, fat: 0.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Red Apple.jpg") },
  { name: "Laranja pera", servingSize: 100, unit: "G", kcal: 45, protein: 1, carbs: 11.5, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Orange-Fruit-Pieces.jpg") },
  { name: "Mamão formosa", servingSize: 100, unit: "G", kcal: 45, protein: 0.8, carbs: 11.6, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Papaya.jpg") },
  { name: "Morango", servingSize: 100, unit: "G", kcal: 30, protein: 0.9, carbs: 6.8, fat: 0.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Strawberries.jpg") },
  { name: "Abacate", servingSize: 100, unit: "G", kcal: 96, protein: 1.2, carbs: 6, fat: 8.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Avocado.jpg") },
  { name: "Leite integral", servingSize: 200, unit: "ML", kcal: 122, protein: 6.4, carbs: 9.4, fat: 6.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Glass of milk.jpg") },
  { name: "Leite semidesnatado", servingSize: 200, unit: "ML", kcal: 92, protein: 6.4, carbs: 9.6, fat: 3.2, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Glass of milk.jpg") },
  { name: "Leite desnatado", servingSize: 200, unit: "ML", kcal: 70, protein: 6.8, carbs: 9.8, fat: 0.4, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Glass of milk.jpg") },
  { name: "Leite integral sem lactose", servingSize: 200, unit: "ML", kcal: 120, protein: 6.2, carbs: 9.4, fat: 6.4, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Glass of milk.jpg") },
  { name: "Iogurte natural", servingSize: 170, unit: "G", kcal: 87, protein: 7, carbs: 3.2, fat: 5.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Yogurt.jpg") },
  { name: "Iogurte grego natural", servingSize: 100, unit: "G", kcal: 97, protein: 9, carbs: 4, fat: 5, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Greek yogurt.jpg") },
  { name: "Queijo minas frescal", servingSize: 30, unit: "G", kcal: 79, protein: 5.3, carbs: 1, fat: 6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Minas cheese.jpg") },
  { name: "Queijo mussarela", servingSize: 30, unit: "G", kcal: 84, protein: 6.6, carbs: 0.9, fat: 6.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Mozzarella cheese.jpg") },
  { name: "Requeijão cremoso", servingSize: 30, unit: "G", kcal: 79, protein: 2.8, carbs: 1.2, fat: 7, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Cream cheese.jpg") },
  { name: "Aveia em flocos", servingSize: 30, unit: "G", kcal: 118, protein: 4.17, carbs: 19.98, fat: 2.55, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Rolled oats.jpg") },
  { name: "Tapioca (goma hidratada)", servingSize: 50, unit: "G", kcal: 120, protein: 0, carbs: 30, fat: 0, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: img("Tapioca crepe.jpg") },
  { name: "Cuscuz de milho cozido", servingSize: 100, unit: "G", kcal: 113, protein: 2.2, carbs: 25.3, fat: 0.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Couscous.jpg") },
  { name: "Whey protein concentrado (genérico)", servingSize: 30, unit: "G", kcal: 120, protein: 24, carbs: 3, fat: 1.5, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Whey protein powder.jpg") },
  { name: "Whey protein isolado (genérico)", servingSize: 30, unit: "G", kcal: 110, protein: 27, carbs: 1, fat: 0.5, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Whey protein powder.jpg") },
  { name: "Whey Growth concentrado 80% natural", servingSize: 30, unit: "G", kcal: 122, protein: 23, carbs: 2.8, fat: 2.1, sourceName: "Growth", sourceUrl: GROWTH_URL, imageUrl: img("Whey protein powder.jpg") },
  { name: "Creatina monohidratada", servingSize: 3, unit: "G", kcal: 0, protein: 0, carbs: 0, fat: 0, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Creatine monohydrate.jpg") },
  { name: "Pão francês", servingSize: 50, unit: "G", kcal: 150, protein: 4, carbs: 29.3, fat: 1.55, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Pães franceses.jpg") },
  { name: "Pão de forma integral", servingSize: 50, unit: "G", kcal: 127, protein: 4.7, carbs: 25, fat: 1.85, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Whole wheat bread.jpg") },
  { name: "Pão fatiado caseiro", servingSize: 50, unit: "G", kcal: 133, protein: 4.5, carbs: 25.5, fat: 1.7, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Homemade bread slices.jpg") },
  { name: "Tapioca com queijo", servingSize: 100, unit: "G", kcal: 210, protein: 6, carbs: 33, fat: 6, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Tapioca crepe.jpg") },
  { name: "Batata-doce cozida", servingSize: 100, unit: "G", kcal: 77, protein: 0.6, carbs: 18.4, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Sweet potato.jpg") },
  { name: "Batata inglesa cozida", servingSize: 100, unit: "G", kcal: 52, protein: 1.2, carbs: 11.9, fat: 0, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Boiled potatoes.jpg") },
  { name: "Mandioca cozida", servingSize: 100, unit: "G", kcal: 125, protein: 0.6, carbs: 30.1, fat: 0.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Cassava.jpg") },
  { name: "Brócolis cozido", servingSize: 100, unit: "G", kcal: 25, protein: 2.1, carbs: 4.4, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Broccoli.jpg") },
  { name: "Alface crespa", servingSize: 100, unit: "G", kcal: 11, protein: 1.3, carbs: 1.7, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Lettuce.jpg") },
  { name: "Alface americana", servingSize: 100, unit: "G", kcal: 14, protein: 0.9, carbs: 3, fat: 0.1, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: img("Iceberg lettuce.jpg") },
  { name: "Tomate cru", servingSize: 100, unit: "G", kcal: 15, protein: 1.1, carbs: 3.1, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Tomato je.jpg") },
  { name: "Cenoura crua", servingSize: 100, unit: "G", kcal: 34, protein: 1.3, carbs: 7.7, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Carrots.jpg") },
  { name: "Pepino cru", servingSize: 100, unit: "G", kcal: 10, protein: 0.9, carbs: 2, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Cucumber.jpg") },
  { name: "Cebola crua", servingSize: 100, unit: "G", kcal: 39, protein: 1.7, carbs: 8.9, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Onion.jpg") },
  { name: "Espinafre refogado", servingSize: 100, unit: "G", kcal: 28, protein: 3, carbs: 3.6, fat: 0.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Spinach.jpg") },
  { name: "Amendoim torrado", servingSize: 30, unit: "G", kcal: 180, protein: 8.1, carbs: 5.7, fat: 14.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Peanuts.jpg") },
  { name: "Pasta de amendoim integral", servingSize: 20, unit: "G", kcal: 118, protein: 5, carbs: 4, fat: 9.6, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: img("Peanut butter.jpg") },
  { name: "Castanha-do-pará", servingSize: 30, unit: "G", kcal: 197, protein: 4.3, carbs: 3.5, fat: 19.8, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Brazil nuts.jpg") },
  { name: "Azeite de oliva extravirgem", servingSize: 10, unit: "ML", kcal: 88, protein: 0, carbs: 0, fat: 10, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: img("Olive oil.jpg") },
];

async function seedFoods() {
  await db.food.updateMany({
    where: { userId: null, name: { notIn: FOODS.map((food) => food.name) } },
    data: { archived: true },
  });
  for (const food of FOODS) {
    const existing = await db.food.findFirst({ where: { userId: null, name: food.name } });
    const data = { ...food, userId: null, archived: false };
    if (existing) await db.food.update({ where: { id: existing.id }, data });
    else await db.food.create({ data });
  }
  console.log(`✔ ${FOODS.length} alimentos base sincronizados`);
}

// ───────────── Demo ─────────────

const DEMO_EMAIL = "demo@leandrogym.app";

type Ex = [name: string, group: MuscleGroup];
const EXERCISES: Ex[] = [
  ["Supino reto", "CHEST"], ["Supino inclinado halteres", "CHEST"], ["Crucifixo", "CHEST"],
  ["Tríceps corda", "TRICEPS"], ["Tríceps francês", "TRICEPS"],
  ["Puxada frontal", "BACK"], ["Remada curvada", "BACK"], ["Remada baixa", "BACK"],
  ["Rosca direta", "BICEPS"], ["Rosca martelo", "BICEPS"],
  ["Agachamento", "QUADS"], ["Leg press", "QUADS"], ["Cadeira extensora", "QUADS"],
  ["Mesa flexora", "HAMSTRINGS"], ["Panturrilha em pé", "CALVES"],
  ["Desenvolvimento", "SHOULDERS"], ["Elevação lateral", "SHOULDERS"],
];

// weekday → [nome, tipo, exercícios [nome, séries, repMin, repMax, carga inicial]]
type PlanDay = [string, DayType, [string, number, number, number, number][]];
const PLAN: Record<number, PlanDay> = {
  1: ["Peito + Tríceps", "WORKOUT", [["Supino reto", 4, 6, 8, 30], ["Supino inclinado halteres", 3, 8, 10, 22], ["Crucifixo", 3, 10, 12, 12], ["Tríceps corda", 3, 10, 12, 20]]],
  2: ["Costas + Bíceps", "WORKOUT", [["Puxada frontal", 4, 8, 10, 50], ["Remada curvada", 3, 8, 10, 40], ["Rosca direta", 3, 8, 10, 20], ["Rosca martelo", 3, 10, 12, 12]]],
  3: ["Descanso", "REST", []],
  4: ["Perna", "WORKOUT", [["Agachamento", 4, 6, 8, 70], ["Leg press", 3, 10, 12, 150], ["Mesa flexora", 3, 10, 12, 35], ["Panturrilha em pé", 4, 12, 15, 40]]],
  5: ["Upper", "WORKOUT", [["Supino reto", 3, 8, 10, 28], ["Remada baixa", 3, 8, 10, 45], ["Desenvolvimento", 3, 8, 10, 16], ["Elevação lateral", 3, 12, 15, 8]]],
  6: ["Corrida", "CARDIO", []],
  7: ["Descanso", "REST", []],
};

function dateStr(offsetDays: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

/**
 * Apaga o usuário demo respeitando as FKs. `WorkoutDayExercise`/`WorkoutExercise`
 * apontam para `Exercise` e `MealFood` aponta para `Food` com `onDelete: Restrict`,
 * então as fichas, sessões e refeições precisam sair antes do usuário (que só então
 * pode cascatear exercícios e alimentos).
 */
async function resetDemoUser() {
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } });
  if (!existing) return;
  const userId = existing.id;

  await db.workoutPlan.deleteMany({ where: { userId } }); // → WorkoutDay → WorkoutDayExercise
  await db.workoutSession.deleteMany({ where: { userId } }); // → WorkoutExercise → ExerciseSet
  await db.meal.deleteMany({ where: { userId } }); // → MealFood
  await db.favoriteMeal.deleteMany({ where: { userId } }); // → FavoriteMealItem
  await db.user.delete({ where: { id: userId } });
}

async function seedDemo() {
  await resetDemoUser();
  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo",
      passwordHash: await bcrypt.hash("demo1234", 10),
      settings: { create: { tdeeKcal: 2800 } },
      nutritionGoals: { create: { kcal: 2500, protein: 160, carbs: 280, fat: 70, startDate: dateStr(-60) } },
    },
  });

  const exIds = new Map<string, string>();
  for (const [name, muscleGroup] of EXERCISES) {
    const ex = await db.exercise.create({ data: { userId: user.id, name, muscleGroup } });
    exIds.set(name, ex.id);
  }

  const plan = await db.workoutPlan.create({ data: { userId: user.id, name: "ABC + Upper", active: true } });
  const dayIds = new Map<number, string>();
  for (const [wd, [name, type, exs]] of Object.entries(PLAN)) {
    const day = await db.workoutDay.create({
      data: {
        planId: plan.id, weekday: Number(wd), name, type,
        exercises: {
          create: exs.map(([exName, sets, repMin, repMax], i) => ({
            exerciseId: exIds.get(exName)!, order: i + 1, plannedSets: sets, repMin, repMax, restSeconds: 120,
          })),
        },
      },
    });
    dayIds.set(Number(wd), day.id);
  }

  // 5 semanas de histórico com progressão leve.
  for (let offset = -35; offset < 0; offset++) {
    const date = dateStr(offset);
    const wd = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    const [name, type, exs] = PLAN[wd];
    const week = Math.floor((offset + 35) / 7);

    // Peso: tendência de queda leve + ruído
    await db.bodyWeight.create({
      data: { userId: user.id, date, weightKg: Math.round((73.5 - week * 0.3 + (Math.random() - 0.5) * 0.8) * 10) / 10 },
    });

    if (type !== "WORKOUT" || Math.random() < 0.1) continue;
    const startedAt = new Date(date.getTime() + 18 * 3600_000);
    await db.workoutSession.create({
      data: {
        userId: user.id, workoutDayId: dayIds.get(wd), name, date, startedAt,
        finishedAt: new Date(startedAt.getTime() + 60 * 60_000),
        exercises: {
          create: exs.map(([exName, sets, repMin, repMax, baseKg], i) => ({
            exerciseId: exIds.get(exName)!, order: i + 1, plannedSets: sets, repMin, repMax, restSeconds: 120,
            sets: {
              create: Array.from({ length: sets }, (_, s) => ({
                id: randomUUID(),
                setNumber: s + 1,
                weight: baseKg + week * 2,
                repetitions: Math.max(repMin - 1, repMax - s - (week % 2)),
                rir: Math.max(0, 2 - s),
                completedAt: startedAt,
              })),
            },
          })),
        },
      },
    });
  }
  console.log(`✔ Usuário demo criado: ${DEMO_EMAIL} / demo1234`);
}

async function main() {
  await seedFoods();
  if (process.argv.includes("--demo")) await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
