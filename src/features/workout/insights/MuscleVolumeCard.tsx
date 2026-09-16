import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { MuscleVolumeRow, VolumeStatus } from "@/lib/domain/muscle-volume";
import { MUSCLE_LABEL } from "@/lib/labels";

const STATUS_TEXT: Record<VolumeStatus, string> = { below: "text-warn", within: "text-success", above: "text-danger" };
const STATUS_BAR: Record<VolumeStatus, string> = { below: "bg-warn", within: "bg-success", above: "bg-danger" };

interface Props {
  rows: MuscleVolumeRow[];
  hasPlan: boolean;
  title?: string;
  href?: string;
}

/**
 * Séries da semana por músculo. Faixa sombreada = alvo; barra = feito; traço branco = planejado na ficha.
 */
export function MuscleVolumeCard({ rows, hasPlan, title = "Volume semanal por músculo", href }: Props) {
  if (rows.length === 0) return null;
  const below = rows.filter((r) => (hasPlan ? r.plannedStatus : r.status) === "below");

  return (
    <Card>
      <CardHeader title={title} href={href} />
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const scale = Math.max(r.target.max * 1.25, r.done, r.planned);
          const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
          return (
            <li key={r.group}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span>{MUSCLE_LABEL[r.group]}</span>
                <span className="tabular text-xs text-muted">
                  <span className={cn("text-sm font-bold", STATUS_TEXT[r.status])}>{r.done}</span>
                  {hasPlan && <> / {r.planned}</>} · alvo {r.target.min}–{r.target.max}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-sm bg-surface-2" aria-hidden>
                <span className="absolute inset-y-0 bg-fg/10" style={{ left: pct(r.target.min), width: `calc(${pct(r.target.max)} - ${pct(r.target.min)})` }} />
                <span className={cn("absolute inset-y-0 left-0", STATUS_BAR[r.status])} style={{ width: pct(r.done) }} />
                {hasPlan && r.planned > 0 && <span className="absolute inset-y-0 w-0.5 bg-fg" style={{ left: `calc(${pct(r.planned)} - 1px)` }} />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-faint">
        Barra = séries feitas nesta semana{hasPlan ? " · traço = planejado na ficha" : ""} · faixa clara = alvo.
      </p>
      {hasPlan && below.length > 0 && (
        <p className="mt-1 text-xs text-warn">
          A ficha fica abaixo do alvo em {below.map((r) => MUSCLE_LABEL[r.group]).join(", ")}. Considere adicionar séries.
        </p>
      )}
    </Card>
  );
}
