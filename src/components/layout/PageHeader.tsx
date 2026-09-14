import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-start gap-3 border-b border-line/60 pb-4">
      {back && (
        <Link href={back} className="-ml-2 mt-0.5 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Voltar">
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" /> Interface
        </div>
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}
