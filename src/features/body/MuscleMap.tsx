"use client";

import { useId, useState } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MapLevel } from "@/lib/domain/muscle-map";
import { MUSCLE_LABEL } from "@/lib/labels";
import type { MuscleMapData } from "@/server/services/muscle-map";
import type { MuscleGroup } from "@/generated/prisma/enums";
import { BACK_DETAILS, BACK_MUSCLES, FRONT_DETAILS, FRONT_MUSCLES, SILHOUETTE_HALF, type MuscleShape } from "./body-shapes";

// Escala de uma cor só (laranja do app), igual ao quadriculado do ano.
const LEVEL_FILL: Record<MapLevel, string> = {
  0: "color-mix(in oklab, var(--color-fg) 17%, var(--color-surface))",
  1: "color-mix(in oklab, var(--color-accent) 54%, var(--color-surface))",
  2: "color-mix(in oklab, var(--color-accent) 84.5%, var(--color-surface))",
  3: "var(--color-accent)",
};
const LEVEL_LABEL: Record<MapLevel, string> = { 0: "Não treinado", 1: "Abaixo da faixa", 2: "Na faixa", 3: "Acima da faixa" };
const TODAY_LABEL: Record<MapLevel, string> = { 0: "Não treinado", 1: "Leve", 2: "Bom", 3: "Pesado" };

type Side = "front" | "back";

/** Boneco anatômico que vira (frente ↔ costas), cada grupo pintado pelo volume do período. */
export function MuscleMap({ data }: { data: MuscleMapData }) {
  const uid = useId().replace(/:/g, "");
  const byGroup = new Map(data.muscles.map((m) => [m.group, m]));
  const [side, setSide] = useState<Side>("front");
  const [selected, setSelected] = useState<MuscleGroup | null>(() => data.muscles.find((m) => m.sets > 0)?.group ?? null);
  const sel = selected ? byGroup.get(selected) : null;
  const levelText = data.period === "hoje" ? TODAY_LABEL : LEVEL_LABEL;

  const select = (g: MuscleGroup) => {
    setSelected(g);
    // Músculo que só aparece do outro lado: vira o boneco.
    const onFront = FRONT_MUSCLES.some((s) => s.group === g);
    const onBack = BACK_MUSCLES.some((s) => s.group === g);
    if (side === "front" && !onFront && onBack) setSide("back");
    if (side === "back" && !onBack && onFront) setSide("front");
  };

  const figure = (which: Side) => {
    const shapes: MuscleShape[] = which === "front" ? FRONT_MUSCLES : BACK_MUSCLES;
    return (
      <svg viewBox="0 0 200 440" className="size-full" role="group" aria-label={which === "front" ? "Frente" : "Costas"}>
        <defs>
          {/* pele: mais clara no centro, escura nas bordas (volume) */}
          <linearGradient id={`${uid}-skin`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--color-fg)" stopOpacity="0.04" />
            <stop offset="0.5" stopColor="var(--color-fg)" stopOpacity="0.13" />
            <stop offset="1" stopColor="var(--color-fg)" stopOpacity="0.04" />
          </linearGradient>
          {/* luz de cima/fora e sombra embaixo em cada músculo */}
          <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.42" />
          </linearGradient>
          <radialGradient id={`${uid}-spot`} cx="0.35" cy="0.3" r="0.6">
            <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {[false, true].map((mirror) => (
          <g key={String(mirror)} transform={mirror ? "translate(200 0) scale(-1 1)" : undefined}>
            <path d={SILHOUETTE_HALF} fill={`url(#${uid}-skin)`} stroke="color-mix(in oklab, var(--color-fg) 22%, transparent)" strokeWidth="0.8" />
            <path d={which === "front" ? FRONT_DETAILS : BACK_DETAILS} fill="none" stroke="color-mix(in oklab, var(--color-fg) 18%, transparent)" strokeWidth="0.8" strokeLinecap="round" />
            {shapes.map((s, i) => {
              const m = byGroup.get(s.group);
              const level = m?.level ?? 0;
              const active = selected === s.group;
              return (
                <g
                  key={i}
                  role="button"
                  tabIndex={mirror ? -1 : 0}
                  aria-label={`${MUSCLE_LABEL[s.group]}: ${m?.sets ?? 0} séries, ${levelText[level].toLowerCase()}`}
                  onClick={() => select(s.group)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(s.group)}
                  className={cn("cursor-pointer outline-none", level === 3 && "drop-shadow-[0_0_5px_var(--color-accent)]")}
                >
                  <path d={s.d} fill={LEVEL_FILL[level]} className="transition-[fill] duration-500" />
                  <path d={s.d} fill={`url(#${uid}-shade)`} />
                  <path d={s.d} fill={`url(#${uid}-spot)`} />
                  <path
                    d={s.d}
                    fill="none"
                    stroke={active ? "var(--color-fg)" : "color-mix(in oklab, #000 55%, transparent)"}
                    strokeWidth={active ? 2 : 0.9}
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    );
  };

  const sorted = [...data.muscles].sort((a, b) => b.sets - a.sets);
  const maxSets = Math.max(1, ...sorted.map((m) => m.sets));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
          {(["front", "back"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSide(s)} className={cn("h-8 rounded-sm px-4 text-sm", side === s ? "bg-surface font-semibold" : "text-muted")}>
              {s === "front" ? "Frente" : "Costas"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSide(side === "front" ? "back" : "front")} aria-label="Virar o corpo" className="grid size-10 place-items-center rounded-md border border-line text-muted hover:text-fg">
          <RotateCw className="size-4" />
        </button>
      </div>

      {/* Cartão que gira em 3D: frente e costas em faces opostas. */}
      <div className="mx-auto aspect-[200/440] w-full max-w-[240px] [perspective:1200px]">
        <div
          className="relative size-full transition-transform duration-700 ease-out [transform-style:preserve-3d]"
          style={{ transform: side === "back" ? "rotateY(180deg)" : "none" }}
        >
          <div className="absolute inset-0 [backface-visibility:hidden]" aria-hidden={side !== "front"}>
            {figure("front")}
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]" aria-hidden={side !== "back"}>
            {figure("back")}
          </div>
        </div>
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
            <button type="button" onClick={() => select(m.group)} className="flex w-full items-center gap-3 text-left text-sm">
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
