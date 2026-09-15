import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-line bg-surface p-4", className)} {...props} />;
}

export function CardHeader({ title, action, href }: { title: string; action?: ReactNode; href?: string }) {
  const label = (
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted">
      <span className="h-3.5 w-1 bg-accent" aria-hidden />
      {title}
    </h2>
  );
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      {href ? (
        <Link href={href} className="flex items-center gap-1 text-muted hover:text-fg">
          {label}
          <ChevronRight className="size-4 text-faint" />
        </Link>
      ) : (
        label
      )}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="font-display text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="tabular truncate font-display text-3xl font-bold italic leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Badge({ className, tone = "neutral", ...props }: ComponentProps<"span"> & { tone?: "neutral" | "accent" | "success" | "warn" | "danger" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warn: "bg-warn/15 text-warn",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider", tones[tone], className)}
      {...props}
    />
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-xl font-bold uppercase italic">{title}</p>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
