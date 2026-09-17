import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { ReportActions } from "@/features/reports/ReportActions";
import { fmtSet } from "@/features/workout/format";
import { cn } from "@/lib/cn";
import { addMonths, isValidMonth, monthOf, todayIn } from "@/lib/dates";
import { fmt1, fmtDayMonth, fmtInt, fmtNumber, fmtPercent, fmtSigned } from "@/lib/format";
import { getSettings, requireUserId } from "@/server/session";
import { getMonthlyReport, type MonthlyReport } from "@/server/services/monthly-report";

export const metadata: Metadata = { title: "Relatório mensal" };

function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <span className="text-muted">{label}</span>
      <span className="tabular text-right font-semibold">{children}</span>
    </div>
  );
}

function Change({ from, to, unit, goodDown = true }: { from: number | null; to: number | null; unit: string; goodDown?: boolean }) {
  if (from === null) return <>—</>;
  if (to === null || to === from) return <>{fmtNumber(from)}{unit}</>;
  const diff = Math.round((to - from) * 10) / 10;
  return (
    <>
      {fmtNumber(from)} → {fmtNumber(to)}{unit}
      <span className={cn("ml-2 text-sm", (diff < 0) === goodDown ? "text-success" : "text-warn")}>{fmtSigned(diff)}</span>
    </>
  );
}

/** Texto curto para compartilhar (WhatsApp, e-mail…). */
function summaryText(r: MonthlyReport) {
  const lines = [
    `🏋️ Treinos: ${r.workouts.done}${r.workouts.planned ? `/${r.workouts.planned}` : ""} · ${fmtInt(r.workouts.sets)} séries · ${fmtInt(r.workouts.volume)} kg de volume`,
  ];
  if (r.records.length) lines.push(`🔥 Recordes: ${r.records.slice(0, 5).map((x) => `${x.exercise} ${fmtSet(x)}`).join(", ")}`);
  if (r.strength.length) lines.push(`📈 Força: ${r.strength.slice(0, 3).map((s) => `${s.name} ${fmtPercent(s.pct)}`).join(", ")}`);
  if (r.body.weightStart !== null) lines.push(`⚖️ Peso: ${fmt1(r.body.weightStart)} → ${fmt1(r.body.weightEnd ?? r.body.weightStart)} kg`);
  if (r.body.fatStart !== null) lines.push(`📏 % gordura (fita): ${fmt1(r.body.fatStart)} → ${fmt1(r.body.fatEnd ?? r.body.fatStart)}%`);
  if (r.diet.avgKcal !== null)
    lines.push(`🍽️ Dieta: ${r.diet.daysLogged}/${r.diet.days} dias registrados · média ${fmtInt(r.diet.avgKcal)} kcal · ${fmtInt(r.diet.avgProtein ?? 0)} g de proteína`);
  return lines.join("\n");
}

export default async function MonthlyReportPage({ searchParams }: PageProps<"/progresso/relatorio/mensal">) {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const current = monthOf(todayIn(settings.timezone));
  const { m } = await searchParams;
  const month = typeof m === "string" && isValidMonth(m) && m <= current ? m : current;
  const r = await getMonthlyReport(userId, month);
  const title = `Relatório de ${monthLabel(month).toLowerCase()}`;

  return (
    <>
      <PageHeader title="Resumo do mês" back="/progresso" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between print:hidden">
          <Link href={`/progresso/relatorio/mensal?m=${addMonths(month, -1)}`} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Mês anterior">
            <ChevronLeft className="size-5" />
          </Link>
          <span className="text-sm font-semibold">
            {monthLabel(month)} {r.isCurrent && <span className="text-muted">(até {fmtDayMonth(r.end)})</span>}
          </span>
          {month < current ? (
            <Link href={`/progresso/relatorio/mensal?m=${addMonths(month, 1)}`} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Próximo mês">
              <ChevronRight className="size-5" />
            </Link>
          ) : (
            <span className="w-9" />
          )}
        </div>
        <h2 className="hidden text-2xl font-bold print:block">{monthLabel(month)}</h2>

        <ReportActions title={title} summary={summaryText(r)} />

        <Card className="grid grid-cols-3 gap-3">
          <Stat label="Treinos" value={r.workouts.planned ? `${r.workouts.done}/${r.workouts.planned}` : r.workouts.done} />
          <Stat label="Séries" value={fmtInt(r.workouts.sets)} />
          <Stat label="Horas" value={fmtNumber(r.workouts.hours)} />
        </Card>

        <Card>
          <CardHeader title="Treino" />
          <div className="divide-y divide-line">
            <Row label="Volume total">
              {fmtInt(r.workouts.volume)} kg
              {r.workouts.volumeChangePct !== null && (
                <span className={cn("ml-2 text-sm", r.workouts.volumeChangePct >= 0 ? "text-success" : "text-danger")}>{fmtPercent(r.workouts.volumeChangePct)}</span>
              )}
            </Row>
            <Row label="Frequência">
              {r.workouts.planned ? `${Math.round((r.workouts.done / r.workouts.planned) * 100)}% do planejado` : "—"}
            </Row>
          </div>
          {r.workouts.volumeChangePct !== null && <p className="mt-1 text-xs text-faint">Variação de volume comparada ao mês anterior inteiro.</p>}
        </Card>

        <Card>
          <CardHeader title="Evolução de força" />
          {r.strength.length === 0 ? (
            <p className="text-sm text-muted">Sem comparação ainda — precisa de treinos do mesmo exercício antes e durante o mês.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {r.strength.map((s) => (
                <li key={s.name} className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  <span className="tabular shrink-0">
                    <span className="text-muted">1RM {fmt1(s.before)} → {fmt1(s.now)} kg</span>
                    <span className={cn("ml-2 font-semibold", s.pct >= 0 ? "text-success" : "text-danger")}>{fmtPercent(s.pct)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={`Recordes (${r.records.length})`} />
          {r.records.length === 0 ? (
            <p className="text-sm text-muted">Nenhum recorde neste mês.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {r.records.slice(0, 10).map((x, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">🔥 {x.exercise} <span className="text-faint">· {fmtDayMonth(x.date)}</span></span>
                  <span className="tabular shrink-0 font-semibold">{fmtSet(x)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Corpo" />
          <div className="divide-y divide-line">
            <Row label="Peso (média início → fim)">
              <Change from={r.body.weightStart} to={r.body.weightEnd} unit=" kg" goodDown={settings.dietGoal !== "GAIN"} />
            </Row>
            <Row label="% de gordura (fita)">
              <Change from={r.body.fatStart} to={r.body.fatEnd} unit="%" />
            </Row>
            <Row label="Cintura">
              <Change from={r.body.waistStart} to={r.body.waistEnd} unit=" cm" />
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="Dieta" />
          <div className="divide-y divide-line">
            <Row label="Dias registrados">
              {r.diet.daysLogged} / {r.diet.days}
            </Row>
            <Row label="Calorias médias">
              {r.diet.avgKcal !== null ? `${fmtInt(r.diet.avgKcal)} kcal` : "—"}
              {r.diet.avgKcal !== null && r.diet.goalKcal && <span className="ml-1 text-sm font-normal text-muted">/ meta {fmtInt(r.diet.goalKcal)}</span>}
            </Row>
            <Row label="Proteína média">
              {r.diet.avgProtein !== null ? `${fmtInt(r.diet.avgProtein)} g` : "—"}
              {r.diet.avgProtein !== null && r.diet.goalProtein && <span className="ml-1 text-sm font-normal text-muted">/ meta {fmtInt(r.diet.goalProtein)}</span>}
            </Row>
            {r.diet.proteinDays !== null && r.diet.daysLogged > 0 && (
              <Row label="Dias batendo a proteína">
                {r.diet.proteinDays} de {r.diet.daysLogged}
              </Row>
            )}
          </div>
          <p className="mt-1 text-xs text-faint">Médias só dos dias com registro. Meta atual como referência.</p>
        </Card>
      </div>
    </>
  );
}
