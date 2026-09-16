import Link from "next/link";
import { TrendingDown, TriangleAlert } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import type { StagnationResult } from "@/lib/domain/stagnation";
import { MUSCLE_LABEL } from "@/lib/labels";
import type { StagnationAlert } from "@/server/services/insights";

/** Home: exercícios em platô, com a primeira sugestão. */
export function StagnationCard({ alerts, limit = 3 }: { alerts: StagnationAlert[]; limit?: number }) {
  if (alerts.length === 0) return null;
  return (
    <Card className="border-warn/40">
      <CardHeader title="Platô detectado" action={<Badge tone="warn">{alerts.length}</Badge>} />
      <ul className="flex flex-col divide-y divide-line">
        {alerts.slice(0, limit).map((a) => (
          <li key={a.exerciseId}>
            <Link href={`/treino/exercicios/${a.exerciseId}`} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              {a.status === "regressing" ? (
                <TrendingDown className="mt-0.5 size-4 shrink-0 text-danger" />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{a.name}</span>
                  <span className="shrink-0 text-xs text-faint">{MUSCLE_LABEL[a.muscleGroup]}</span>
                </span>
                <span className="block text-sm text-muted">{a.message}</span>
                {a.tips[0] && <span className="block text-xs text-accent">→ {a.tips[0].title}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {alerts.length > limit && <p className="mt-2 text-xs text-faint">+{alerts.length - limit} exercício(s) — veja cada um em Treino → Exercícios.</p>}
    </Card>
  );
}

/** Histórico do exercício: diagnóstico completo com todas as sugestões. */
export function StagnationDetail({ result }: { result: StagnationResult }) {
  if (result.status !== "stalled" && result.status !== "regressing") return null;
  const regressing = result.status === "regressing";
  return (
    <Card className={regressing ? "border-danger/40" : "border-warn/40"}>
      <CardHeader title={regressing ? "Força em queda" : "Platô"} action={<Badge tone={regressing ? "danger" : "warn"}>{result.sessionsSinceImprovement} treinos</Badge>} />
      <p className="text-sm text-muted">{result.message} O melhor 1RM estimado foi {fmt(result.bestE1RM)}kg; o último, {fmt(result.lastE1RM)}kg.</p>
      <ol className="mt-3 flex flex-col gap-2">
        {result.tips.map((t, i) => (
          <li key={t.kind} className="rounded-md border border-line bg-surface-2 p-3">
            <div className="font-display text-sm font-bold uppercase tracking-wide">
              <span className="text-accent">{i + 1}.</span> {t.title}
            </div>
            <p className="mt-0.5 text-sm text-muted">{t.text}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
