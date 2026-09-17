"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clearErrorsAction } from "@/server/actions/errors";

/** "Resolvido" (um grupo) ou "Limpar tudo". */
export function ClearErrorsButton({ fingerprint }: { fingerprint: string | null }) {
  const [pending, start] = useTransition();
  const all = fingerprint === null;

  return (
    <Button
      variant={all ? "secondary" : "ghost"}
      size="sm"
      disabled={pending}
      onClick={() => {
        if (all && !confirm("Apagar todos os erros registrados?")) return;
        start(async () => {
          await clearErrorsAction(fingerprint);
        });
      }}
    >
      {all ? <Trash2 className="size-4" /> : <Check className="size-4" />} {all ? "Limpar tudo" : "Resolvido"}
    </Button>
  );
}
