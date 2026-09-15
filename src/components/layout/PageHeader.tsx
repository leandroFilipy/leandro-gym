import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-start gap-3">
      {back && (
        <Link href={back} className="-ml-2 mt-0.5 rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Voltar">
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-4xl font-extrabold uppercase italic leading-none">{title}</h1>
        <div className="mt-2 h-1 w-10 bg-accent" aria-hidden />
        {subtitle && <div className="mt-2 text-sm text-muted">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}
