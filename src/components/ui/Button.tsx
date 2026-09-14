import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-[0_0_24px_rgb(85_231_240/0.12)] hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-2/80 text-fg border border-line hover:border-accent/40 hover:bg-line/50",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-sm rounded-xl gap-2",
  lg: "h-14 px-5 text-base rounded-xl gap-2",
  xl: "h-16 px-6 text-lg rounded-xl gap-2 tracking-wide",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function buttonClass({ variant = "primary", size = "md", block }: StyleProps, className?: string) {
  return cn(
    "inline-flex items-center justify-center font-semibold transition duration-200 select-none",
    "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
    variants[variant],
    sizes[size],
    block && "w-full",
    className,
  );
}

export function Button({ variant, size, block, className, type = "button", ...props }: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={buttonClass({ variant, size, block }, className)} {...props} />;
}

export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClass({ variant, size, block }, className)} {...props} />;
}
