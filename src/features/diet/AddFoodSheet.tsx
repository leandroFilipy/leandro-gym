"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ImageIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Stepper } from "@/components/ui/Stepper";
import { cn } from "@/lib/cn";
import { scaleMacros } from "@/lib/domain/nutrition";
import { fmtNumber } from "@/lib/format";
import { MEAL_LABEL, UNIT_LABEL } from "@/lib/labels";
import { addFoodToMealAction, applyFavoriteAction } from "@/server/actions/diet";
import type { MealType } from "@/generated/prisma/enums";
import { MacroLine } from "./MacroLine";
import type { FavoriteOption, FoodOption } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  mealType: MealType;
  foods: FoodOption[];
  frequentIds: string[];
  favorites: FavoriteOption[];
}

const stepFor = (f: FoodOption) =>
  f.unit === "UNIT" || f.unit === "PORTION" ? 1 : f.unit === "KG" || f.unit === "L" ? 0.1 : f.servingSize >= 100 ? 10 : 5;

export function AddFoodSheet({ open, onClose, date, mealType, foods, frequentIds, favorites }: Props) {
  const [tab, setTab] = useState<"foods" | "favorites">("foods");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<FoodOption | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term) return foods.filter((f) => f.name.toLowerCase().includes(term)).slice(0, 40);
    const frequent = frequentIds.map((id) => foods.find((f) => f.id === id)).filter((f): f is FoodOption => Boolean(f));
    return [...frequent, ...foods.filter((f) => !frequentIds.includes(f.id))];
  }, [foods, frequentIds, q]);

  const close = () => {
    setSelected(null);
    setQ("");
    setError(null);
    onClose();
  };

  const pick = (f: FoodOption) => {
    setSelected(f);
    setQuantity(f.servingSize);
  };

  const add = () =>
    selected &&
    start(async () => {
      const r = await addFoodToMealAction({ date, mealType, foodId: selected.id, quantity });
      if (!r.ok) return setError(r.error);
      close();
    });

  const applyFav = (id: string) =>
    start(async () => {
      const r = await applyFavoriteAction(id, date, mealType);
      if (!r.ok) return setError(r.error);
      close();
    });

  return (
    <Sheet open={open} onClose={close} title={`Adicionar · ${MEAL_LABEL[mealType]}`}>
      {selected ? (
        <div className="flex flex-col gap-4">
          <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 self-start text-sm text-muted">
            <ChevronLeft className="size-4" /> Voltar
          </button>
          <div>
            <div className="text-xl font-bold">{selected.name}</div>
            <div className="text-xs text-muted">
              Referência: {fmtNumber(selected.servingSize)}
              {UNIT_LABEL[selected.unit]} = {fmtNumber(selected.kcal)} kcal
            </div>
          </div>
          <Stepper label="Quantidade" unit={UNIT_LABEL[selected.unit]} value={quantity} step={stepFor(selected)} min={0} decimals={1} onChange={setQuantity} />
          <div className="rounded-2xl bg-surface-2 p-3 text-center">
            <MacroLine m={scaleMacros(selected, quantity)} className="text-sm" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button size="lg" block disabled={pending || quantity <= 0} onClick={add}>
            {pending ? "Adicionando…" : "Adicionar"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {(["foods", "favorites"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("h-9 rounded-lg text-sm", tab === t ? "bg-surface font-semibold" : "text-muted")}
              >
                {t === "foods" ? "Alimentos" : `Favoritas (${favorites.length})`}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}

          {tab === "foods" ? (
            <>
              <input
                autoFocus
                placeholder="Buscar alimento…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
              />
              <ul className="flex flex-col">
                {list.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => pick(f)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 bg-cover bg-center text-faint"
                        style={f.imageUrl ? { backgroundImage: `url(${JSON.stringify(f.imageUrl)})` } : undefined}
                      >
                        {!f.imageUrl && <ImageIcon className="size-3.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 truncate font-medium">
                          {frequentIds.includes(f.id) && !q && <Star className="size-3 fill-warn text-warn" />}
                          {f.name}
                        </span>
                        <span className="text-xs text-muted">
                          {fmtNumber(f.servingSize)}
                          {UNIT_LABEL[f.unit]} · P {fmtNumber(f.protein)}g
                        </span>
                      </span>
                      <span className="tabular ml-auto shrink-0 text-sm text-muted">{fmtNumber(f.kcal)} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
              {list.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">
                  Não encontrado. <Link className="text-accent" href="/dieta/alimentos">Cadastrar alimento</Link>
                </p>
              )}
            </>
          ) : favorites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhuma favorita. Monte uma refeição e toque em ☆ para salvá-la.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {favorites.map((f) => (
                <li key={f.id}>
                  <button type="button" disabled={pending} onClick={() => applyFav(f.id)} className="w-full rounded-2xl border border-line p-3 text-left hover:border-accent disabled:opacity-50">
                    <div className="font-semibold">{f.name}</div>
                    <div className="truncate text-xs text-muted">{f.items.map((i) => i.name).join(", ")}</div>
                    <MacroLine m={f.totals} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  );
}
