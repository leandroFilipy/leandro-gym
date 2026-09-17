import { BatteryMedium } from "lucide-react";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { fmtSigned } from "@/lib/format";
import type { getReadinessInsight } from "@/server/services/insights";

type Insight = Awaited<ReturnType<typeof getReadinessInsight>>;

const pct = (n: number) => `${fmtSigned(n)}%`;

/** Progresso: quanto o volume muda em dias de prontidão baixa × boa. */
export function ReadinessCard({ insight }: { insight: Insight }) {
  if (insight.answered === 0) return null;
  const { low, good, diffPct } = insight;

  return (
    <Card>
      <CardHeader title="Prontidão × desempenho" action={<BatteryMedium className="size-5 text-accent" />} />
      {diffPct === null ? (
        <p className="text-sm text-muted">
          {insight.answered} treino(s) com prontidão respondida. Com pelo menos 2 dias ruins e 2 bons (repetindo o mesmo treino da ficha) aparece aqui quanto o seu dia muda o volume.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Dias ruins" value={pct(low!.avgChangePct)} sub={`volume vs treino anterior · ${low!.count} treinos`} />
            <Stat label="Dias bons" value={pct(good!.avgChangePct)} sub={`volume vs treino anterior · ${good!.count} treinos`} />
          </div>
          <p className="mt-3 text-sm text-muted">
            {diffPct > 2 ? (
              <>
                Nos dias bons você rende <span className="font-semibold text-fg">{diffPct.toLocaleString("pt-BR")} pontos</span> a mais. Dormir bem está pagando no treino.
              </>
            ) : (
              "Até agora, sono e cansaço quase não mudaram seu volume — boa consistência."
            )}
          </p>
        </>
      )}
    </Card>
  );
}
