import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/cn";

/** Marca do app dentro da interface (a foto fica só no ícone da aba/celular). */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn("grid shrink-0 -skew-x-12 place-items-center bg-accent text-accent-fg", lg ? "size-12" : "size-9")}>
        <Dumbbell className={cn("skew-x-12", lg ? "size-7" : "size-5")} strokeWidth={2.4} />
      </span>
      <span className={cn("font-display font-extrabold uppercase italic leading-none tracking-tight", lg ? "text-4xl" : "text-2xl")}>
        Leandro<span className="text-accent">Gym</span>
      </span>
    </span>
  );
}
