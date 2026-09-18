"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { MapLevel } from "@/lib/domain/muscle-map";
import { MUSCLE_LABEL } from "@/lib/labels";
import type { MuscleMapData } from "@/server/services/muscle-map";
import type { MuscleGroup } from "@/generated/prisma/enums";

// Escala de uma cor só (laranja do app), igual ao quadriculado do ano.
const LEVEL_FILL: Record<MapLevel, string> = {
  0: "color-mix(in oklab, var(--color-fg) 12%, var(--color-surface))",
  1: "color-mix(in oklab, var(--color-accent) 54%, var(--color-surface))",
  2: "color-mix(in oklab, var(--color-accent) 84.5%, var(--color-surface))",
  3: "var(--color-accent)",
};
const LEVEL_LABEL: Record<MapLevel, string> = { 0: "Não treinado", 1: "Abaixo da faixa", 2: "Na faixa", 3: "Acima da faixa" };
const TODAY_LABEL: Record<MapLevel, string> = { 0: "Não treinado", 1: "Leve", 2: "Bom", 3: "Pesado" };
const SKIN = "color-mix(in oklab, var(--color-fg) 5%, var(--color-surface))";

type Shape = { group: MuscleGroup; d: string };

// Metade esquerda de cada figura (viewBox 200×430, eixo em x=100); a direita é espelhada.
const FRONT: Shape[] = [
  { group: "SHOULDERS", d: "M68 72 Q50 72 44 88 Q42 102 50 112 Q58 100 70 88 Z" },
  { group: "CHEST", d: "M98 76 L72 80 Q64 92 66 108 Q80 121 98 118 Z" },
  { group: "BICEPS", d: "M50 116 Q41 130 41 147 Q45 155 52 153 Q59 137 61 119 Z" },
  { group: "FOREARMS", d: "M42 158 Q34 178 32 202 L41 204 Q49 182 53 160 Z" },
  { group: "ABS", d: "M86 124 H98 V139 H86 Z M86 142 H98 V157 H86 Z M86 160 H98 V175 H86 Z M86 178 H98 V197 Q90 195 86 188 Z" },
  { group: "ABS", d: "M83 124 L74 121 Q69 152 75 185 L83 187 Z" },
  { group: "QUADS", d: "M76 207 Q69 242 73 290 Q79 307 90 305 Q99 280 97 232 L96 210 Z" },
  { group: "CALVES", d: "M77 332 Q72 362 78 396 L86 397 Q92 362 90 332 Z" },
];

const BACK: Shape[] = [
  { group: "BACK", d: "M99 54 L99 120 L84 95 L69 76 Q86 70 99 54 Z" },
  { group: "SHOULDERS", d: "M68 76 Q50 72 44 88 Q42 102 50 112 Q58 100 68 90 Z" },
  { group: "BACK", d: "M71 94 Q64 122 73 150 L86 157 L97 124 L83 100 Z" },
  { group: "BACK", d: "M89 158 L98 128 L98 194 L89 188 Z" },
  { group: "TRICEPS", d: "M50 116 Q41 130 41 147 Q45 155 52 153 Q59 137 61 119 Z" },
  { group: "FOREARMS", d: "M42 158 Q34 178 32 202 L41 204 Q49 182 53 160 Z" },
  { group: "GLUTES", d: "M98 198 L76 196 Q67 216 75 234 Q89 242 98 234 Z" },
  { group: "HAMSTRINGS", d: "M76 240 Q71 272 75 302 L92 304 Q99 272 97 242 Z" },
  { group: "CALVES", d: "M76 320 Q69 347 77 374 Q86 383 91 370 Q95 342 90 320 Z" },
];

/** Silhueta (pele) desenhada inteira, atrás dos músculos. */
const SILHOUETTE =
  "M100 7 C112 7 119 17 119 30 C119 42 113 50 109 52 L111 66 Q128 66 138 74 Q156 76 158 96 L166 158 Q171 182 169 205 L160 207 Q156 184 148 160 L140 118 Q142 150 130 186 L127 206 Q134 250 128 292 Q126 312 124 330 Q128 362 121 398 L118 410 L126 420 L106 422 L108 398 Q106 362 106 330 L103 300 L100 212 L97 300 L94 330 Q94 362 92 398 L94 422 L74 420 L82 410 L79 398 Q72 362 76 330 Q74 312 72 292 Q66 250 73 206 L70 186 Q58 150 60 118 L52 160 Q44 184 40 207 L31 205 Q29 182 34 158 L42 96 Q44 76 62 74 Q72 66 89 66 L91 52 C87 50 81 42 81 30 C81 17 88 7 100 7 Z";

interface Props {
  data: MuscleMapData;
}

/** Boneco de frente e de costas com cada grupo pintado pelo volume do período. Toque para detalhes. */
export function MuscleMap({ data }: Props) {
  const byGroup = new Map(data.muscles.map((m) => [m.group, m]));
  const [selected, setSelected] = useState<MuscleGroup | null>(() => data.muscles.find((m) => m.sets > 0)?.group ?? null);
  const sel = selected ? byGroup.get(selected) : null;
  const levelText = data.period === "hoje" ? TODAY_LABEL : LEVEL_LABEL;

  const figure = (shapes: Shape[], title: string) => (
    <figure className="min-w-0 flex-1">
      <svg viewBox="0 0 200 430" className="mx-auto h-auto w-full max-w-[220px]" role="group" aria-label={title}>
        <path d={SILHOUETTE} fill={SKIN} />
        {[false, true].map((mirror) => (
          <g key={String(mirror)} transform={mirror ? "translate(200 0) scale(-1 1)" : undefined}>
            {shapes.map((s, i) => {
              const m = byGroup.get(s.group);
              const level = m?.level ?? 0;
              const active = selected === s.group;
              return (
                <path
                  key={i}
                  d={s.d}
                  fill={LEVEL_FILL[level]}
                  stroke={active ? "var(--color-fg)" : "var(--color-surface)"}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeLinejoin="round"
                  className={cn("cursor-pointer transition-[fill]", level === 3 && "drop-shadow-[0_0_6px_var(--color-accent)]")}
                  onClick={() => setSelected(s.group)}
                  role="button"
                  tabIndex={mirror ? -1 : 0}
                  aria-label={`${MUSCLE_LABEL[s.group]}: ${m?.sets ?? 0} séries, ${levelText[level].toLowerCase()}`}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(s.group)}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-center font-display text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</figcaption>
    </figure>
  );

  const sorted = [...data.muscles].sort((a, b) => b.sets - a.sets);
  const maxSets = Math.max(1, ...sorted.map((m) => m.sets));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {figure(FRONT, "Frente")}
        {figure(BACK, "Costas")}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted" aria-hidden>
        {([0, 1, 2, 3] as const).map((l) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px]" style={{ background: LEVEL_FILL[l] }} />
            {levelText[l]}
          </span>
        ))}
      </div>

      {sel && (
        <div className="rounded-md border border-line bg-surface-2 p-3" aria-live="polite">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-xl font-bold uppercase italic">{MUSCLE_LABEL[sel.group]}</span>
            <span className="tabular text-sm">
              <span className="font-bold">{sel.sets}</span> séries
              {sel.target && <span className="text-muted"> · faixa {sel.target.min}–{sel.target.max}</span>}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {levelText[sel.level]}
            {" · "}
            {sel.daysSince === null ? "sem treino nos últimos 4 meses" : sel.daysSince === 0 ? "treinado hoje" : `último treino há ${sel.daysSince} dia${sel.daysSince === 1 ? "" : "s"}`}
          </p>
          {sel.exercises.length > 0 && (
            <ul className="mt-2 flex flex-col gap-0.5 text-sm">
              {sel.exercises.map((e) => (
                <li key={e.name} className="flex justify-between gap-2">
                  <span className="truncate">{e.name}</span>
                  <span className="tabular shrink-0 text-muted">{e.sets} séries</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tabela: a mesma informação sem depender de cor. */}
      <ul className="flex flex-col gap-1.5">
        {sorted.map((m) => (
          <li key={m.group}>
            <button type="button" onClick={() => setSelected(m.group)} className="flex w-full items-center gap-3 text-left text-sm">
              <span className={cn("w-24 shrink-0", selected === m.group ? "font-semibold text-fg" : "text-muted")}>{MUSCLE_LABEL[m.group]}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full" style={{ width: `${(m.sets / maxSets) * 100}%`, background: LEVEL_FILL[m.level] }} />
              </span>
              <span className="tabular w-8 shrink-0 text-right">{m.sets}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
