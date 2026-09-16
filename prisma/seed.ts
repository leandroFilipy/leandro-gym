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
// imageUrl: fotos reais resolvidas no Wikimedia Commons (scripts/resolve-food-images.mjs).

const FOODS: FoodSeed[] = [
  { name: "Arroz branco cozido", servingSize: 100, unit: "G", kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/A_bowl_of_rice.jpg/500px-A_bowl_of_rice.jpg"},
  { name: "Arroz integral cozido", servingSize: 100, unit: "G", kcal: 124, protein: 2.6, carbs: 25.8, fat: 1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Par_cooked_brown_rice_-_stonesoup_cropped.jpg/500px-Par_cooked_brown_rice_-_stonesoup_cropped.jpg"},
  { name: "Feijão carioca cozido", servingSize: 100, unit: "G", kcal: 71, protein: 4.77, carbs: 15.3, fat: 0.53, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/High_School_of_Commerce_%28IA_high1935schoolofcomm00highrich%29.pdf/page1-500px-High_School_of_Commerce_%28IA_high1935schoolofcomm00highrich%29.pdf.jpg" },
  { name: "Feijão preto cozido", servingSize: 100, unit: "G", kcal: 77, protein: 4.5, carbs: 14, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Cooked_Samp_mixed_with_Black_Eye_beans.jpg/500px-Cooked_Samp_mixed_with_Black_Eye_beans.jpg"},
  { name: "Feijão branco cozido", servingSize: 100, unit: "G", kcal: 129, protein: 8.7, carbs: 25.1, fat: 0.5, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Kuru_Fasulye_pilav.jpg/500px-Kuru_Fasulye_pilav.jpg"},
  { name: "Lentilha cozida", servingSize: 100, unit: "G", kcal: 93, protein: 6.3, carbs: 16.3, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Liat_Portal_for_Foodie_Disorder_-_Cooked_Lentils_with_Caramelized_Onions.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Cooked_Lentils_with_Caramelized_Onions.jpg"},
  { name: "Grão-de-bico cozido", servingSize: 100, unit: "G", kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Chickpeas_-_The_Coconut_Island_2025-10-05.jpg/500px-Chickpeas_-_The_Coconut_Island_2025-10-05.jpg"},
  { name: "Ovo de galinha cozido", servingSize: 1, unit: "UNIT", kcal: 73, protein: 6.65, carbs: 0.3, fat: 4.75, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Boiled_Egg_-_Crossection.jpg/500px-Boiled_Egg_-_Crossection.jpg"},
  { name: "Ovo de galinha frito", servingSize: 100, unit: "G", kcal: 240, protein: 15.6, carbs: 1.2, fat: 18.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Leberk%C3%A4s_mit_Spiegelei_in_Prien_02.jpg/500px-Leberk%C3%A4s_mit_Spiegelei_in_Prien_02.jpg" },
  { name: "Clara de ovo cozida", servingSize: 1, unit: "UNIT", kcal: 18, protein: 4.02, carbs: 0, fat: 0.03, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/Chicken_Egg_without_Eggshell_5859.jpg/500px-Chicken_Egg_without_Eggshell_5859.jpg"},
  { name: "Peito de frango grelhado", servingSize: 100, unit: "G", kcal: 159, protein: 32, carbs: 0, fat: 2.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Grilled_chicken_breast%2C_Santo_Domingo%2C_La_Palma.jpg/500px-Grilled_chicken_breast%2C_Santo_Domingo%2C_La_Palma.jpg"},
  { name: "Coxa de frango sem pele cozida", servingSize: 100, unit: "G", kcal: 167, protein: 26.9, carbs: 0, fat: 5.8, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Liat_Portal_for_Foodie_Disorder_-_Homemade_chicken_thighs_with_vegetables_and_rice.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Homemade_chicken_thighs_with_vegetables_and_rice.jpg"},
  { name: "Filé de frango à milanesa", servingSize: 100, unit: "G", kcal: 221, protein: 28.5, carbs: 7.5, fat: 7.8, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Allg%C3%A4uer_Schnitzel_mit_Kr%C3%A4uterr%C3%B6sti.jpg/500px-Allg%C3%A4uer_Schnitzel_mit_Kr%C3%A4uterr%C3%B6sti.jpg"},
  { name: "Patinho sem gordura grelhado", servingSize: 100, unit: "G", kcal: 219, protein: 35.9, carbs: 0, fat: 7.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Grilled_beef_steak_in_Cala_P%C3%AD%2C_Mallorca%2C_Spain.jpg/500px-Grilled_beef_steak_in_Cala_P%C3%AD%2C_Mallorca%2C_Spain.jpg"},
  { name: "Carne moída (acém) refogada", servingSize: 100, unit: "G", kcal: 216, protein: 26.7, carbs: 0.9, fat: 11.7, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/79/Goulash_from_usa.jpg" },
  { name: "Músculo bovino refogado na panela", servingSize: 100, unit: "G", kcal: 196, protein: 27.6, carbs: 0.75, fat: 9.21, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Pot-au-feu_SAM_2723.JPG/500px-Pot-au-feu_SAM_2723.JPG"},
  { name: "Alcatra sem gordura grelhada", servingSize: 100, unit: "G", kcal: 241, protein: 31.9, carbs: 0, fat: 11.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Grilled_Sirloin_Steak_with_Vegetables.jpg/500px-Grilled_Sirloin_Steak_with_Vegetables.jpg"},
  { name: "Contrafilé com gordura grelhado", servingSize: 100, unit: "G", kcal: 278, protein: 32.4, carbs: 0, fat: 15.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Rump_steak.jpg/500px-Rump_steak.jpg" },
  { name: "Contrafilé sem gordura grelhado", servingSize: 100, unit: "G", kcal: 194, protein: 35.9, carbs: 0, fat: 4.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Rump_steak.jpg/500px-Rump_steak.jpg"},
  { name: "Coxão mole sem gordura cozido", servingSize: 100, unit: "G", kcal: 219, protein: 32.4, carbs: 0, fat: 8.9, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/-2022-02-06_Topside_of_beef_roasting_joint%2C_Trimingham%2C_Norfolk.JPG/500px--2022-02-06_Topside_of_beef_roasting_joint%2C_Trimingham%2C_Norfolk.JPG"},
  { name: "Coxão duro sem gordura cozido", servingSize: 100, unit: "G", kcal: 217, protein: 31.9, carbs: 0, fat: 8.9, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/The_Belgian_cook-book_%28IA_belgiancookbook00luck%29.pdf/page1-500px-The_Belgian_cook-book_%28IA_belgiancookbook00luck%29.pdf.jpg"},
  { name: "Maminha grelhada", servingSize: 100, unit: "G", kcal: 153, protein: 30.7, carbs: 0, fat: 2.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Tri-tip-MCB.jpg/500px-Tri-tip-MCB.jpg"},
  { name: "Picanha com gordura grelhada", servingSize: 100, unit: "G", kcal: 289, protein: 26.4, carbs: 0, fat: 19.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/GrilledPicanha.jpg/500px-GrilledPicanha.jpg"},
  { name: "Picanha sem gordura grelhada", servingSize: 100, unit: "G", kcal: 238, protein: 31.9, carbs: 0, fat: 11.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Picanha_%2814759358544%29.jpg/500px-Picanha_%2814759358544%29.jpg"},
  { name: "Costela bovina assada", servingSize: 100, unit: "G", kcal: 373, protein: 28.8, carbs: 0, fat: 27.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Roast_beef_ribs.jpg/500px-Roast_beef_ribs.jpg"},
  { name: "Lombo suíno assado", servingSize: 100, unit: "G", kcal: 210, protein: 35.7, carbs: 0, fat: 6.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Roasted_Loin_of_Pork_%282287948470%29.jpg/500px-Roasted_Loin_of_Pork_%282287948470%29.jpg"},
  { name: "Bisteca suína grelhada", servingSize: 100, unit: "G", kcal: 247, protein: 28.9, carbs: 0, fat: 14.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Grilled_pork_chops.jpg/500px-Grilled_pork_chops.jpg"},
  { name: "Tilápia grelhada", servingSize: 100, unit: "G", kcal: 128, protein: 26, carbs: 0, fat: 2.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Grilled_Tilapia_001.jpg/500px-Grilled_Tilapia_001.jpg"},
  { name: "Salmão grelhado", servingSize: 100, unit: "G", kcal: 231, protein: 25.4, carbs: 0, fat: 14.2, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Grilled_plated_salmon_fillet_%28cropped%29.jpg/500px-Grilled_plated_salmon_fillet_%28cropped%29.jpg"},
  { name: "Atum em lata em água", servingSize: 100, unit: "G", kcal: 116, protein: 26, carbs: 0, fat: 1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Canned_and_packaged_tuna_on_supermarket_shelves.jpg/500px-Canned_and_packaged_tuna_on_supermarket_shelves.jpg"},
  { name: "Sardinha em lata em óleo", servingSize: 100, unit: "G", kcal: 208, protein: 24.6, carbs: 0, fat: 11.5, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/2006_sardines_can_open.jpg/500px-2006_sardines_can_open.jpg" },
  { name: "Macarrão cozido sem óleo", servingSize: 100, unit: "G", kcal: 101, protein: 3.73, carbs: 21, fat: 0.48, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg/500px-%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg"},
  { name: "Macarrão integral cozido", servingSize: 100, unit: "G", kcal: 123, protein: 4.89, carbs: 26.3, fat: 0.56, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg/500px-%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg"},
  { name: "Macarrão com ovos cozido", servingSize: 100, unit: "G", kcal: 166, protein: 4.73, carbs: 35.2, fat: 0.9, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Cooked_noodles_and_boiled_eggs.jpg/500px-Cooked_noodles_and_boiled_eggs.jpg"},
  { name: "Banana prata", servingSize: 100, unit: "G", kcal: 98, protein: 1.3, carbs: 26, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Cavendish_banana_from_Maracaibo.jpg/500px-Cavendish_banana_from_Maracaibo.jpg"},
  { name: "Banana nanica", servingSize: 100, unit: "G", kcal: 92, protein: 1.4, carbs: 23.8, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Banana_bunch_in_a_banana_farm_at_Chinawal.jpg/500px-Banana_bunch_in_a_banana_farm_at_Chinawal.jpg"},
  { name: "Banana da terra", servingSize: 100, unit: "G", kcal: 128, protein: 1.4, carbs: 33.7, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Ripe_plantains.jpg/500px-Ripe_plantains.jpg"},
  { name: "Maçã", servingSize: 100, unit: "G", kcal: 56, protein: 0.3, carbs: 15.2, fat: 0.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/500px-Red_Apple.jpg"},
  { name: "Laranja pera", servingSize: 100, unit: "G", kcal: 45, protein: 1, carbs: 11.5, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Blood_orange_slice.jpg/500px-Blood_orange_slice.jpg"},
  { name: "Mamão formosa", servingSize: 100, unit: "G", kcal: 45, protein: 0.8, carbs: 11.6, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Papaya_-_longitudinal_section_close-up_view.jpg/500px-Papaya_-_longitudinal_section_close-up_view.jpg"},
  { name: "Morango", servingSize: 100, unit: "G", kcal: 30, protein: 0.9, carbs: 6.8, fat: 0.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Still_life_with_strawberries_in_a_crystal_bowl.jpg/500px-Still_life_with_strawberries_in_a_crystal_bowl.jpg"},
  { name: "Abacate", servingSize: 100, unit: "G", kcal: 96, protein: 1.2, carbs: 6, fat: 8.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Avocado_with_cross_section_edit.jpg/500px-Avocado_with_cross_section_edit.jpg"},
  { name: "Leite integral", servingSize: 200, unit: "ML", kcal: 122, protein: 6.4, carbs: 9.4, fat: 6.6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/2025.04.10_Milk_Glass_Sugar_Bowl_and_Antique_Glass_Creamer.jpg/500px-2025.04.10_Milk_Glass_Sugar_Bowl_and_Antique_Glass_Creamer.jpg"},
  { name: "Leite semidesnatado", servingSize: 200, unit: "ML", kcal: 92, protein: 6.4, carbs: 9.6, fat: 3.2, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/2025.04.10_Milk_Glass_Sugar_Bowl_and_Antique_Glass_Creamer.jpg/500px-2025.04.10_Milk_Glass_Sugar_Bowl_and_Antique_Glass_Creamer.jpg"},
  { name: "Leite desnatado", servingSize: 200, unit: "ML", kcal: 70, protein: 6.8, carbs: 9.8, fat: 0.4, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Dry_skim_milk_%28IA_CAT10679518%29.pdf/page1-500px-Dry_skim_milk_%28IA_CAT10679518%29.pdf.jpg"},
  { name: "Leite integral sem lactose", servingSize: 200, unit: "ML", kcal: 120, protein: 6.2, carbs: 9.4, fat: 6.4, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/2025.04.10_Milk_Glass_Sugar_Bowl_and_Antique_Glass_Creamer.jpg/500px-2025.04.10_Milk_Glass_Sugar_Bowl_and_Antique_Glass_Creamer.jpg"},
  { name: "Iogurte natural", servingSize: 170, unit: "G", kcal: 87, protein: 7, carbs: 3.2, fat: 5.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Milk%2C_yogurt_%26_cheese_recipes_%28IA_CAT31314481%29.pdf/page1-500px-Milk%2C_yogurt_%26_cheese_recipes_%28IA_CAT31314481%29.pdf.jpg"},
  { name: "Iogurte grego natural", servingSize: 100, unit: "G", kcal: 97, protein: 9, carbs: 4, fat: 5, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Labneh_%285196911587%29.jpg/500px-Labneh_%285196911587%29.jpg"},
  { name: "Queijo minas frescal", servingSize: 30, unit: "G", kcal: 79, protein: 5.3, carbs: 1, fat: 6, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Liat_Portal_for_Foodie_Disorder_-_Grilled_Cheese_Sandwich_with_Fresh_Salad.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Grilled_Cheese_Sandwich_with_Fresh_Salad.jpg"},
  { name: "Queijo mussarela", servingSize: 30, unit: "G", kcal: 84, protein: 6.6, carbs: 0.9, fat: 6.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Mozzarella_cheese.jpg/500px-Mozzarella_cheese.jpg"},
  { name: "Requeijão cremoso", servingSize: 30, unit: "G", kcal: 79, protein: 2.8, carbs: 1.2, fat: 7, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Cream_crackers_with_cheese_spread.jpg/500px-Cream_crackers_with_cheese_spread.jpg"},
  { name: "Aveia em flocos", servingSize: 30, unit: "G", kcal: 118, protein: 4.17, carbs: 19.98, fat: 2.55, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Rolled_oats.jpg/500px-Rolled_oats.jpg"},
  { name: "Tapioca (goma hidratada)", servingSize: 50, unit: "G", kcal: 120, protein: 0, carbs: 30, fat: 0, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/A_plate_of_Tapioca.jpg/500px-A_plate_of_Tapioca.jpg" },
  { name: "Cuscuz de milho cozido", servingSize: 100, unit: "G", kcal: 113, protein: 2.2, carbs: 25.3, fat: 0.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Cuscuz_paulista.jpg/500px-Cuscuz_paulista.jpg"},
  { name: "Whey protein concentrado (genérico)", servingSize: 30, unit: "G", kcal: 120, protein: 24, carbs: 3, fat: 1.5, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Supplement_Your_Knowledge_%28IA_SupplementYourKnowledgeNavyMedicine%29.pdf/page1-500px-Supplement_Your_Knowledge_%28IA_SupplementYourKnowledgeNavyMedicine%29.pdf.jpg" },
  { name: "Whey protein isolado (genérico)", servingSize: 30, unit: "G", kcal: 110, protein: 27, carbs: 1, fat: 0.5, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Optimus_nutrition_gold_standard_whey_protein_%282%29.jpg/500px-Optimus_nutrition_gold_standard_whey_protein_%282%29.jpg" },
  { name: "Whey Growth concentrado 80% natural", servingSize: 30, unit: "G", kcal: 122, protein: 23, carbs: 2.8, fat: 2.1, sourceName: "Growth", sourceUrl: GROWTH_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Supplement_Your_Knowledge_%28IA_SupplementYourKnowledgeNavyMedicine%29.pdf/page1-500px-Supplement_Your_Knowledge_%28IA_SupplementYourKnowledgeNavyMedicine%29.pdf.jpg"},
  { name: "Creatina monohidratada", servingSize: 3, unit: "G", kcal: 0, protein: 0, carbs: 0, fat: 0, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Creatine_monohydrate_powder.jpg/500px-Creatine_monohydrate_powder.jpg"},
  { name: "Pão francês", servingSize: 50, unit: "G", kcal: 150, protein: 4, carbs: 29.3, fat: 1.55, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Our_little_Brazilian_cousin_%28IA_ourlittlebrazili00nixo%29.pdf/page1-500px-Our_little_Brazilian_cousin_%28IA_ourlittlebrazili00nixo%29.pdf.jpg"},
  { name: "Pão de forma integral", servingSize: 50, unit: "G", kcal: 127, protein: 4.7, carbs: 25, fat: 1.85, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Vegan_no-knead_whole_wheat_bread_loaf%2C_sliced%2C_September_2010.jpg/500px-Vegan_no-knead_whole_wheat_bread_loaf%2C_sliced%2C_September_2010.jpg"},
  { name: "Pão fatiado caseiro", servingSize: 50, unit: "G", kcal: 133, protein: 4.5, carbs: 25.5, fat: 1.7, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Slices_of_bread_colored_home_made.png/500px-Slices_of_bread_colored_home_made.png"},
  { name: "Tapioca com queijo", servingSize: 100, unit: "G", kcal: 210, protein: 6, carbs: 33, fat: 6, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Books_from_the_Library_of_Congress_%28IA_nationalcoursein00beez%29.pdf/page1-500px-Books_from_the_Library_of_Congress_%28IA_nationalcoursein00beez%29.pdf.jpg"},
  { name: "Batata-doce cozida", servingSize: 100, unit: "G", kcal: 77, protein: 0.6, carbs: 18.4, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Cooked_sweet_potatoes.jpg/500px-Cooked_sweet_potatoes.jpg"},
  { name: "Batata inglesa cozida", servingSize: 100, unit: "G", kcal: 52, protein: 1.2, carbs: 11.9, fat: 0, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Potato_flowers_2016_G1.jpg/500px-Potato_flowers_2016_G1.jpg"},
  { name: "Mandioca cozida", servingSize: 100, unit: "G", kcal: 125, protein: 0.6, carbs: 30.1, fat: 0.3, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Boiled_cassava%2C.jpg/500px-Boiled_cassava%2C.jpg"},
  { name: "Brócolis cozido", servingSize: 100, unit: "G", kcal: 25, protein: 2.1, carbs: 4.4, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Cooked_broccoli_florets_in_a_textured_glass_bowl.jpg/500px-Cooked_broccoli_florets_in_a_textured_glass_bowl.jpg"},
  { name: "Alface crespa", servingSize: 100, unit: "G", kcal: 11, protein: 1.3, carbs: 1.7, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Green_Oak_Leaf_lettuce_J1.jpg/500px-Green_Oak_Leaf_lettuce_J1.jpg"},
  { name: "Alface americana", servingSize: 100, unit: "G", kcal: 14, protein: 0.9, carbs: 3, fat: 0.1, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Iceberg_lettuce_%28IJssla_krop%29.jpg/500px-Iceberg_lettuce_%28IJssla_krop%29.jpg"},
  { name: "Tomate cru", servingSize: 100, unit: "G", kcal: 15, protein: 1.1, carbs: 3.1, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Fresh_Tomato_logo.svg/500px-Fresh_Tomato_logo.svg.png"},
  { name: "Cenoura crua", servingSize: 100, unit: "G", kcal: 34, protein: 1.3, carbs: 7.7, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Fresh_Carrots_02.jpg/500px-Fresh_Carrots_02.jpg"},
  { name: "Pepino cru", servingSize: 100, unit: "G", kcal: 10, protein: 0.9, carbs: 2, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Ryerson_Market_cucumbers_on_sale.jpg/500px-Ryerson_Market_cucumbers_on_sale.jpg"},
  { name: "Cebola crua", servingSize: 100, unit: "G", kcal: 39, protein: 1.7, carbs: 8.9, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Harvested_vegetables%28Onions%29.jpg/500px-Harvested_vegetables%28Onions%29.jpg"},
  { name: "Espinafre refogado", servingSize: 100, unit: "G", kcal: 28, protein: 3, carbs: 3.6, fat: 0.7, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Liat_Portal_for_Foodie_Disorder_-_Green_shakshuka_with_spinach_and_egg.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Green_shakshuka_with_spinach_and_egg.jpg"},
  { name: "Amendoim torrado", servingSize: 30, unit: "G", kcal: 180, protein: 8.1, carbs: 5.7, fat: 14.4, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Roasted_Peanuts_with_shell.jpg/500px-Roasted_Peanuts_with_shell.jpg"},
  { name: "Pasta de amendoim integral", servingSize: 20, unit: "G", kcal: 118, protein: 5, carbs: 4, fat: 9.6, sourceName: "Rótulo", sourceUrl: LABEL_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Three_lb_peanut_butter_jar.jpg/500px-Three_lb_peanut_butter_jar.jpg"},
  { name: "Castanha-do-pará", servingSize: 30, unit: "G", kcal: 197, protein: 4.3, carbs: 3.5, fat: 19.8, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/47/Bertholletia_excelsa.jpg"},
  { name: "Azeite de oliva extravirgem", servingSize: 10, unit: "ML", kcal: 88, protein: 0, carbs: 0, fat: 10, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Olive_oil_bottle_Bertolli_Riserva_Premium.jpg/500px-Olive_oil_bottle_Bertolli_Riserva_Premium.jpg"},

  // ───────────── Carnes: frango ─────────────
  { name: "Coxa de frango com pele assada", servingSize: 100, unit: "G", kcal: 215, protein: 27.5, carbs: 0, fat: 11.5, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Curry_roasted_cauliflower_and_haricots_verts%2C_roasted_garlic_celeriac_puree%2C_beef_bourguignon%2C_and_chicken_thigh_with_sweet_potato_and_apple_-_Boston%2C_MA.jpg/500px-Curry_roasted_cauliflower_and_haricots_verts%2C_roasted_garlic_celeriac_puree%2C_beef_bourguignon%2C_and_chicken_thigh_with_sweet_potato_and_apple_-_Boston%2C_MA.jpg"},
  { name: "Coxa de frango sem pele grelhada", servingSize: 100, unit: "G", kcal: 179, protein: 28.5, carbs: 0, fat: 6.9, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Grilled_Chicken_Thigh_at_2026_BIFC_20260905151916.jpg/500px-Grilled_Chicken_Thigh_at_2026_BIFC_20260905151916.jpg"},
  { name: "Sobrecoxa de frango com pele assada", servingSize: 100, unit: "G", kcal: 233, protein: 25.6, carbs: 0, fat: 14, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Roasted_chicken_leg_piece-MB20.jpg/500px-Roasted_chicken_leg_piece-MB20.jpg"},
  { name: "Sobrecoxa de frango sem pele cozida", servingSize: 100, unit: "G", kcal: 185, protein: 26.5, carbs: 0, fat: 8.2, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/A_partial_list_of_references_on_poultry_processing_shrinkages%2C_weights_of_parts%2C_and_raw_and_cooked_poultry_meat_yield_%28IA_CAT10678490%29.pdf/page1-500px-A_partial_list_of_references_on_poultry_processing_shrinkages%2C_weights_of_parts%2C_and_raw_and_cooked_poultry_meat_yield_%28IA_CAT10678490%29.pdf.jpg"},
  { name: "Asa de frango assada", servingSize: 100, unit: "G", kcal: 266, protein: 27.1, carbs: 0, fat: 17, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Roasted_Chicken_Rice_-_01.jpg/500px-Roasted_Chicken_Rice_-_01.jpg"},
  { name: "Peito de frango cozido desfiado", servingSize: 100, unit: "G", kcal: 165, protein: 31, carbs: 0, fat: 3.6, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Saut%C3%A9ed_Shredded_Chicken_Breast_with_Coriander.jpg/500px-Saut%C3%A9ed_Shredded_Chicken_Breast_with_Coriander.jpg"},
  { name: "Coração de frango grelhado", servingSize: 100, unit: "G", kcal: 185, protein: 26.4, carbs: 0.1, fat: 8, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Grilled_chicken_heart.jpg/500px-Grilled_chicken_heart.jpg"},
  { name: "Fígado de frango cozido", servingSize: 100, unit: "G", kcal: 167, protein: 24.5, carbs: 0.9, fat: 6.5, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Liat_Portal_for_Foodie_Disorder_-_Chicken_Liver_with_Chestnuts_and_Rice.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Chicken_Liver_with_Chestnuts_and_Rice.jpg"},

  // ───────────── Carnes: boi ─────────────
  { name: "Acém bovino assado", servingSize: 100, unit: "G", kcal: 234, protein: 27, carbs: 0, fat: 13.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Smoked_Chuck_Roast_texture14.jpg/500px-Smoked_Chuck_Roast_texture14.jpg"},
  { name: "Acém bovino cozido", servingSize: 100, unit: "G", kcal: 215, protein: 27.5, carbs: 0, fat: 11.2, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Facts_about_beef_%28IA_CAT31063261%29.pdf/page1-500px-Facts_about_beef_%28IA_CAT31063261%29.pdf.jpg"},
  { name: "Fraldinha grelhada", servingSize: 100, unit: "G", kcal: 245, protein: 28.5, carbs: 0, fat: 14, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Grilled_flank_steak.jpg/500px-Grilled_flank_steak.jpg"},
  { name: "Cupim assado", servingSize: 100, unit: "G", kcal: 330, protein: 24, carbs: 0, fat: 26, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Some_essentials_in_beef_production_%28IA_CAT87201495%29.pdf/page1-500px-Some_essentials_in_beef_production_%28IA_CAT87201495%29.pdf.jpg"},
  { name: "Bife de patinho frito no óleo", servingSize: 100, unit: "G", kcal: 258, protein: 32, carbs: 0, fat: 14.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Steak_and_fries.jpeg/500px-Steak_and_fries.jpeg"},
  { name: "Bife acebolado (contrafilé)", servingSize: 100, unit: "G", kcal: 271, protein: 27, carbs: 2.5, fat: 16.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Steak_sandwich_with_onions_and_cheese_on_a_toasted_baguette_-_Massachusetts.jpg/500px-Steak_sandwich_with_onions_and_cheese_on_a_toasted_baguette_-_Massachusetts.jpg" },
  { name: "Costela bovina no bafo", servingSize: 100, unit: "G", kcal: 340, protein: 27, carbs: 0, fat: 25.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Beef_short_ribs.jpg/500px-Beef_short_ribs.jpg"},
  { name: "Carne moída refogada com óleo", servingSize: 100, unit: "G", kcal: 241, protein: 26, carbs: 0.9, fat: 15, sourceName: "TBCA", sourceUrl: TBCA_URL, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/79/Goulash_from_usa.jpg"},
  { name: "Língua bovina cozida", servingSize: 100, unit: "G", kcal: 284, protein: 22, carbs: 0, fat: 21, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Beef_tongue_preparation.jpg/500px-Beef_tongue_preparation.jpg"},
  { name: "Fígado bovino grelhado", servingSize: 100, unit: "G", kcal: 175, protein: 26.5, carbs: 4.4, fat: 4.7, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Spanish_pork_and_Grilled_Beef_with_Duck_Liver_Paella.jpg/500px-Spanish_pork_and_Grilled_Beef_with_Duck_Liver_Paella.jpg"},
  { name: "Fígado bovino frito com óleo", servingSize: 100, unit: "G", kcal: 217, protein: 26.5, carbs: 6, fat: 9, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Fried_cow_liver.jpg/500px-Fried_cow_liver.jpg"},
  { name: "Coração bovino grelhado", servingSize: 100, unit: "G", kcal: 179, protein: 28.5, carbs: 0.1, fat: 6.5, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Anticuchos_-_Grilled_Beef_Heart_skewers.jpg/500px-Anticuchos_-_Grilled_Beef_Heart_skewers.jpg"},

  // ───────────── Carnes: porco ─────────────
  { name: "Costela suína assada", servingSize: 100, unit: "G", kcal: 361, protein: 27, carbs: 0, fat: 27.8, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Balinese_Roasted_Pork_Ribs_-_Iga_Babi_Panggang_Bali.JPG/500px-Balinese_Roasted_Pork_Ribs_-_Iga_Babi_Panggang_Bali.JPG"},
  { name: "Pernil suíno assado", servingSize: 100, unit: "G", kcal: 232, protein: 30, carbs: 0, fat: 12, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Roasted_pork_leg_served_with_golden_potatoes_and_fresh_vegetables.jpg/500px-Roasted_pork_leg_served_with_golden_potatoes_and_fresh_vegetables.jpg"},
  { name: "Bisteca suína frita com óleo", servingSize: 100, unit: "G", kcal: 290, protein: 28, carbs: 0, fat: 19.5, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Salt_and_Pepper_Pork_Chop_with_Rice_-_CK_Bistro.jpg/500px-Salt_and_Pepper_Pork_Chop_with_Rice_-_CK_Bistro.jpg"},
  { name: "Lombo suíno grelhado sem gordura", servingSize: 100, unit: "G", kcal: 195, protein: 32, carbs: 0, fat: 6.8, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Pork_shoulder_loin_grilled_with_ginger_set_meal_of_Matsuya.jpg/500px-Pork_shoulder_loin_grilled_with_ginger_set_meal_of_Matsuya.jpg"},
  { name: "Panceta suína frita", servingSize: 100, unit: "G", kcal: 518, protein: 9.3, carbs: 0, fat: 53, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Lechon_Kawali.jpg/500px-Lechon_Kawali.jpg"},
  { name: "Linguiça suína grelhada", servingSize: 100, unit: "G", kcal: 296, protein: 19, carbs: 1.5, fat: 24, sourceName: "TACO", sourceUrl: TACO_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Sai_ua.JPG/500px-Sai_ua.JPG"},
  { name: "Fígado suíno grelhado", servingSize: 100, unit: "G", kcal: 165, protein: 26, carbs: 3.8, fat: 4.4, sourceName: "USDA", sourceUrl: USDA_URL, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Spanish_pork_and_Grilled_Beef_with_Duck_Liver_Paella.jpg/500px-Spanish_pork_and_Grilled_Beef_with_Duck_Liver_Paella.jpg"},
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
