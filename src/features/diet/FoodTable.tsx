"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Database, ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { fmtNumber } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/labels";
import { archiveFoodAction } from "@/server/actions/diet";
import { FoodForm } from "./FoodForm";
import type { FoodOption } from "./types";

export function FoodTable({ foods }: { foods: FoodOption[] }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<FoodOption | "new" | null>(null);
  const [pending, start] = useTransition();
  const close = useCallback(() => setEditing(null), []);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? foods.filter((f) => f.name.toLowerCase().includes(t)) : foods;
  }, [foods, q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
        />
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Novo
        </Button>
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-line">
          {list.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 bg-cover bg-center text-faint"
                style={f.imageUrl ? { backgroundImage: `url(${JSON.stringify(f.imageUrl)})` } : undefined}
              >
                {!f.imageUrl && <ImageIcon className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{f.name}</span>
                  {f.mine && <Badge tone="accent">meu</Badge>}
                  {!f.mine && f.sourceName && <Badge><Database className="size-3" /> {f.sourceName}</Badge>}
                </div>
                <div className="tabular text-xs text-muted">
                  {fmtNumber(f.servingSize)}
                  {UNIT_LABEL[f.unit]} · {fmtNumber(f.kcal)} kcal · P {fmtNumber(f.protein)} · C {fmtNumber(f.carbs)} · G {fmtNumber(f.fat)}
                </div>
              </div>
              {f.mine && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(f)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => confirm(`Arquivar ${f.name}?`) && start(async () => void (await archiveFoodAction(f.id)))}
                  >
                    Arquivar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <p className="px-1 text-xs text-faint">Valores de referência podem variar conforme marca, corte e preparo.</p>

      <Sheet open={editing !== null} onClose={close} title={editing === "new" ? "Novo alimento" : "Editar alimento"}>
        {editing && <FoodForm key={editing === "new" ? "new" : editing.id} food={editing === "new" ? undefined : editing} onDone={close} />}
      </Sheet>
    </div>
  );
}
