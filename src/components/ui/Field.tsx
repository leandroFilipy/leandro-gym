"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

const control =
  "w-full rounded-xl border border-line bg-bg/60 px-3 h-11 text-fg placeholder:text-faint outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10";

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-muted">
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </span>
  );
}

export function Field({ label, hint, className, ...props }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <Label hint={hint}>{label}</Label>
      <input className={control} {...props} />
    </label>
  );
}

export function SelectField({ label, className, children, ...props }: ComponentProps<"select"> & { label: string }) {
  return (
    <label className={cn("block", className)}>
      <Label>{label}</Label>
      <select className={control} {...props}>
        {children}
      </select>
    </label>
  );
}

export function TextArea({ label, className, ...props }: ComponentProps<"textarea"> & { label: string }) {
  return (
    <label className={cn("block", className)}>
      <Label>{label}</Label>
      <textarea className={cn(control, "h-auto min-h-20 py-2")} {...props} />
    </label>
  );
}

export function Toggle({ label, description, ...props }: ComponentProps<"input"> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-surface-2 border border-line transition peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:size-5.5 after:rounded-full after:bg-fg after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-accent-fg" />
    </label>
  );
}

export function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? "Salvando…" : children}
    </Button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p>;
}
