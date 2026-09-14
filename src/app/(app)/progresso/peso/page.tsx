import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LineCard } from "@/components/charts/LineCard";
import { Card, CardHeader, EmptyState, Stat } from "@/components/ui/Card";
import { DeleteWeightButton } from "@/features/body/DeleteWeightButton";
import { WeightChangeText } from "@/features/body/WeightChangeText";
import { WeightQuickForm } from "@/features/body/WeightQuickForm";
import { AdaptiveTdeeCard } from "@/features/body/AdaptiveTdeeCard";
import { fmtDayMonth, fmt1 } from "@/lib/format";
import { todayIn } from "@/lib/dates";
import { getSettings, requireUserId } from "@/server/session";
import { getAdaptiveTdee, getWeightSummary } from "@/server/services/body";

export const metadata: Metadata = { title: "Peso corporal" };

export default async function WeightPage() {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const w = await getWeightSummary(userId, today);
  const adaptiveTdee = await getAdaptiveTdee(userId, today);
  const chartData = w.chart.map((c) => ({ ...c, date: fmtDayMonth(c.date) }));

  return (
    <>
      <PageHeader title="Peso corporal" back="/progresso" />
      <div className="flex flex-col gap-4">
        <Card>
          <WeightQuickForm date={today} defaultWeight={w.todayEntry?.value ?? w.latest?.value ?? 70} alreadyLogged={Boolean(w.todayEntry)} />
        </Card>

        <Card className="grid grid-cols-3 gap-3">
          <Stat label="Semana anterior" value={w.comparison.previousAvg !== null ? fmt1(w.comparison.previousAvg) : "—"} sub="média kg" />
          <Stat label="Semana atual" value={w.comparison.currentAvg !== null ? fmt1(w.comparison.currentAvg) : "—"} sub="média kg" />
          <Stat label="Variação" value={<WeightChangeText change={w.comparison.change} />} />
        </Card>
        <p className="-mt-2 text-xs text-muted">
          Compare médias, não dias isolados: o peso varia 1–2 kg de um dia para o outro (água, sal, intestino).
        </p>

        <AdaptiveTdeeCard tdee={adaptiveTdee} />

        {chartData.length >= 2 && (
          <LineCard
            title="Peso · últimos 60 dias"
            data={chartData}
            xKey="date"
            unit=" kg"
            series={[
              { key: "peso", label: "Peso", color: "var(--color-faint)" },
              { key: "media", label: "Média 7 dias" },
            ]}
          />
        )}

        <Card>
          <CardHeader title="Registros recentes" />
          {w.recent.length === 0 ? (
            <EmptyState title="Nenhum registro" text="Pese-se de manhã, em jejum, para ter dados consistentes." />
          ) : (
            <ul className="divide-y divide-line">
              {w.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span className="text-muted">{fmtDayMonth(r.date)}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-semibold">{fmt1(r.value)} kg</span>
                    <DeleteWeightButton id={r.id} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
