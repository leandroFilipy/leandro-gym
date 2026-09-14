import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, EmptyState } from "@/components/ui/Card";
import { CreatePlanForm } from "@/features/workout/plans/CreatePlanForm";
import { WEEKDAY_SHORT } from "@/lib/format";
import { requireUserId } from "@/server/session";
import { listPlans } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Fichas" };

export default async function PlansPage() {
  const userId = await requireUserId();
  const plans = await listPlans(userId);

  return (
    <>
      <PageHeader title="Fichas" back="/treino" />
      <div className="flex flex-col gap-3">
        <CreatePlanForm />
        {plans.length === 0 ? (
          <EmptyState title="Nenhuma ficha ainda" text="Crie uma ficha e defina o treino de cada dia da semana." />
        ) : (
          plans.map((p) => (
            <Link key={p.id} href={`/treino/fichas/${p.id}`}>
              <Card className="flex items-center gap-3 hover:border-faint">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{p.name}</span>
                    {p.active && <Badge tone="accent">Ativa</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted">
                    {p.days
                      .filter((d) => d.type !== "REST")
                      .map((d) => (
                        <span key={d.id} className="rounded bg-surface-2 px-1.5 py-0.5">
                          {WEEKDAY_SHORT[d.weekday]} · {d.name}
                        </span>
                      ))}
                  </div>
                </div>
                <ChevronRight className="size-5 text-faint" />
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
