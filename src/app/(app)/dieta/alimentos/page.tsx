import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { FoodTable } from "@/features/diet/FoodTable";
import { requireUserId } from "@/server/session";
import { listFoods } from "@/server/services/nutrition";

export const metadata: Metadata = { title: "Alimentos" };

export default async function FoodsPage() {
  const userId = await requireUserId();
  const foods = await listFoods(userId);
  return (
    <>
      <PageHeader title="Alimentos" subtitle="Base pesquisada + seus alimentos personalizados" back="/dieta" />
      <FoodTable
        foods={foods.map((f) => ({
          id: f.id, name: f.name, servingSize: f.servingSize, unit: f.unit,
          kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
          imageUrl: f.imageUrl, sourceName: f.sourceName, mine: f.userId !== null,
        }))}
      />
    </>
  );
}
