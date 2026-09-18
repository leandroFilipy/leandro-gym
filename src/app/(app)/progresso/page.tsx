import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Ruler, Scale, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarCard } from "@/components/charts/BarCard";
import { LineCard } from "@/components/charts/LineCard";
import { Card, CardHeader, EmptyState, Stat } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { fmtDayMonth, fmtInt } from "@/lib/format";
import { MUSCLE_LABEL } from "@/lib/labels";
import { requireUserId } from "@/server/session";
import { getProgress, parseRange, RANGES } from "@/server/services/stats";
import { getReadinessInsight, getWeeklyMuscleVolume } from "@/server/services/insights";
import { MuscleVolumeCard } from "@/features/workout/insights/MuscleVolumeCard";
import { ReadinessCard } from "@/features/workout/insights/ReadinessCard";
import { TrainingHeatmapCard } from "@/features/workout/insights/TrainingHeatmapCard";
import { getTrainingHeatmap } from "@/server/services/training-heatmap";

export const metadata: Metadata = { title: "Progresso" };

const LINKS = [
  { href: "/progresso/peso", label: "Peso", icon: Scale },
  { href: "/progresso/corpo", label: "Corpo", icon: Ruler },
  { href: "/progresso/recordes", label: "Recordes", icon: Trophy },
  { href: "/progresso/relatorio", label: "Relatório", icon: FileText },
];

export default async function ProgressPage({ searchParams }: PageProps<"/progresso">) {
  const userId = await requireUserId();
  const range = parseRange((await searchParams).r);
  const [p, muscleVolume, readiness, heatmap] = await Promise.all([
    getProgress(userId, range),
    getWeeklyMuscleVolume(userId),
    getReadinessInsight(userId),
    getTrainingHeatmap(userId),
  ]);
  const s = p.stats;
  const hasData = p.sessionSeries.length + p.weightSeries.length + p.nutritionSeries.length > 0;

  return (
    <>
      <PageHeader title="Progresso" />
      <div className="flex flex-col gap-4">
        <nav className="grid grid-cols-4 gap-2">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface py-2.5 text-xs text-muted hover:text-fg sm:flex-row sm:gap-2 sm:py-3 sm:text-sm">
              <Icon className="size-4 text-accent" /> {label}
            </Link>
          ))}
        </nav>

        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
          {Object.entries(RANGES).map(([key, r]) => (
            <Link
              key={key}
              href={`/progresso?r=${key}`}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", key === range ? "border-accent bg-accent/10 text-accent" : "border-line text-muted")}
            >
              {r.label}
            </Link>
          ))}
        </div>

        <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Treinos no mês" value={s.monthCount} />
          <Stat label="Treinos totais" value={s.totalCount} />
          <Stat label="Consistência" value={s.consistency !== null ? `${s.consistency}%` : "—"} sub="feitos / planejados" />
          <Stat label="PRs no período" value={s.prCount} />
          <Stat label="Treinos no período" value={s.rangeCount} />
          <Stat label="Séries" value={fmtInt(s.setCount)} />
          <Stat label="Volume semanal" value={`${fmtInt(s.avgWeeklyVolume)}`} sub="kg (média)" />
        </Card>

        <TrainingHeatmapCard data={heatmap} />
        <MuscleVolumeCard rows={muscleVolume.rows} hasPlan={muscleVolume.hasPlan} />
        <ReadinessCard insight={readiness} />

        {!hasData ? (
          <EmptyState title="Sem dados no período" text="Registre treinos, peso e dieta para ver os gráficos." />
        ) : (
          <>
            {p.weightSeries.length >= 2 && (
              <LineCard
                title="Peso"
                data={p.weightSeries.map((w) => ({ ...w, date: fmtDayMonth(w.date) }))}
                xKey="date"
                unit=" kg"
                series={[
                  { key: "peso", label: "Peso", color: "var(--color-faint)" },
                  { key: "media", label: "Média 7 dias" },
                ]}
              />
            )}
            {p.sessionSeries.length >= 2 && (
              <LineCard title="Volume por treino" data={p.sessionSeries.map((x) => ({ ...x, date: fmtDayMonth(x.date) }))} xKey="date" unit=" kg" series={[{ key: "volume", label: "Volume" }]} />
            )}
            {p.weekly.length >= 2 && (
              <BarCard title="Frequência semanal" data={p.weekly.map((w) => ({ semana: fmtDayMonth(w.week), treinos: w.treinos }))} xKey="semana" yKey="treinos" label="Treinos" />
            )}
            {p.nutritionSeries.length >= 2 && (
              <>
                <LineCard title="Calorias" data={p.nutritionSeries.map((n) => ({ ...n, date: fmtDayMonth(n.date) }))} xKey="date" unit=" kcal" series={[{ key: "kcal", label: "Calorias" }]} />
                <LineCard title="Proteína" data={p.nutritionSeries.map((n) => ({ ...n, date: fmtDayMonth(n.date) }))} xKey="date" unit=" g" series={[{ key: "proteina", label: "Proteína" }]} />
              </>
            )}

            {s.muscles.length > 0 && (
              <Card>
                <CardHeader title="Séries por grupo muscular" />
                <ul className="flex flex-col gap-2">
                  {s.muscles.map((m) => (
                    <li key={m.group} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 text-muted">{MUSCLE_LABEL[m.group]}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(m.sets / s.muscles[0].sets) * 100}%` }} />
                      </span>
                      <span className="tabular w-8 text-right">{m.sets}</span>
                    </li>
                  ))}
                </ul>
                {s.muscles.length > 1 && (
                  <p className="mt-3 text-xs text-muted">
                    Mais treinado: <span className="text-fg">{MUSCLE_LABEL[s.muscles[0].group]}</span> · Menos treinado:{" "}
                    <span className="text-fg">{MUSCLE_LABEL[s.muscles.at(-1)!.group]}</span>
                  </p>
                )}
              </Card>
            )}
            <p className="text-center text-xs text-muted">
              Carga por exercício: abra o exercício em <Link href="/treino/exercicios" className="text-accent">Treino → Exercícios</Link>.
            </p>
          </>
        )}
      </div>
    </>
  );
}
