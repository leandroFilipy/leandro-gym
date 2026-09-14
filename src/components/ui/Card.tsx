import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line/80 bg-surface/85 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.025)] backdrop-blur-sm", className)} {...props} />;
}

export function CardHeader({ title, action, href }: { title: string; action?: ReactNode; href?: string }) {
  const label = <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{title}</h2>;
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      {href ? (
        <Link href={href} className="flex items-center gap-1 hover:text-fg">
          {label}
          <ChevronRight className="size-3.5 text-faint" />
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
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular truncate text-2xl font-semibold tracking-tight">{value}</div>
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
  return <span className={cn("inline-flex items-center gap-1 rounded-md border border-current/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide", tones[tone], className)} {...props} />;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
