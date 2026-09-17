import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/Card";
import { ShoppingChecklist } from "@/features/diet/ShoppingChecklist";
import { cn } from "@/lib/cn";
import { fmtDayMonth } from "@/lib/format";
import { requireUserId } from "@/server/session";
import { getShoppingList, SHOPPING_SOURCE_DAYS, SHOPPING_TARGET_DAYS } from "@/server/services/shopping";

export const metadata: Metadata = { title: "Lista de compras" };

function pick<T extends number>(value: string | string[] | undefined, options: readonly T[], fallback: T): T {
  const n = Number(value);
  return options.find((o) => o === n) ?? fallback;
}

export default async function ShoppingPage({ searchParams }: PageProps<"/dieta/compras">) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const base = pick(sp.base, SHOPPING_SOURCE_DAYS, 14);
  const days = pick(sp.dias, SHOPPING_TARGET_DAYS, 7);
  const { items, start, end, loggedDays } = await getShoppingList(userId, base, days);

  return (
    <>
      <PageHeader title="Lista de compras" back="/dieta" subtitle={base === 1 ? `Pelo que você comeu ontem (${fmtDayMonth(end)})` : `Pelo que você comeu de ${fmtDayMonth(start)} a ${fmtDayMonth(end)}`} />
      <div className="flex flex-col gap-4">
        <Options label="Comprar para" param="dias" value={days} options={SHOPPING_TARGET_DAYS} other={{ base }} />
        <Options label="Com base nos últimos" param="base" value={base} options={SHOPPING_SOURCE_DAYS} other={{ dias: days }} />

        {items.length === 0 ? (
          <EmptyState
            title="Nada para listar ainda"
            text={
              base < 7
                ? "Não há alimentos registrados nesse período. Registre a dieta ou escolha um período maior."
                : "A lista usa os alimentos que você registrou em pelo menos 2 dias do período. Registre a dieta por alguns dias ou escolha outro período."
            }
          />
        ) : (
          <>
            {loggedDays < base / 2 && (
              <p className="rounded-md border-l-4 border-warn bg-warn/10 px-3 py-2 text-xs text-muted">
                Só {loggedDays} de {base} dias têm registro — as quantidades podem vir menores que o real.
              </p>
            )}
            <ShoppingChecklist items={items} targetDays={days} />
          </>
        )}
      </div>
    </>
  );
}

function Options({ label, param, value, options, other }: { label: string; param: string; value: number; options: readonly number[]; other: Record<string, number> }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <span className="text-sm text-muted sm:w-40 sm:shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Link
            key={o}
            href={{ pathname: "/dieta/compras", query: { ...other, [param]: o } }}
            replace
            className={cn("rounded-full border px-3 py-1.5 text-sm", o === value ? "border-accent bg-accent/10 text-accent" : "border-line text-muted")}
          >
            {o} {o === 1 ? "dia" : "dias"}
          </Link>
        ))}
      </div>
    </div>
  );
}
