"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { fmtDayMonth, WEEKDAY_LONG } from "@/lib/format";
import { isoWeekday } from "@/lib/dates";
import type { HeatCell, HeatLevel, TrainingHeatmap } from "@/lib/domain/training-heatmap";

const MONTHS = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Escala de uma cor só (laranja do app) sobre a superfície: funciona no tema claro e no escuro.
// Passos conferidos: claridade crescente, degraus visíveis e o mais fraco com ≥ 2:1 do fundo.
const LEVEL_BG: Record<HeatLevel, string> = {
  0: "var(--color-surface-2)",
  1: "color-mix(in oklab, var(--color-accent) 54%, var(--color-surface))",
  2: "color-mix(in oklab, var(--color-accent) 69%, var(--color-surface))",
  3: "color-mix(in oklab, var(--color-accent) 84.5%, var(--color-surface))",
  4: "var(--color-accent)",
};

const CELL = 11; // px
const GAP = 2; // px

function describe(c: HeatCell) {
  const day = `${WEEKDAY_LONG[isoWeekday(c.date)]}, ${fmtDayMonth(c.date)}`;
  return c.sets > 0 ? `${day} · ${c.sets} série${c.sets === 1 ? "" : "s"}` : `${day} · sem treino`;
}

/** Quadriculado do ano (estilo GitHub): um quadrado por dia, mais forte = mais séries. */
export function TrainingHeatmapCard({ data }: { data: TrainingHeatmap }) {
  const [active, setActive] = useState<HeatCell | null>(null);
  const { weeks, months } = data;

  return (
    <Card>
      <CardHeader title="Frequência no ano" action={<CalendarDays className="size-5 text-accent" />} />

      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat label="Dias treinados" value={data.trainedDays} sub="últimos 12 meses" />
        <Stat label="Semanas ativas" value={`${data.activeWeeks}`} sub={`de ${weeks.length}`} />
        <Stat label="Sequência" value={`${data.currentWeekStreak} sem`} sub={`recorde: ${data.bestWeekStreak} sem`} />
      </div>

      <div className="flex gap-1.5">
        {/* Dias da semana fora da rolagem: continuam visíveis ao ver as semanas recentes. */}
        <div className="flex shrink-0 flex-col pt-4 text-[10px] leading-none text-muted" style={{ gap: GAP }} aria-hidden>
          {["seg", "", "qua", "", "sex", "", ""].map((l, i) => (
            <span key={i} className="flex items-center" style={{ height: CELL }}>
              {l}
            </span>
          ))}
        </div>
        {/* dir=rtl faz a rolagem começar no fim (semanas mais recentes) sem JS. */}
        <div dir="rtl" className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <div dir="ltr" className="inline-block">
            <div className="relative h-4 text-[10px] leading-none text-muted" aria-hidden>
              {months.map((m) => (
                <span key={`${m.col}-${m.month}`} className="absolute top-0" style={{ left: m.col * (CELL + GAP) }}>
                  {MONTHS[m.month]}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }} role="grid" aria-label="Dias treinados no último ano">
              {weeks.map((week, w) => (
                <div key={w} className="flex flex-col" style={{ gap: GAP }} role="row">
                  {week.map((c) =>
                    c.future ? (
                      <span key={c.date} style={{ width: CELL, height: CELL }} aria-hidden />
                    ) : (
                      <button
                        key={c.date}
                        type="button"
                        role="gridcell"
                        aria-label={describe(c)}
                        title={describe(c)}
                        onMouseEnter={() => setActive(c)}
                        onFocus={() => setActive(c)}
                        onClick={() => setActive(c)}
                        className={cn("rounded-[2px] outline-offset-1 focus-visible:outline-2 focus-visible:outline-fg", active?.date === c.date && "outline-2 outline-fg")}
                        style={{ width: CELL, height: CELL, background: LEVEL_BG[c.level] }}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="tabular min-h-4" aria-live="polite">
          {active ? describe(active) : "Toque num dia para ver"}
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          Menos
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className="rounded-[2px]" style={{ width: CELL, height: CELL, background: LEVEL_BG[l] }} />
          ))}
          Mais
        </span>
      </div>
    </Card>
  );
}
