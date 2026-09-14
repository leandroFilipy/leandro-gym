"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";

interface Props {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  label: string;
  unit?: string;
  height?: number;
}

const AXIS = { fontSize: 11, fill: "var(--color-faint)" };

export function BarCard({ title, data, xKey, yKey, label, unit = "", height = 180 }: Props) {
  return (
    <Card>
      <CardHeader title={title} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} minTickGap={12} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
            <Tooltip
              cursor={{ fill: "var(--color-surface-2)" }}
              contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "var(--color-muted)" }}
              formatter={(v) => [`${typeof v === "number" ? v.toLocaleString("pt-BR") : v}${unit}`, label]}
            />
            <Bar dataKey={yKey} fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
