import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Ruler, Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { MuscleMap } from "@/features/body/MuscleMap";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { MAP_PERIOD_DAYS, type MapPeriod } from "@/lib/domain/muscle-map";
import { fmt1 } from "@/lib/format";
import { getSettings, requireUserId } from "@/server/session";
import { getWeightSummary } from "@/server/services/body";
import { getMuscleMap } from "@/server/services/muscle-map";

export const metadata: Metadata = { title: "Corpo" };

const PERIODS: { key: MapPeriod; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta semana" },
  { key: "30d", label: "30 dias" },
];

export default async function CorpoPage({ searchParams }: PageProps<"/corpo">) {
  const userId = await requireUserId();
  const p = (await searchParams).p;
  const period: MapPeriod = typeof p === "string" && p in MAP_PERIOD_DAYS ? (p as MapPeriod) : "semana";
  const settings = await getSettings(userId);
  const [map, weight] = await Promise.all([getMuscleMap(userId, period), getWeightSummary(userId, todayIn(settings.timezone))]);
  const trained = map.muscles.filter((m) => m.sets > 0).length;

  return (
    <>
      <PageHeader title="Corpo" subtitle="Músculos treinados, peso, medidas e fotos" />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Mapa muscular" action={<span className="tabular text-sm text-muted">{trained}/{map.muscles.length} ativados</span>} />
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
            {PERIODS.map((x) => (
              <Link
                key={x.key}
                href={`/corpo?p=${x.key}`}
                scroll={false}
                className={cn("grid h-9 place-items-center rounded-sm text-sm", x.key === period ? "bg-surface font-semibold" : "text-muted")}
              >
                {x.label}
              </Link>
            ))}
          </div>
          <MuscleMap key={period} data={map} />
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/progresso/peso">
            <Card className="h-full hover:border-faint">
              <Scale className="mb-2 size-5 text-accent" />
              <div className="font-display text-sm font-bold uppercase tracking-wider">Peso</div>
              <div className="tabular text-sm text-muted">{weight.latest ? `${fmt1(weight.latest.value)} kg` : "Registrar"}</div>
            </Card>
          </Link>
          <Link href="/progresso/corpo">
            <Card className="h-full hover:border-faint">
              <Ruler className="mb-2 size-5 text-accent" />
              <div className="font-display text-sm font-bold uppercase tracking-wider">Medidas e fotos</div>
              <div className="flex items-center text-sm text-muted">
                Timelapse e câmera <ChevronRight className="size-4" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}
