"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { deleteBodyPhotoAction, deleteMeasurementAction } from "@/server/actions/body";

const ACTIONS = {
  measurement: { run: deleteMeasurementAction, confirm: "Apagar as medidas deste dia?" },
  photo: { run: deleteBodyPhotoAction, confirm: "Apagar esta foto?" },
};

export function DeleteBodyItemButton({ id, kind, className }: { id: string; kind: keyof typeof ACTIONS; className?: string }) {
  const [pending, start] = useTransition();
  const a = ACTIONS[kind];
  return (
    <button
      type="button"
      aria-label="Apagar"
      disabled={pending}
      onClick={() => confirm(a.confirm) && start(async () => void (await a.run(id)))}
      className={cn("rounded-lg p-1.5 text-faint hover:bg-danger/10 hover:text-danger disabled:opacity-40", className)}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
