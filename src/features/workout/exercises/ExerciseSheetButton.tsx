"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { MuscleGroup } from "@/generated/prisma/enums";
import { ExerciseForm } from "./ExerciseForm";

interface Props {
  label: ReactNode;
  exercise?: { id: string; name: string; muscleGroup: MuscleGroup; notes: string | null };
  variant?: "primary" | "secondary";
}

export function ExerciseSheetButton({ label, exercise, variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet open={open} onClose={close} title={exercise ? "Editar exercício" : "Novo exercício"}>
        <ExerciseForm exercise={exercise} onDone={close} />
      </Sheet>
    </>
  );
}
