import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { STRENGTH_LEVELS, type RelativeStrength } from "@/lib/domain/strength";
import { fmt1, fmtNumber } from "@/lib/format";

interface Props {
  result: RelativeStrength | null;
  oneRm: number | null;
  bodyWeightKg: number | null;
}

/** Força relativa de um exercício (1RM estimado ÷ peso corporal) com o nível. */
export function StrengthCard({ result, oneRm, bodyWeightKg }: Props) {
  if (!oneRm) return null;
  if (!bodyWeightKg || !result) {
    return (
      <Card>
        <CardHeader title="Força relativa" />
        <p className="text-sm text-muted">
          Registre seu peso em <Link href="/progresso/peso" className="text-accent">Progresso → Peso</Link> para ver sua força em relação ao peso corporal.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Força relativa" />
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="tabular font-display text-4xl font-bold italic leading-none">{fmtNumber(Math.round(result.ratio * 100) / 100)}×</div>
          <div className="mt-1 text-xs text-muted">
            1RM est. {fmt1(oneRm)} kg ÷ {fmtNumber(bodyWeightKg)} kg de peso
          </div>
        </div>
        {result.level && <div className="font-display text-2xl font-bold uppercase italic text-accent">{result.level}</div>}
      </div>

      {result.level ? (
        <>
          <div className="mt-4 grid grid-cols-5 gap-1">
            {STRENGTH_LEVELS.map((l) => (
              <div key={l} className={`h-1.5 rounded-sm ${STRENGTH_LEVELS.indexOf(l) <= STRENGTH_LEVELS.indexOf(result.level!) ? "bg-accent" : "bg-surface-2"}`} />
            ))}
          </div>
          {result.nextLevel && result.progress !== null ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden bg-surface-2" role="progressbar" aria-valuenow={Math.round(result.progress * 100)} aria-valuemax={100}>
                <div className="h-full bg-accent" style={{ width: `${result.progress * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {result.nextLevel.level}: 1RM de <span className="font-semibold text-fg">{result.nextLevel.oneRm} kg</span>
                {" "}(faltam {fmtNumber(Math.max(0, Math.ceil(result.nextLevel.oneRm - oneRm)))} kg)
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">Topo da tabela. 🔥</p>
          )}
          <p className="mt-2 text-[11px] text-faint">Referência aproximada de padrões de força ({result.lift?.label}).</p>
        </>
      ) : (
        <p className="mt-3 text-xs text-faint">Sem tabela de níveis para este exercício — a razão serve para acompanhar sua evolução.</p>
      )}
    </Card>
  );
}
