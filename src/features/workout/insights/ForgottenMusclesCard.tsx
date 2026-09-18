import { Clock } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import type { ForgottenMuscle } from "@/lib/domain/forgotten-muscles";
import { MUSCLE_LABEL } from "@/lib/labels";

/** Home: grupos da ficha que ficaram sem série há muitos dias. */
export function ForgottenMusclesCard({ muscles }: { muscles: ForgottenMuscle[] }) {
  if (muscles.length === 0) return null;
  return (
    <Card className="border-warn/40">
      <CardHeader title="Músculo esquecido" action={<Badge tone="warn">{muscles.length}</Badge>} />
      <ul className="flex flex-col divide-y divide-line">
        {muscles.slice(0, 4).map((m) => (
          <li key={m.group} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <Clock className="mt-0.5 size-4 shrink-0 text-warn" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{MUSCLE_LABEL[m.group]}</span>
                <span className="tabular shrink-0 text-sm text-muted">{m.days === null ? "sem treino há 90+ dias" : `há ${m.days} dias`}</span>
              </span>
              <span className="block truncate text-xs text-muted">Está no treino {m.dayNames.join(" / ")} da sua ficha</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
