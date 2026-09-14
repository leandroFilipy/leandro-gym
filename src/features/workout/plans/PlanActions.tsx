"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { activatePlanAction, deletePlanAction, renamePlanAction } from "@/server/actions/plans";

export function PlanActions({ planId, name, active }: { planId: string; name: string; active: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Nome da ficha"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
        />
        <Button variant="secondary" disabled={pending || value === name || !value.trim()} onClick={() => start(async () => void (await renamePlanAction(planId, value)))}>
          Renomear
        </Button>
      </div>
      <div className="flex gap-2">
        {!active && (
          <Button className="flex-1" disabled={pending} onClick={() => start(async () => void (await activatePlanAction(planId)))}>
            Usar esta ficha
          </Button>
        )}
        <Button
          variant="danger"
          className={active ? "flex-1" : ""}
          disabled={pending}
          onClick={() =>
            confirm("Excluir esta ficha? O histórico de treinos é mantido.") &&
            start(async () => {
              await deletePlanAction(planId);
              router.push("/treino/fichas");
            })
          }
        >
          Excluir ficha
        </Button>
      </div>
    </div>
  );
}
