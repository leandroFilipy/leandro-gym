import type { FoodUnit, MealType } from "@/generated/prisma/enums";
import type { Macros } from "@/lib/domain/types";

export interface FoodOption extends Macros {
  id: string;
  name: string;
  servingSize: number;
  unit: FoodUnit;
  imageUrl: string | null;
  sourceName: string | null;
  barcode: string | null;
  mine: boolean;
}

export interface FavoriteOption {
  id: string;
  name: string;
  items: { id: string; name: string; unit: FoodUnit; quantity: number }[];
  totals: Macros;
}

export interface DiaryItem extends Macros {
  id: string;
  name: string;
  unit: FoodUnit;
  quantity: number;
}

export interface DiaryMeal {
  type: MealType;
  mealId: string | null;
  /** Mesma refeição no dia anterior (para "repetir de ontem"). */
  previous: { count: number; kcal: number; names: string[] } | null;
  items: DiaryItem[];
  totals: Macros;
}
