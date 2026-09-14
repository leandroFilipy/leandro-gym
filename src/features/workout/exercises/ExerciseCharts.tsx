"use client";

import { useState } from "react";
import { LineCard } from "@/components/charts/LineCard";
import { cn } from "@/lib/cn";

type Metric = "carga" | "reps" | "volume";
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "carga", label: "Carga", unit: " kg" },
  { key: "reps", label: "Repetições", unit: "" },
  { key: "volume", label: "Volume", unit: " kg" },
];

export function ExerciseCharts({ data }: { data: { date: string; carga: number; reps: number; volume: number }[] }) {
  const [metric, setMetric] = useState<Metric>("carga");
  const m = METRICS.find((x) => x.key === metric)!;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
        {METRICS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setMetric(x.key)}
            className={cn("h-8 rounded-lg text-sm", metric === x.key ? "bg-surface-2 font-semibold text-fg" : "text-muted")}
          >
            {x.label}
          </button>
        ))}
      </div>
      <LineCard title={`Evolução · ${m.label}`} data={data} xKey="date" series={[{ key: m.key, label: m.label }]} unit={m.unit} />
    </div>
  );
}
