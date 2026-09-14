import { cn } from "@/lib/cn";

/** Bloco de carregamento com leve pulsar, no tom das superfícies do app. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-2/70", className)} />;
}

/** Cabeçalho de página em estado de carregamento (mesma altura do PageHeader real). */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 border-b border-line/60 pb-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-accent/40" />
        <Skeleton className="h-2.5 w-20 rounded" />
      </div>
      <Skeleton className="h-8 w-40 rounded-lg" />
    </div>
  );
}
