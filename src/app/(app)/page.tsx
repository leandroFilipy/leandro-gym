import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { WeightChangeText } from "@/features/body/WeightChangeText";
import { WeightQuickForm } from "@/features/body/WeightQuickForm";
import { GoalBars } from "@/features/diet/GoalBars";
import { fmtSet } from "@/features/workout/format";
import { TodayWorkoutCard } from "@/features/workout/TodayWorkoutCard";
import { fmtDayMonth, fmtInt, fmt1, WEEKDAY_LONG } from "@/lib/format";
import { requireUserId } from "@/server/session";
import { getDashboard } from "@/server/services/dashboard";

export default async function HomePage() {
  const userId = await requireUserId();
  const d = await getDashboard(userId);
  const w = d.weight;

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2">
        <p className="eyebrow">
          {WEEKDAY_LONG[d.todayInfo.weekday]} · {fmtDayMonth(d.today)}
        </p>
        <h1 className="mt-1 text-4xl font-extrabold uppercase italic leading-none">
          {d.greeting}
          {d.firstName ? `, ${d.firstName}` : ""}
        </h1>
      </header>

      <TodayWorkoutCard today={d.todayInfo} showExercises />

      <div className="grid grid-cols-2 gap-3">
        <Link href="/progresso/peso">
          <Card className="h-full hover:border-faint">
            <Stat
              label="Peso"
              value={w.latest ? `${fmt1(w.latest.value)} kg` : "—"}
              sub={
                <>
                  Semana: <WeightChangeText change={w.comparison.change} />
                </>
              }
            />
          </Card>
        </Link>
        <Link href="/treino">
          <Card className="h-full hover:border-faint">
            <Stat label="Treinos na semana" value={`${d.week.done} / ${d.week.planned}`} sub={d.todayInfo.nextDay ? `Próximo: ${d.todayInfo.nextDay.day.name}` : undefined} />
          </Card>
        </Link>
      </div>

      <Link href="/dieta">
        <Card className="hover:border-faint">
          <CardHeader title="Dieta de hoje" />
          <GoalBars totals={d.totals} goal={d.goal} compact />
        </Card>
      </Link>

      {!w.todayEntry && (
        <Card>
          <CardHeader title="Registrar peso" />
          <WeightQuickForm date={d.today} defaultWeight={w.latest?.value ?? 70} compact />
        </Card>
      )}

      {d.lastSession && (
        <Link href={`/treino/sessao/${d.lastSession.id}/resumo`}>
          <Card className="hover:border-faint">
            <CardHeader title="Último treino" />
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xl font-bold uppercase italic">{d.lastSession.name}</span>
              <span className="text-sm text-muted">{fmtDayMonth(d.lastSession.date)}</span>
            </div>
            <div className="tabular text-sm text-muted">
              {d.lastSession.setCount} séries · {fmtInt(d.lastSession.volume)} kg de volume
            </div>
          </Card>
        </Link>
      )}

      {d.records.length > 0 && (
        <Card>
          <CardHeader title="Recordes recentes" href="/progresso/recordes" />
          <ul className="flex flex-col gap-1.5">
            {d.records.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Trophy className="size-4 text-accent" /> {r.exercise.name}
                </span>
                <span className="tabular font-semibold">{fmtSet(r)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
