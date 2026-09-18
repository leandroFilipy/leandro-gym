import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { WaterCard } from "@/features/diet/WaterCard";
import { cn } from "@/lib/cn";
import { isoWeekday, todayIn } from "@/lib/dates";
import { fmtDayMonth, WEEKDAY_SHORT } from "@/lib/format";
import { getSettings, requireUserId } from "@/server/session";
import { getWaterDay, getWaterHistory } from "@/server/services/water";

export const metadata: Metadata = { title: "Água" };

const fmtL = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

/** Tela rápida de água (atalho do ícone do app: segurar o ícone → "Beber água"). */
export default async function WaterPage() {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const [water, history] = await Promise.all([getWaterDay(userId, today), getWaterHistory(userId, today)]);

  return (
    <>
      <PageHeader title="Água" back="/" />
      <div className="flex flex-col gap-4">
        <WaterCard date={today} ml={water.ml} goalMl={water.goalMl} auto={water.auto} />
        <Card>
          <CardHeader title="Últimos 7 dias" />
          <ul className="flex flex-col gap-1.5">
            {history.map((d) => {
              const pct = Math.min(100, Math.round((d.ml / water.goalMl) * 100));
              return (
                <li key={d.date} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 text-muted">
                    {WEEKDAY_SHORT[isoWeekday(d.date)].toLowerCase()} {fmtDayMonth(d.date)}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className={cn("block h-full rounded-full", pct >= 100 ? "bg-success" : "bg-sky-400/70")} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="tabular w-12 shrink-0 text-right">{d.ml ? fmtL(d.ml) : "—"}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
