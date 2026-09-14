"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { saveWeightAction } from "@/server/actions/body";

interface Props {
  date: string;
  defaultWeight: number;
  alreadyLogged?: boolean;
  compact?: boolean;
}

/** Registro de peso com +/- (passo 0,1 kg), pré-preenchido com o último valor. */
export function WeightQuickForm({ date, defaultWeight, alreadyLogged, compact }: Props) {
  const [weight, setWeight] = useState(defaultWeight);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <Stepper label="Peso de hoje" unit="kg" value={weight} step={0.1} decimals={1} min={20} max={400} size={compact ? "md" : "lg"} onChange={(v) => { setWeight(v); setSaved(false); }} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        block
        size={compact ? "md" : "lg"}
        variant={saved ? "secondary" : "primary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveWeightAction({ date, weightKg: weight });
            if (r.ok) setSaved(true);
            setError(r.ok ? null : r.error);
          })
        }
      >
        {pending ? "Salvando…" : saved ? "✓ Salvo" : alreadyLogged ? "Atualizar peso" : "Registrar peso"}
      </Button>
    </div>
  );
}
