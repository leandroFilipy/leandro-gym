"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Stepper } from "@/components/ui/Stepper";
import { UNIT_LABEL } from "@/lib/labels";
import { removeMealFoodAction, updateMealFoodAction } from "@/server/actions/diet";
import { MacroLine } from "./MacroLine";
import type { DiaryItem } from "./types";

/** Editar quantidade de um item já registrado (macros recalculados no servidor). */
export function EditItemSheet({ item, onClose }: { item: DiaryItem | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title={item?.name ?? ""}>
      {item && <EditItemBody key={item.id} item={item} onClose={onClose} />}
    </Sheet>
  );
}

function EditItemBody({ item, onClose }: { item: DiaryItem; onClose: () => void }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [pending, start] = useTransition();
  const factor = item.quantity > 0 ? quantity / item.quantity : 0;
  const preview = { kcal: item.kcal * factor, protein: item.protein * factor, carbs: item.carbs * factor, fat: item.fat * factor };

  return (
    <div className="flex flex-col gap-4">
      <Stepper
        label="Quantidade"
        unit={UNIT_LABEL[item.unit]}
        value={quantity}
        step={item.unit === "UNIT" || item.unit === "PORTION" ? 1 : item.unit === "KG" || item.unit === "L" ? 0.1 : 10}
        decimals={1}
        onChange={setQuantity}
      />
      <div className="rounded-2xl bg-surface-2 p-3 text-center">
        <MacroLine m={preview} className="text-sm" />
      </div>
      <Button
        size="lg"
        block
        disabled={pending || quantity <= 0 || quantity === item.quantity}
        onClick={() => start(async () => { await updateMealFoodAction(item.id, quantity); onClose(); })}
      >
        Salvar
      </Button>
      <Button variant="danger" block disabled={pending} onClick={() => start(async () => { await removeMealFoodAction(item.id); onClose(); })}>
        Remover da refeição
      </Button>
    </div>
  );
}
