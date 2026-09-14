"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { MUSCLE_LABEL } from "@/lib/labels";
import type { MuscleGroup } from "@/generated/prisma/enums";

export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

interface Props {
  open: boolean;
  onClose: () => void;
  library: LibraryExercise[];
  exclude?: string[];
  onPick: (exerciseId: string) => Promise<unknown>;
  title?: string;
}

/** Lista pesquisável de exercícios da biblioteca. Reutilizado na ficha e na sessão. */
export function ExercisePickerSheet({ open, onClose, library, exclude = [], onPick, title = "Adicionar exercício" }: Props) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return library.filter((e) => !exclude.includes(e.id) && (!term || e.name.toLowerCase().includes(term)));
  }, [library, exclude, q]);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <input
        autoFocus
        placeholder="Buscar exercício…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
      />
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Nenhum exercício. Cadastre em <Link className="text-accent" href="/treino/exercicios">Treino → Exercícios</Link>.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await onPick(e.id);
                    onClose();
                  })
                }
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-surface-2 disabled:opacity-50"
              >
                <span>
                  <span className="block font-medium">{e.name}</span>
                  <span className="text-xs text-muted">{MUSCLE_LABEL[e.muscleGroup]}</span>
                </span>
                <Plus className="size-5 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
