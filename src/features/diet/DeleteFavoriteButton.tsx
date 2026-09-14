"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteFavoriteAction } from "@/server/actions/diet";

export function DeleteFavoriteButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => confirm(`Excluir "${name}"?`) && start(async () => void (await deleteFavoriteAction(id)))}
    >
      Excluir
    </Button>
  );
}
