import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import type { EnergyBalance } from "@/lib/domain/energy";
import { fmtInt } from "@/lib/format";

/** Déficit/superávit ESTIMADO. Nunca apresentar como valor exato. */
export function EnergyCard({ tdee, balance }: { tdee: number | null; balance: EnergyBalance }) {
  if (!tdee) {
    return (
      <Card>
        <CardHeader title="Balanço energético" />
        <p className="text-sm text-muted">
          Informe seu gasto energético diário estimado (TDEE) no{" "}
          <Link href="/perfil" className="text-accent">
            Perfil
          </Link>{" "}
          para ver o déficit ou superávit estimado.
        </p>
      </Card>
    );
  }

  const { dailyBalance, weeklyBalance, avgIntake, daysLogged } = balance;
  const isDeficit = dailyBalance !== null && dailyBalance < 0;

  return (
    <Card>
      <CardHeader title="Balanço energético (estimativa)" />
      {dailyBalance === null ? (
        <p className="text-sm text-muted">Registre a dieta por alguns dias para ver a estimativa.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="tabular text-lg font-bold">{fmtInt(tdee)}</div>
              <div className="text-xs text-muted">TDEE</div>
            </div>
            <div>
              <div className="tabular text-lg font-bold">{fmtInt(avgIntake ?? 0)}</div>
              <div className="text-xs text-muted">consumo médio</div>
            </div>
            <div>
              <div className="tabular text-lg font-bold">≈{fmtInt(Math.abs(dailyBalance))}</div>
              <div className="text-xs text-muted">{isDeficit ? "déficit/dia" : "superávit/dia"}</div>
            </div>
          </div>
          <p className="mt-3 text-sm">
            Na semana: {isDeficit ? "déficit" : "superávit"} estimado de{" "}
            <span className="tabular font-semibold">≈{fmtInt(Math.abs(weeklyBalance ?? 0))} kcal</span>
          </p>
        </>
      )}
      <p className="mt-2 text-xs text-faint">
        ⚠️ Esta é apenas uma estimativa{daysLogged ? `, baseada em ${daysLogged} dia(s) com registro nos últimos 7 dias` : ""}. O gasto
        real varia.
      </p>
    </Card>
  );
}
