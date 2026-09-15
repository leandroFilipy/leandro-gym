import { cn } from "@/lib/cn";

/** Bloco de carregamento com leve pulsar, no tom das superfícies do app. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2/70", className)} />;
}

/** Cabeçalho de página em estado de carregamento (mesma altura do PageHeader real). */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-9 w-48 rounded-sm" />
      <div className="mt-2 h-1 w-10 bg-accent/40" />
    </div>
  );
}
