"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet no celular, modal centralizado no desktop. */
export function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="pb-safe relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl border border-line bg-surface/95 shadow-2xl md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
