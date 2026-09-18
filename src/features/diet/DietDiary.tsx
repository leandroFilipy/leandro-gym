"use client";

import { useCallback, useState, useTransition } from "react";
import { Plus, Repeat, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fmtInt, fmtNumber } from "@/lib/format";
import { MEAL_LABEL, MEAL_TYPES, UNIT_LABEL } from "@/lib/labels";
import { repeatPreviousMealAction, saveMealAsFavoriteAction } from "@/server/actions/diet";
import type { MealType } from "@/generated/prisma/enums";
import { AddFoodSheet } from "./AddFoodSheet";
import { EditItemSheet } from "./EditItemSheet";
import { MacroLine } from "./MacroLine";
import type { DiaryItem, DiaryMeal, FavoriteOption, FoodOption } from "./types";

// Refeições sempre visíveis; as demais aparecem quando têm itens ou pelo botão "outra refeição".
const ALWAYS: MealType[] = ["BREAKFAST", "LUNCH", "AFTERNOON_SNACK", "DINNER"];

interface Props {
  date: string;
  meals: DiaryMeal[];
  foods: FoodOption[];
  frequentIds: string[];
  favorites: FavoriteOption[];
}

export function DietDiary({ date, meals, foods, frequentIds, favorites }: Props) {
  const [adding, setAdding] = useState<MealType | null>(null);
  const [editing, setEditing] = useState<DiaryItem | null>(null);
  const [extra, setExtra] = useState<MealType[]>([]);
  const [pending, start] = useTransition();
  const closeEdit = useCallback(() => setEditing(null), []);

  const visible = meals.filter((m) => ALWAYS.includes(m.type) || m.items.length > 0 || extra.includes(m.type));
  const hidden = MEAL_TYPES.filter((t) => !visible.some((m) => m.type === t));

  const saveFavorite = (meal: DiaryMeal) => {
    const name = prompt("Nome da refeição favorita:", MEAL_LABEL[meal.type]);
    if (!name || !meal.mealId) return;
    const mealId = meal.mealId;
    start(async () => {
      const r = await saveMealAsFavoriteAction(mealId, name);
      alert(r.ok ? `"${name}" salva nas favoritas ⭐` : r.error);
    });
  };

  const repeat = (type: MealType) =>
    start(async () => {
      const r = await repeatPreviousMealAction(date, type);
      if (!r.ok) alert(r.error);
    });

  return (
    <div className="flex flex-col gap-3">
      {visible.map((meal) => (
        <Card key={meal.type} className="p-0">
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{MEAL_LABEL[meal.type]}</h3>
              {meal.items.length > 0 && <MacroLine m={meal.totals} />}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {meal.items.length > 0 && (
                <button type="button" aria-label="Salvar como favorita" disabled={pending} onClick={() => saveFavorite(meal)} className="rounded-lg p-2 text-faint hover:text-warn">
                  <Star className="size-4" />
                </button>
              )}
              <button type="button" onClick={() => setAdding(meal.type)} className="flex items-center gap-1 rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
                <Plus className="size-4" /> Adicionar
              </button>
            </div>
          </div>
          {meal.items.length > 0 ? (
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {meal.items.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => setEditing(i)} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block truncate">{i.name}</span>
                      <span className="text-xs text-muted">
                        {fmtNumber(i.quantity)}
                        {UNIT_LABEL[i.unit]} · P {fmtInt(i.protein)}g
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm">{fmtInt(i.kcal)} kcal</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : meal.previous ? (
            <div className="px-4 pb-3 pt-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => repeat(meal.type)}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-left hover:border-accent disabled:opacity-60"
              >
                <Repeat className="size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Repetir de ontem</span>
                  <span className="block truncate text-xs text-muted">{meal.previous.names.join(" · ")}</span>
                </span>
                <span className="tabular shrink-0 text-xs text-muted">{fmtInt(meal.previous.kcal)} kcal</span>
              </button>
            </div>
          ) : (
            <div className="px-4 pb-3 pt-1 text-sm text-faint">Nada registrado</div>
          )}
        </Card>
      ))}

      {hidden.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const t = e.target.value as MealType;
            setExtra((x) => [...x, t]);
            setAdding(t);
          }}
          className="h-11 rounded-xl border border-dashed border-line bg-transparent px-3 text-sm text-muted"
          aria-label="Adicionar outra refeição"
        >
          <option value="" disabled>
            + Outra refeição…
          </option>
          {hidden.map((t) => (
            <option key={t} value={t}>
              {MEAL_LABEL[t]}
            </option>
          ))}
        </select>
      )}

      {adding && (
        <AddFoodSheet
          open
          onClose={() => setAdding(null)}
          date={date}
          mealType={adding}
          foods={foods}
          frequentIds={frequentIds}
          favorites={favorites}
        />
      )}
      <EditItemSheet item={editing} onClose={closeEdit} />
    </div>
  );
}
