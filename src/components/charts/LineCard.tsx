"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

interface Props {
  title: string;
  data: Record<string, string | number | null>[];
  xKey: string;
  series: SeriesDef[];
  unit?: string;
  height?: number;
}

const AXIS = { fontSize: 11, fill: "var(--color-faint)" };

/** Gráfico de linha padrão do app (tema dark, poucas cores). */
export function LineCard({ title, data, xKey, series, unit = "", height = 200 }: Props) {
  return (
    <Card>
      <CardHeader title={title} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={48} />
            <Tooltip
              contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)", borderRadius: 4, fontSize: 12 }}
              labelStyle={{ color: "var(--color-muted)" }}
              formatter={(v, name) => [`${typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : v}${unit}`, name]}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? "var(--color-accent)"}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                dot={data.length <= 20 ? { r: 2.5 } : false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
