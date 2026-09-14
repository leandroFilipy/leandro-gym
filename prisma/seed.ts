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

type FoodSeed = {
  name: string;
  servingSize: number;
  unit: FoodUnit;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sourceName: "TACO" | "TBCA" | "Growth";
  sourceUrl: string;
};

// TACO/TBCA: valores por 100 g de parte comestível, salvo quando a porção é indicada.
// Whey: porção e macros do rótulo oficial do WPC 80% natural consultado em 11/09/2026.
const FOODS: FoodSeed[] = [
  { name: "Arroz branco cozido", servingSize: 100, unit: "G", kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Arroz integral cozido", servingSize: 100, unit: "G", kcal: 124, protein: 2.6, carbs: 25.8, fat: 1, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Feijão carioca cozido", servingSize: 100, unit: "G", kcal: 71, protein: 4.77, carbs: 15.3, fat: 0.53, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Feijão preto cozido", servingSize: 100, unit: "G", kcal: 77, protein: 4.5, carbs: 14, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Feijão branco cozido", servingSize: 100, unit: "G", kcal: 129, protein: 8.7, carbs: 25.1, fat: 0.5, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Ovo de galinha cozido", servingSize: 1, unit: "UNIT", kcal: 73, protein: 6.65, carbs: 0.3, fat: 4.75, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Ovo de galinha frito", servingSize: 100, unit: "G", kcal: 240, protein: 15.6, carbs: 1.2, fat: 18.6, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Clara de ovo cozida", servingSize: 1, unit: "UNIT", kcal: 18, protein: 4.02, carbs: 0, fat: 0.03, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Peito de frango grelhado", servingSize: 100, unit: "G", kcal: 159, protein: 32, carbs: 0, fat: 2.5, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Coxa de frango sem pele cozida", servingSize: 100, unit: "G", kcal: 167, protein: 26.9, carbs: 0, fat: 5.8, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Filé de frango à milanesa", servingSize: 100, unit: "G", kcal: 221, protein: 28.5, carbs: 7.5, fat: 7.8, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Patinho sem gordura grelhado", servingSize: 100, unit: "G", kcal: 219, protein: 35.9, carbs: 0, fat: 7.3, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Carne moída (acém) refogada", servingSize: 100, unit: "G", kcal: 216, protein: 26.7, carbs: 0.9, fat: 11.7, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Músculo bovino refogado na panela", servingSize: 100, unit: "G", kcal: 196, protein: 27.6, carbs: 0.75, fat: 9.21, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Alcatra sem gordura grelhada", servingSize: 100, unit: "G", kcal: 241, protein: 31.9, carbs: 0, fat: 11.6, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Contrafilé com gordura grelhado", servingSize: 100, unit: "G", kcal: 278, protein: 32.4, carbs: 0, fat: 15.5, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Contrafilé sem gordura grelhado", servingSize: 100, unit: "G", kcal: 194, protein: 35.9, carbs: 0, fat: 4.5, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Coxão mole sem gordura cozido", servingSize: 100, unit: "G", kcal: 219, protein: 32.4, carbs: 0, fat: 8.9, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Coxão duro sem gordura cozido", servingSize: 100, unit: "G", kcal: 217, protein: 31.9, carbs: 0, fat: 8.9, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Maminha grelhada", servingSize: 100, unit: "G", kcal: 153, protein: 30.7, carbs: 0, fat: 2.4, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Picanha com gordura grelhada", servingSize: 100, unit: "G", kcal: 289, protein: 26.4, carbs: 0, fat: 19.5, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Picanha sem gordura grelhada", servingSize: 100, unit: "G", kcal: 238, protein: 31.9, carbs: 0, fat: 11.3, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Costela bovina assada", servingSize: 100, unit: "G", kcal: 373, protein: 28.8, carbs: 0, fat: 27.7, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Lombo suíno assado", servingSize: 100, unit: "G", kcal: 210, protein: 35.7, carbs: 0, fat: 6.4, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Bisteca suína grelhada", servingSize: 100, unit: "G", kcal: 247, protein: 28.9, carbs: 0, fat: 14.6, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Tilápia grelhada", servingSize: 100, unit: "G", kcal: 128, protein: 26, carbs: 0, fat: 2.7, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Atum em lata em água", servingSize: 100, unit: "G", kcal: 116, protein: 26, carbs: 0, fat: 1, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Macarrão cozido sem óleo", servingSize: 100, unit: "G", kcal: 101, protein: 3.73, carbs: 21, fat: 0.48, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Macarrão integral cozido", servingSize: 100, unit: "G", kcal: 123, protein: 4.89, carbs: 26.3, fat: 0.56, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Macarrão com ovos cozido", servingSize: 100, unit: "G", kcal: 166, protein: 4.73, carbs: 35.2, fat: 0.9, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Banana prata", servingSize: 100, unit: "G", kcal: 98, protein: 1.3, carbs: 26, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Banana nanica", servingSize: 100, unit: "G", kcal: 92, protein: 1.4, carbs: 23.8, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Banana da terra", servingSize: 100, unit: "G", kcal: 128, protein: 1.4, carbs: 33.7, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Leite integral", servingSize: 200, unit: "ML", kcal: 122, protein: 6.4, carbs: 9.4, fat: 6.6, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Leite semidesnatado", servingSize: 200, unit: "ML", kcal: 92, protein: 6.4, carbs: 9.6, fat: 3.2, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Leite desnatado", servingSize: 200, unit: "ML", kcal: 70, protein: 6.8, carbs: 9.8, fat: 0.4, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Leite integral sem lactose", servingSize: 200, unit: "ML", kcal: 120, protein: 6.2, carbs: 9.4, fat: 6.4, sourceName: "TBCA", sourceUrl: TBCA_URL },
  { name: "Aveia em flocos", servingSize: 30, unit: "G", kcal: 118, protein: 4.17, carbs: 19.98, fat: 2.55, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Whey Growth concentrado 80% natural", servingSize: 30, unit: "G", kcal: 122, protein: 23, carbs: 2.8, fat: 2.1, sourceName: "Growth", sourceUrl: GROWTH_URL },
  { name: "Pão francês", servingSize: 50, unit: "G", kcal: 150, protein: 4, carbs: 29.3, fat: 1.55, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Pão de forma integral", servingSize: 50, unit: "G", kcal: 127, protein: 4.7, carbs: 25, fat: 1.85, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Iogurte natural", servingSize: 170, unit: "G", kcal: 87, protein: 7, carbs: 3.2, fat: 5.1, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Batata-doce cozida", servingSize: 100, unit: "G", kcal: 77, protein: 0.6, carbs: 18.4, fat: 0.1, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Batata inglesa cozida", servingSize: 100, unit: "G", kcal: 52, protein: 1.2, carbs: 11.9, fat: 0, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Mandioca cozida", servingSize: 100, unit: "G", kcal: 125, protein: 0.6, carbs: 30.1, fat: 0.3, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Brócolis cozido", servingSize: 100, unit: "G", kcal: 25, protein: 2.1, carbs: 4.4, fat: 0.5, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Tomate cru", servingSize: 100, unit: "G", kcal: 15, protein: 1.1, carbs: 3.1, fat: 0.2, sourceName: "TACO", sourceUrl: TACO_URL },
  { name: "Azeite de oliva extravirgem", servingSize: 10, unit: "ML", kcal: 88, protein: 0, carbs: 0, fat: 10, sourceName: "TACO", sourceUrl: TACO_URL },
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
