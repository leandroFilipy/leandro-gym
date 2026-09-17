import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { bodyFatCategory, type BodyFatPoint } from "@/lib/domain/body-fat";
import { cn } from "@/lib/cn";
import { fmtDayMonth, fmtNumber, fmtSigned } from "@/lib/format";

interface Props {
  series: BodyFatPoint[];
  sex: "MALE" | "FEMALE" | null;
  heightCm: number | null;
}

/** % de gordura estimado pela fórmula da Marinha (cintura, pescoço e — mulheres — quadril). */
export function BodyFatCard({ series, sex, heightCm }: Props) {
  const missingProfile = !sex || !heightCm;
  const latest = series.at(-1);

  return (
    <Card>
      <CardHeader title="% de gordura estimado" />
      {missingProfile ? (
        <p className="text-sm text-muted">
          Preencha <strong className="text-fg">altura e sexo</strong> no <Link href="/perfil" className="text-accent">Perfil</Link> para calcular pela fita métrica.
        </p>
      ) : !latest ? (
        <p className="text-sm text-muted">
          Registre <strong className="text-fg">cintura e pescoço</strong>
          {sex === "FEMALE" && <> e <strong className="text-fg">quadril</strong></>} abaixo para ver a estimativa.
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="tabular font-display text-4xl font-bold italic leading-none">{fmtNumber(latest.value)}%</div>
              <div className="mt-1 text-xs text-muted">em {fmtDayMonth(latest.date)}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-xl font-bold uppercase italic text-accent">{bodyFatCategory(latest.value, sex)}</div>
              {series.length > 1 && (
                <div className="text-xs text-muted">
                  <span className={cn("tabular font-semibold", latest.value - series[0].value <= 0 ? "text-success" : "text-warn")}>
                    {fmtSigned(Math.round((latest.value - series[0].value) * 10) / 10)} p.p.
                  </span>{" "}
                  desde {fmtDayMonth(series[0].date)}
                </div>
              )}
            </div>
          </div>
          {series.length > 1 && (
            <ol className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {series.slice(-8).map((p) => (
                <li key={p.date} className="shrink-0 rounded-md border border-line px-2 py-1 text-center">
                  <div className="tabular text-sm font-semibold">{fmtNumber(p.value)}%</div>
                  <div className="text-[11px] text-faint">{fmtDayMonth(p.date)}</div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-[11px] text-faint">
            Fórmula da Marinha dos EUA — erro típico de ±3–4 pontos. Meça sempre do mesmo jeito (cintura na altura do umbigo, de manhã) e olhe a tendência.
          </p>
        </>
      )}
    </Card>
  );
}
