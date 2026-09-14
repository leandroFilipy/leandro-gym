"use client";

import { useEffect, useSyncExternalStore } from "react";
import { pendingCount, subscribeOutbox, flushOutbox } from "@/lib/offline/outbox";

/** Mantém a tela acesa enquanto o modo academia estiver aberto. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        if (document.visibilityState === "visible" && !cancelled) lock = await navigator.wakeLock.request("screen");
      } catch {
        // bateria fraca / não permitido — ignora
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [enabled]);
}

/** Quantidade de séries aguardando sincronização. */
export function useOutboxPending() {
  useEffect(() => {
    void flushOutbox();
  }, []);
  return useSyncExternalStore(subscribeOutbox, pendingCount, () => 0);
}
