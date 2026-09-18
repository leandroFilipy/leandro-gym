import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { fmtSetsCompact, fmtSet } from "@/features/workout/format";
import { percentChange } from "@/lib/domain/volume";
import { fmtFullDate, fmtInt, fmtPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import { deleteSessionAction, reopenSessionAction } from "@/server/actions/sessions";
import { getSettings, requireUserId } from "@/server/session";
import { getSessionSummary } from "@/server/services/workouts";
import { pickMessage } from "@/lib/domain/patrao";

export const metadata: Metadata = { title: "Resumo do treino" };

const COMEBACK_DAYS = 7;

export default async function SummaryPage({ params }: PageProps<"/treino/sessao/[id]/resumo">) {
  const { id } = await params;
  const userId = await requireUserId();
  const s = await getSessionSummary(userId, id);
  if (!s) notFound();

  const change = s.previousVolume !== null ? percentChange(s.volume, s.previousVolume) : null;

  // Recado do patrão: quem sumiu 7+ dias leva "voltou"; senão, elogio (com o recorde, se houver).
  const { patraoTone } = await getSettings(userId);
  const record = s.records[0];
  const comeback = s.daysSincePrevious !== null && s.daysSincePrevious >= COMEBACK_DAYS;
  const patrao = s.finished
    ? pickMessage(
        comeback ? "comeback" : "praise",
        patraoTone,
        comeback
          ? { dias: String(s.daysSincePrevious) }
          : record
            ? { exercicio: record.exercise, carga: record.weight.toLocaleString("pt-BR") }
            : {},
        `${userId}:${s.id}`,
      )
    : null;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="text-center">
        <div className="text-5xl">{s.records.length ? "🔥" : "💪"}</div>
        <h1 className="mt-2 text-2xl font-bold">{s.finished ? "Treino concluído!" : "Treino em andamento"}</h1>
        <p className="text-sm text-muted">
          {s.name} · {fmtFullDate(s.date)}
          {s.durationMin !== null && ` · ${s.durationMin} min`}
        </p>
      </div>

      {patrao && (
        <Card className={cn("border-l-4", comeback ? "border-l-warn" : "border-l-accent")}>
          <div className="eyebrow mb-1">Recado do patrão</div>
          <p className="font-display text-lg font-bold italic leading-snug">{patrao}</p>
        </Card>
      )}

      <Card className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="tabular text-2xl font-bold">{s.setCount}</div>
          <div className="text-xs text-muted">séries</div>
        </div>
        <div>
          <div className="tabular text-2xl font-bold">{fmtInt(s.volume)}</div>
          <div className="text-xs text-muted">kg volume</div>
        </div>
        <div>
          <div className={cn("tabular flex items-center justify-center text-2xl font-bold", change !== null && (change >= 0 ? "text-success" : "text-danger"))}>
            {change === null ? "—" : (
              <>
                {change >= 0 ? <ArrowUpRight className="size-5" /> : <ArrowDownRight className="size-5" />}
                {fmtPercent(change)}
              </>
            )}
          </div>
          <div className="text-xs text-muted">vs anterior</div>
        </div>
      </Card>

      {s.previousVolume !== null && (
        <p className="-mt-2 text-center text-xs text-muted">
          Último treino: {fmtInt(s.previousVolume)} kg · Hoje: {fmtInt(s.volume)} kg
        </p>
      )}

      {s.records.length > 0 && (
        <Card className="border-warn/30">
          <CardHeader title="🔥 Novos recordes" />
          <ul className="flex flex-col gap-1">
            {s.records.map((r, i) => (
              <li key={i} className="flex justify-between">
                <span>{r.exercise}</span>
                <span className="tabular font-semibold">{fmtSet(r)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Exercícios" />
        <ul className="flex flex-col divide-y divide-line">
          {s.exercises.map((e) => (
            <li key={e.id} className="py-2">
              <Link href={`/treino/exercicios/${e.exerciseId}`} className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{e.name}</span>
                <span className="tabular text-xs text-muted">{fmtInt(e.volume)} kg</span>
              </Link>
              <div className="tabular text-sm text-muted">{e.sets.length ? fmtSetsCompact(e.sets) : "sem séries"}</div>
            </li>
          ))}
        </ul>
      </Card>

      <ButtonLink href="/" size="lg" block>
        Voltar ao início
      </ButtonLink>
      <div className="grid grid-cols-2 gap-2">
        <form action={reopenSessionAction.bind(null, s.id)}>
          <Button type="submit" variant="secondary" block>
            {s.finished ? "Reabrir treino" : "Continuar treino"}
          </Button>
        </form>
        <form action={deleteSessionAction.bind(null, s.id)}>
          <Button type="submit" variant="danger" block>
            Excluir
          </Button>
        </form>
      </div>
    </div>
  );
}
