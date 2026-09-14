import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { DietDiary } from "@/features/diet/DietDiary";
import { EnergyCard } from "@/features/diet/EnergyCard";
import { GoalBars } from "@/features/diet/GoalBars";
import { addDays, isValidDateStr, todayIn } from "@/lib/dates";
import { energyBalance } from "@/lib/domain/energy";
import { fmtFullDate } from "@/lib/format";
import { getSettings, requireUserId } from "@/server/session";
import { getDiary, getIntakeSeries, listFavorites, listFoods, listFrequentFoods } from "@/server/services/nutrition";

export const metadata: Metadata = { title: "Dieta" };

export default async function DietPage({ searchParams }: PageProps<"/dieta">) {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const { d } = await searchParams;
  const date = typeof d === "string" && isValidDateStr(d) ? d : today;

  const [diary, foods, frequent, favorites, intakes] = await Promise.all([
    getDiary(userId, date),
    listFoods(userId),
    listFrequentFoods(userId),
    listFavorites(userId),
    // últimos 7 dias completos (hoje ainda está incompleto)
    getIntakeSeries(userId, addDays(today, -1), 7),
  ]);

  const label = date === today ? "Hoje" : date === addDays(today, -1) ? "Ontem" : fmtFullDate(date);

  return (
    <>
      <PageHeader
        title="Dieta"
        action={
          <div className="flex items-center gap-1">
            <Link href={`/dieta?d=${addDays(date, -1)}`} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Dia anterior">
              <ChevronLeft className="size-5" />
            </Link>
            <span className="min-w-20 text-center text-sm font-semibold">{label}</span>
            {date < today ? (
              <Link href={`/dieta?d=${addDays(date, 1)}`} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Próximo dia">
                <ChevronRight className="size-5" />
              </Link>
            ) : (
              <span className="w-9" />
            )}
          </div>
        }
      />
      <div className="flex flex-col gap-4">
        <Card>
          <GoalBars totals={diary.totals} goal={diary.goal} />
        </Card>

        <DietDiary
          date={date}
          meals={diary.meals}
          foods={foods.map((f) => ({
            id: f.id, name: f.name, servingSize: f.servingSize, unit: f.unit,
            kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
            imageUrl: f.imageUrl, sourceName: f.sourceName, mine: f.userId !== null,
          }))}
          frequentIds={frequent.map((f) => f.id)}
          favorites={favorites}
        />

        <EnergyCard tdee={settings.tdeeKcal} balance={energyBalance(settings.tdeeKcal, intakes)} />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/dieta/alimentos" className="rounded-2xl border border-line bg-surface p-3 text-center text-muted hover:text-fg">
            Tabela de alimentos
          </Link>
          <Link href="/dieta/favoritas" className="rounded-2xl border border-line bg-surface p-3 text-center text-muted hover:text-fg">
            Refeições favoritas
          </Link>
        </div>
      </div>
    </>
  );
}
