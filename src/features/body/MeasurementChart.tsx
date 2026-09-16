"use client";

import { useState } from "react";
import { LineCard } from "@/components/charts/LineCard";
import { cn } from "@/lib/cn";
import type { MeasurementEntry, MeasurementField } from "@/lib/domain/measurements";
import { fmtDayMonth } from "@/lib/format";
import { MEASUREMENT_LABEL, MEASUREMENT_UNIT } from "@/lib/labels";

/** Evolução de uma medida por vez (escalas muito diferentes entre cintura e braço). */
export function MeasurementChart({ entries, fields }: { entries: MeasurementEntry[]; fields: MeasurementField[] }) {
  const [field, setField] = useState<MeasurementField>(fields[0]);
  const data = entries.filter((e) => typeof e[field] === "number").map((e) => ({ date: fmtDayMonth(e.date), valor: e[field] as number }));

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {fields.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setField(f)}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", f === field ? "border-accent bg-accent/10 text-accent" : "border-line text-muted")}
          >
            {MEASUREMENT_LABEL[f]}
          </button>
        ))}
      </div>
      {data.length >= 2 ? (
        <LineCard title={MEASUREMENT_LABEL[field]} data={data} xKey="date" unit={` ${MEASUREMENT_UNIT[field]}`} series={[{ key: "valor", label: MEASUREMENT_LABEL[field] }]} />
      ) : (
        <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">Registre {MEASUREMENT_LABEL[field].toLowerCase()} em pelo menos 2 datas para ver o gráfico.</p>
      )}
    </div>
  );
}
