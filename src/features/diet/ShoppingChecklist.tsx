"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { shoppingListText, type ShoppingItem } from "@/lib/domain/shopping-list";

const STORAGE_KEY = "shopping-checked";

function loadChecked(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Checklist do mercado. O que já foi marcado fica salvo neste aparelho. */
export function ShoppingChecklist({ items, targetDays }: { items: ShoppingItem[]; targetDays: number }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Lê do aparelho depois de montar (o servidor não tem localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com armazenamento externo
    setChecked(new Set(loadChecked()));
  }, []);

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // armazenamento bloqueado: a marcação vale só nesta tela
    }
  };

  const clear = () => {
    setChecked(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // idem
    }
  };

  const share = async () => {
    const text = shoppingListText(items.filter((i) => !checked.has(i.foodId)), targetDays);
    try {
      if (navigator.share) return await navigator.share({ title: "Lista de compras", text });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copie a lista:", text);
    }
  };

  const done = items.filter((i) => checked.has(i.foodId)).length;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
        {items.map((i) => {
          const on = checked.has(i.foodId);
          return (
            <li key={i.foodId}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-3">
                <input type="checkbox" checked={on} onChange={() => toggle(i.foodId)} className="size-5 shrink-0 accent-[var(--color-accent)]" />
                <span className={cn("min-w-0 flex-1", on && "text-faint line-through")}>
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="text-xs text-muted">
                    comido em {i.daysEaten} dia(s){i.cooked && " · peso pronto — cru pesa diferente"}
                  </span>
                </span>
                <span className={cn("tabular shrink-0 text-right font-semibold", on && "text-faint line-through")}>
                  {i.amount.toLocaleString("pt-BR")} {i.unit}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-muted">
        {done}/{items.length} no carrinho
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={clear} disabled={done === 0}>
          <RotateCcw className="size-4" /> Desmarcar tudo
        </Button>
        <Button variant="secondary" onClick={share}>
          {copied ? <><Check className="size-4" /> Copiado</> : <><Share2 className="size-4" /> Compartilhar</>}
        </Button>
      </div>
    </div>
  );
}
