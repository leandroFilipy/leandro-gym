import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, EmptyState } from "@/components/ui/Card";
import { ClearErrorsButton } from "@/features/profile/ClearErrorsButton";
import { cn } from "@/lib/cn";
import { isAdmin } from "@/server/monitoring/errors";
import { getSettings, requireUserId } from "@/server/session";
import { ERROR_WINDOW_DAYS, getErrorGroups } from "@/server/services/errors";

export const metadata: Metadata = { title: "Erros do app" };

const SOURCE_LABEL: Record<string, string> = { server: "servidor", action: "ação", client: "navegador", ai: "IA" };
const SOURCE_TONE: Record<string, "danger" | "warn" | "accent" | "neutral"> = { server: "danger", action: "danger", client: "warn", ai: "accent" };

export default async function ErrorsPage({ searchParams }: PageProps<"/perfil/erros">) {
  const userId = await requireUserId();
  if (!(await isAdmin(userId))) notFound();

  const d = Number((await searchParams).d);
  const days = ERROR_WINDOW_DAYS.find((x) => x === d) ?? 7;
  const [groups, settings] = await Promise.all([getErrorGroups(days), getSettings(userId)]);
  const when = (date: Date) => date.toLocaleString("pt-BR", { timeZone: settings.timezone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <PageHeader title="Erros do app" back="/perfil" subtitle="Registrados automaticamente no servidor e nos celulares" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {ERROR_WINDOW_DAYS.map((x) => (
              <Link
                key={x}
                href={`/perfil/erros?d=${x}`}
                replace
                className={cn("rounded-full border px-3 py-1.5 text-sm", x === days ? "border-accent bg-accent/10 text-accent" : "border-line text-muted")}
              >
                {x === 1 ? "24 h" : `${x} dias`}
              </Link>
            ))}
          </div>
          {groups.length > 0 && <ClearErrorsButton fingerprint={null} />}
        </div>

        {groups.length === 0 ? (
          <EmptyState title="Nenhum erro 🎉" text="Quando algo quebrar no servidor, no celular ou na IA, aparece aqui — e você recebe um push no primeiro do dia." />
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((g) => (
              <li key={g.fingerprint}>
                <Card>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={SOURCE_TONE[g.source] ?? "neutral"}>{SOURCE_LABEL[g.source] ?? g.source}</Badge>
                    <span className="tabular font-semibold">{g.count}×</span>
                    {g.userCount > 0 && <span className="text-muted">{g.userCount} usuário(s)</span>}
                    <span className="ml-auto text-faint">último {when(g.lastSeen)}</span>
                  </div>
                  <p className="mt-2 break-words font-medium">{g.message}</p>
                  {g.path && <p className="mt-0.5 break-all text-xs text-muted">{g.path}</p>}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted hover:text-fg">Detalhes</summary>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
                      <span>primeiro {when(g.firstSeen)}</span>
                      {g.sample.digest && <span>digest {g.sample.digest}</span>}
                      {g.sample.userAgent && <span className="break-all">{g.sample.userAgent}</span>}
                    </div>
                    {g.sample.stack && (
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-surface-2 p-2 text-[11px] leading-snug text-muted">{g.sample.stack}</pre>
                    )}
                  </details>
                  <div className="mt-2 flex justify-end">
                    <ClearErrorsButton fingerprint={g.fingerprint} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
