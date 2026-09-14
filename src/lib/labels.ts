import type { DayType, FoodUnit, MealType, MuscleGroup } from "@/generated/prisma/enums";

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  CHEST: "Peito",
  BACK: "Costas",
  SHOULDERS: "Ombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  FOREARMS: "Antebraço",
  QUADS: "Quadríceps",
  HAMSTRINGS: "Posterior",
  GLUTES: "Glúteos",
  CALVES: "Panturrilha",
  ABS: "Abdômen",
  FULL_BODY: "Corpo todo",
  CARDIO: "Cardio",
  OTHER: "Outro",
};

export const MUSCLE_GROUPS = Object.keys(MUSCLE_LABEL) as MuscleGroup[];

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  WORKOUT: "Treino",
  REST: "Descanso",
  CARDIO: "Cardio",
};

export const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "Café da manhã",
  MORNING_SNACK: "Lanche da manhã",
  LUNCH: "Almoço",
  AFTERNOON_SNACK: "Lanche da tarde",
  PRE_WORKOUT: "Pré-treino",
  POST_WORKOUT: "Pós-treino",
  DINNER: "Jantar",
  SUPPER: "Ceia",
};

export const MEAL_TYPES = Object.keys(MEAL_LABEL) as MealType[];

export const UNIT_LABEL: Record<FoodUnit, string> = {
  G: "g",
  KG: "kg",
  ML: "ml",
  L: "L",
  UNIT: "un",
  PORTION: "porção",
};
