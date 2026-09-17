"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import type { MealSuggestion } from "@/lib/domain/meal-suggestions";
import type { Macros } from "@/lib/domain/types";
import { fmtInt, fmtNumber } from "@/lib/format";
import { MEAL_LABEL, MEAL_TYPES, UNIT_LABEL } from "@/lib/labels";
import { addFoodsToMealAction } from "@/server/actions/diet";
import type { MealType } from "@/generated/prisma/enums";
import { MacroLine } from "./MacroLine";

interface Props {
  date: string;
  gap: Macros;
  suggestions: MealSuggestion[];
  hasHistory: boolean;
  defaultMeal: MealType;
}

/** "O que eu como agora?" — combinações dos alimentos habituais para fechar a meta do dia. */
export function WhatToEatCard({ date, gap, suggestions, hasHistory, defaultMeal }: Props) {
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = (s: MealSuggestion, index: number) =>
    start(async () => {
      setError(null);
      const r = await addFoodsToMealAction({ date, mealType: meal, items: s.items.map((i) => ({ foodId: i.foodId, quantity: i.quantity })) });
      if (!r.ok) return setError(r.error);
      setAdded(index);
    });

  return (
    <Card>
      <CardHeader title="O que eu como agora?" />
      <p className="mb-3 text-sm text-muted">
        Faltam <span className="font-semibold text-fg">{fmtInt(gap.kcal)} kcal</span>
        {gap.protein >= 1 && <> e <span className="font-semibold text-fg">{fmtInt(gap.protein)}g de proteína</span></>} para a meta.
      </p>

      {suggestions.length === 0 ? (
        <p className="text-sm text-faint">
          {hasHistory
            ? "Nenhuma combinação dos seus alimentos habituais cabe no que falta. 👌"
            : "Registre suas refeições por alguns dias — as sugestões usam o que você costuma comer."}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <li key={s.items.map((x) => `${x.foodId}:${x.quantity}`).join("|")} className="rounded-2xl border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {s.items.map((item) => (
                      <div key={item.foodId} className="truncate text-sm">
                        <span className="tabular font-semibold">
                          {fmtNumber(item.quantity)}
                          {UNIT_LABEL[item.unit]}
                        </span>{" "}
                        {item.name}
                      </div>
                    ))}
                    <MacroLine m={s.totals} />
                  </div>
                  <Button size="sm" variant={added === i ? "ghost" : "secondary"} disabled={pending || added === i} onClick={() => add(s, i)}>
                    {added === i ? <Check className="size-4" /> : "Adicionar"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
            <span className="flex items-center gap-1"><Sparkles className="size-3.5 text-accent" /> Adicionar em</span>
            <select value={meal} onChange={(e) => setMeal(e.target.value as MealType)} className="h-9 rounded-lg border border-line bg-surface-2 px-2 text-sm text-fg">
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>{MEAL_LABEL[t]}</option>
              ))}
            </select>
          </label>
        </>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
