import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, EmptyState } from "@/components/ui/Card";
import { totalVolume } from "@/lib/domain/volume";
import { fromDbDate } from "@/lib/dates";
import { fmtFullDate, fmtInt } from "@/lib/format";
import { requireUserId } from "@/server/session";
import { listSessions } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Histórico de treinos" };

export default async function HistoryPage() {
  const userId = await requireUserId();
  const sessions = await listSessions(userId, 60);

  return (
    <>
      <PageHeader title="Histórico" back="/treino" />
      {sessions.length === 0 ? (
        <EmptyState title="Nenhum treino registrado" text="Seus treinos aparecem aqui depois de concluídos." />
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const sets = s.exercises.flatMap((e) => e.sets);
            return (
              <li key={s.id}>
                <Link href={s.finishedAt ? `/treino/sessao/${s.id}/resumo` : `/treino/sessao/${s.id}`}>
                  <Card className="flex items-center gap-3 py-3 hover:border-faint">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{s.name}</span>
                        {!s.finishedAt && <Badge tone="warn">Em andamento</Badge>}
                      </div>
                      <div className="text-xs text-muted">
                        {fmtFullDate(fromDbDate(s.date))} · {s.exercises.length} exercícios · {sets.length} séries · {fmtInt(totalVolume(sets))} kg
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-faint" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
