import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { DeleteFavoriteButton } from "@/features/diet/DeleteFavoriteButton";
import { MacroLine } from "@/features/diet/MacroLine";
import { fmtNumber } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/labels";
import { requireUserId } from "@/server/session";
import { listFavorites } from "@/server/services/nutrition";

export const metadata: Metadata = { title: "Refeições favoritas" };

export default async function FavoritesPage() {
  const userId = await requireUserId();
  const favorites = await listFavorites(userId);

  return (
    <>
      <PageHeader title="Refeições favoritas" back="/dieta" />
      {favorites.length === 0 ? (
        <EmptyState
          title="Nenhuma favorita"
          text="No diário, monte uma refeição e toque na estrela ☆ para salvá-la. Depois é só um toque para adicionar tudo."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {favorites.map((f) => (
            <li key={f.id}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{f.name}</h3>
                    <MacroLine m={f.totals} />
                  </div>
                  <DeleteFavoriteButton id={f.id} name={f.name} />
                </div>
                <ul className="mt-2 text-sm text-muted">
                  {f.items.map((i) => (
                    <li key={i.id}>
                      {fmtNumber(i.quantity)}
                      {UNIT_LABEL[i.unit]} {i.name}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
