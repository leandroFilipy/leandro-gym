import Link from "next/link";
import { Check, Moon, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { WEEKDAY_SHORT } from "@/lib/format";
import type { DayStatus } from "@/server/services/workouts";

interface Day {
  date: string;
  weekday: number;
  name: string;
  status: DayStatus;
  sessionId: string | null;
  dayId?: string | null;
  doneOn?: number | null;
}

const styles: Record<DayStatus, string> = {
  done: "border-success/30 bg-success/10",
  missed: "border-danger/30 bg-danger/5",
  today: "border-accent bg-accent/10",
  future: "border-line",
  rest: "border-line bg-surface-2/50",
};

function StatusIcon({ status }: { status: DayStatus }) {
  if (status === "done") return <Check className="size-4 text-success" aria-label="Realizado" />;
  if (status === "missed") return <X className="size-4 text-danger" aria-label="Perdido" />;
  if (status === "rest") return <Moon className="size-4 text-faint" aria-label="Descanso" />;
  if (status === "today") return <span className="size-2 rounded-full bg-accent" aria-label="Hoje" />;
  return <span className="size-2 rounded-full bg-line" aria-label="Futuro" />;
}

/** Lista vertical no celular (nome legível), grade no desktop. */
export function WeekCalendar({ days }: { days: Day[] }) {
  return (
    <ul className="flex flex-col gap-1.5 md:grid md:grid-cols-7 md:gap-2">
      {days.map((d) => {
        const content = (
          <>
            <span className={cn("w-10 text-xs font-bold md:w-auto", d.status === "today" ? "text-accent" : "text-muted")}>
              {WEEKDAY_SHORT[d.weekday]}
            </span>
            <span className={cn("flex-1 truncate text-sm md:text-xs", d.status === "rest" && "text-faint")}>
              {d.name}
              {d.doneOn && <span className="text-xs text-muted"> · feito {WEEKDAY_SHORT[d.doneOn].toLowerCase()}</span>}
            </span>
            {d.status === "missed" && d.dayId && <span className="text-xs font-semibold text-accent">Fazer hoje</span>}
            <StatusIcon status={d.status} />
          </>
        );
        const cls = cn(
          "flex items-center gap-3 rounded-xl border px-3 py-2.5 md:flex-col md:items-start md:gap-1 md:py-3",
          styles[d.status],
        );
        return (
          <li key={d.date}>
            {d.sessionId ? (
              <Link href={`/treino/sessao/${d.sessionId}/resumo`} className={cls}>
                {content}
              </Link>
            ) : d.dayId && d.status !== "rest" ? (
              // Dia perdido ou futuro: abre o treino, que tem "Fazer este treino hoje".
              <Link href={`/treino/dia/${d.dayId}`} className={cn(cls, "hover:border-accent")}>
                {content}
              </Link>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
