import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { fmtInt, fmtSigned } from "@/lib/format";
import type { AdaptiveTdee } from "@/lib/domain/energy";

/**
 * Mostra o TDEE estimado a partir dos dados reais (peso × consumo).
 * Só aparece quando há histórico suficiente — caso contrário retorna null
 * e a página mostra apenas as metas fixas.
 */
export function AdaptiveTdeeCard({ tdee }: { tdee: AdaptiveTdee | null }) {
  if (!tdee) return null;

  const trend = tdee.weightTrendKgPerWeek;
  const trendLabel =
    Math.abs(trend) < 0.05 ? "peso estável" : trend < 0 ? "perdendo peso" : "ganhando peso";

  return (
    <Card>
      <CardHeader title="Gasto energético estimado" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="TDEE" value={fmtInt(tdee.tdee)} sub="kcal/dia" />
        <Stat label="Consumo médio" value={fmtInt(tdee.avgIntake)} sub="kcal/dia" />
        <Stat label="Tendência" value={`${fmtSigned(trend, 2)} kg`} sub="por semana" />
      </div>
      <p className="mt-3 text-xs text-muted">
        Calculado com base nos últimos {tdee.days} dias ({trendLabel}). É a melhor estimativa do
        seu gasto real — ajuste suas metas se ele destoar muito do plano.
      </p>
    </Card>
  );
}
