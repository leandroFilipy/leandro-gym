"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createPlanAction } from "@/server/actions/plans";

export function CreatePlanForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createPlanAction(name);
          if (!r.ok) return setError(r.error);
          router.push(`/treino/fichas/${r.data.id}`);
        });
      }}
    >
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da nova ficha (ex.: ABC + Upper)"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
        />
        <Button type="submit" disabled={pending || !name.trim()}>
          <Plus className="size-4" /> Criar
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
