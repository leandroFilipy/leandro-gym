"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { archiveExerciseAction } from "@/server/actions/exercises";

export function ArchiveExerciseButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        confirm("Arquivar este exercício? O histórico continua salvo.") &&
        start(async () => {
          await archiveExerciseAction(id);
          router.push("/treino/exercicios");
        })
      }
    >
      Arquivar
    </Button>
  );
}
