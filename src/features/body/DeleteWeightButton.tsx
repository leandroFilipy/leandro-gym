"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWeightAction } from "@/server/actions/body";

export function DeleteWeightButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Apagar registro"
      disabled={pending}
      onClick={() => confirm("Apagar este registro de peso?") && start(async () => void (await deleteWeightAction(id)))}
      className="rounded-lg p-1.5 text-faint hover:bg-danger/10 hover:text-danger disabled:opacity-40"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
