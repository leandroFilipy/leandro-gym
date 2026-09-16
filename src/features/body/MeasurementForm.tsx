"use client";

import { useActionState, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/Field";
import { MEASUREMENT_FIELDS, type MeasurementValues } from "@/lib/domain/measurements";
import { fmtNumber } from "@/lib/format";
import { MEASUREMENT_LABEL, MEASUREMENT_UNIT } from "@/lib/labels";
import { saveMeasurementAction } from "@/server/actions/body";

interface Props {
  today: string;
  /** Registro já existente em cada data (para editar). */
  byDate: Record<string, MeasurementValues>;
  /** Último valor de cada medida (placeholder). */
  latest: MeasurementValues;
}

/** Medidas com fita métrica. Campos vazios não são salvos; mesmo dia = substitui. */
export function MeasurementForm({ today, byDate, latest }: Props) {
  const [state, action] = useActionState(saveMeasurementAction, null);
  const [date, setDate] = useState(today);
  // "Salvo" até o próximo campo alterado depois daquele envio.
  const [editedAfter, setEditedAfter] = useState<typeof state>(null);
  const saved = Boolean(state?.ok) && editedAfter !== state;
  const existing = byDate[date];

  return (
    <form action={action} className="flex flex-col gap-3" onChange={() => setEditedAfter(state)}>
      <Field label="Data" name="date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
      {/* key: troca de data recarrega os valores do dia */}
      <div key={date} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MEASUREMENT_FIELDS.map((f) => (
          <Field
            key={f}
            label={`${MEASUREMENT_LABEL[f]} (${MEASUREMENT_UNIT[f]})`}
            name={f}
            type="number"
            step="0.1"
            inputMode="decimal"
            defaultValue={existing?.[f] ?? ""}
            placeholder={typeof latest[f] === "number" ? fmtNumber(latest[f]) : "—"}
          />
        ))}
      </div>
      <p className="text-xs text-faint">
        Meça sempre no mesmo horário (de manhã), com a fita justa sem apertar. Cintura na altura do umbigo; braço contraído no ponto mais largo.
      </p>
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton block size="lg" variant={saved ? "secondary" : "primary"}>
        {saved ? "✓ Salvo" : existing ? "Atualizar medidas" : "Salvar medidas"}
      </SubmitButton>
    </form>
  );
}
