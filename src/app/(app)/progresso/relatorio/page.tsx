import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { fmtSet } from "@/features/workout/format";
import { cn } from "@/lib/cn";
import { fmtDayMonth, fmtInt, fmtPercent, fmt1 } from "@/lib/format";
import { requireUserId } from "@/server/session";
import { getWeeklyReport } from "@/server/services/reports";

export const metadata: Metadata = { title: "Relatório semanal" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <span className="text-muted">{label}</span>
      <span className="tabular text-right font-semibold">{children}</span>
    </div>
  );
}

export default async function ReportPage({ searchParams }: PageProps<"/progresso/relatorio">) {
  const userId = await requireUserId();
  const raw = Number((await searchParams).w ?? 0);
  const offset = Number.isInteger(raw) && raw <= 0 && raw > -520 ? raw : 0;
  const { report: r, isCurrent } = await getWeeklyReport(userId, offset);

  return (
    <>
      <PageHeader title="Resumo da semana" back="/progresso" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href={`/progresso/relatorio?w=${offset - 1}`} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Semana anterior">
            <ChevronLeft className="size-5" />
          </Link>
          <span className="text-sm font-semibold">
            {fmtDayMonth(r.weekStart)} – {fmtDayMonth(r.weekEnd)} {isCurrent && <span className="text-muted">(em andamento)</span>}
          </span>
          {offset < 0 ? (
            <Link href={`/progresso/relatorio?w=${offset + 1}`} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Próxima semana">
              <ChevronRight className="size-5" />
            </Link>
          ) : (
            <span className="w-9" />
          )}
        </div>

        <Card>
          <div className="divide-y divide-line">
            <Row label="Treinos">
              {r.workoutsDone} / {r.workoutsPlanned} realizados
            </Row>
            <Row label="Volume">
              {fmtInt(r.volume)} kg
              {r.volumeChangePct !== null && (
                <span className={cn("ml-2 text-sm", r.volumeChangePct >= 0 ? "text-success" : "text-danger")}>{fmtPercent(r.volumeChangePct)}</span>
              )}
            </Row>
            <Row label="Peso (médias)">
              {r.weightStart !== null ? fmt1(r.weightStart) : "—"} → {r.weightEnd !== null ? `${fmt1(r.weightEnd)} kg` : "—"}
            </Row>
            <Row label="Calorias médias">{r.avgKcal !== null ? `${fmtInt(r.avgKcal)} kcal` : "—"}</Row>
            <Row label="Proteína média">{r.avgProtein !== null ? `${fmtInt(r.avgProtein)} g` : "—"}</Row>
          </div>
          {r.daysLogged > 0 && r.daysLogged < 7 && (
            <p className="mt-2 text-xs text-muted">Médias de dieta calculadas sobre {r.daysLogged} dia(s) com registro.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Novos recordes" />
          {r.records.length === 0 ? (
            <p className="text-sm text-muted">Nenhum recorde nesta semana.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {r.records.map((x, i) => (
                <li key={i} className="flex justify-between">
                  <span>🔥 {x.exercise}</span>
                  <span className="tabular font-semibold">{fmtSet(x)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
