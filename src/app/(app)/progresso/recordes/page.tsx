import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { fmtSet } from "@/features/workout/format";
import { fromDbDate } from "@/lib/dates";
import { fmtDayMonth, fmt1 } from "@/lib/format";
import { requireUserId } from "@/server/session";
import { listBestPerExercise, listRecentRecords } from "@/server/services/records";

export const metadata: Metadata = { title: "Recordes" };

export default async function RecordsPage() {
  const userId = await requireUserId();
  const [best, recent] = await Promise.all([listBestPerExercise(userId), listRecentRecords(userId, 10)]);

  return (
    <>
      <PageHeader title="Recordes" subtitle="Melhor série = maior 1RM estimado (Epley)" back="/progresso" />
      <div className="flex flex-col gap-4">
        {recent.length > 0 && (
          <Card>
            <CardHeader title="🔥 Recentes" />
            <ul className="flex flex-col gap-1.5 text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>
                    {r.exercise.name} <span className="text-faint">· {r.achievedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  </span>
                  <span className="tabular font-semibold">{fmtSet(r)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {best.length === 0 ? (
          <EmptyState title="Nenhum recorde ainda" text="Complete treinos para ver suas melhores séries." />
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {best.map((b) => (
                <li key={b.exerciseId}>
                  <Link href={`/treino/exercicios/${b.exerciseId}`} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{b.name}</span>
                      <span className="text-xs text-muted">
                        {fmtDayMonth(fromDbDate(b.date))} · 1RM est. {fmt1(b.e1rm)} kg
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-lg font-bold">{fmtSet(b)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
