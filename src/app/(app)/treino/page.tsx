import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Dumbbell, History, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { TodayWorkoutCard } from "@/features/workout/TodayWorkoutCard";
import { WeekCalendar } from "@/features/workout/WeekCalendar";
import { requireUserId } from "@/server/session";
import { getToday, getWeekCalendar } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Treino" };

const LINKS = [
  { href: "/treino/fichas", label: "Fichas", icon: ClipboardList },
  { href: "/treino/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/treino/historico", label: "Histórico", icon: History },
  { href: "/progresso/recordes", label: "Recordes", icon: Trophy },
];

export default async function TreinoPage() {
  const userId = await requireUserId();
  const [today, week] = await Promise.all([getToday(userId), getWeekCalendar(userId)]);

  return (
    <>
      <PageHeader title="Treino" subtitle={today.plan ? `Ficha: ${today.plan.name}` : undefined} />
      <div className="flex flex-col gap-4">
        <TodayWorkoutCard today={today} showExercises />

        <nav className="grid grid-cols-4 gap-2">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface py-3 text-xs text-muted hover:text-fg">
              <Icon className="size-5 text-accent" />
              {label}
            </Link>
          ))}
        </nav>

        {today.plan && (
          <Card>
            <CardHeader title={`Semana · ${week.done}/${week.planned} treinos`} />
            <WeekCalendar days={week.days} />
          </Card>
        )}
      </div>
    </>
  );
}
