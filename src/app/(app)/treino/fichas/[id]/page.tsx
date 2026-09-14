import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { PlanActions } from "@/features/workout/plans/PlanActions";
import { cn } from "@/lib/cn";
import { WEEKDAY_LONG } from "@/lib/format";
import { DAY_TYPE_LABEL } from "@/lib/labels";
import { requireUserId } from "@/server/session";
import { getPlan } from "@/server/services/workouts";

export const metadata: Metadata = { title: "Ficha" };

export default async function PlanPage({ params }: PageProps<"/treino/fichas/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();
  const plan = await getPlan(userId, id);
  if (!plan) notFound();

  return (
    <>
      <PageHeader title={plan.name} back="/treino/fichas" action={plan.active ? <Badge tone="accent">Ativa</Badge> : undefined} />
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {plan.days.map((d) => (
            <li key={d.id}>
              <Link href={`/treino/fichas/dia/${d.id}`}>
                <Card className={cn("flex items-center gap-3 py-3 hover:border-faint", d.type === "REST" && "bg-surface/50")}>
                  <div className="w-20 shrink-0 text-sm font-semibold text-muted">{WEEKDAY_LONG[d.weekday]}</div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate font-semibold", d.type === "REST" && "text-faint")}>{d.name}</div>
                    {d.type !== "REST" && (
                      <div className="truncate text-xs text-muted">
                        {d.exercises.length ? d.exercises.map((e) => e.exercise.name).join(" · ") : DAY_TYPE_LABEL[d.type]}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-faint" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>

        <Card>
          <CardHeader title="Configurações da ficha" />
          <PlanActions planId={plan.id} name={plan.name} active={plan.active} />
        </Card>
      </div>
    </>
  );
}
