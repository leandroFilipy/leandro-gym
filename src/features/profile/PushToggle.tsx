"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Field";

type Status = "loading" | "unsupported" | "unconfigured" | "denied" | "on" | "off" | "busy";

/** base64url → Uint8Array (applicationServerKey do pushManager.subscribe). */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      try {
        const res = await fetch("/api/push");
        const data: { configured: boolean } = await res.json();
        if (cancelled) return;
        if (!data.configured) {
          setStatus("unconfigured");
          return;
        }
        if (Notification.permission === "denied") {
          setStatus("denied");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "on" : initialEnabled ? "off" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialEnabled]);

  async function enable() {
    setError(null);
    setStatus("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const keyRes = await fetch("/api/push");
      const { publicKey }: { publicKey: string | null } = await keyRes.json();
      if (!publicKey) {
        setStatus("unconfigured");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("Falha ao registrar no servidor");
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ativar as notificações");
      setStatus("off");
    }
  }

  async function disable() {
    setError(null);
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível desativar");
      setStatus("on");
    }
  }

  if (status === "loading") return <p className="py-2 text-sm text-muted">Verificando suporte…</p>;
  if (status === "unsupported") return <p className="py-2 text-sm text-muted">Este dispositivo/navegador não suporta notificações push. No iPhone, instale o app na tela inicial primeiro.</p>;
  if (status === "unconfigured") return <p className="py-2 text-sm text-muted">As notificações push não estão configuradas no servidor (chaves VAPID).</p>;
  if (status === "denied")
    return <p className="py-2 text-sm text-danger">Permissão de notificações bloqueada. Libere nas configurações do navegador para este site.</p>;

  const checked = status === "on";
  const busy = status === "busy";

  return (
    <div>
      <Toggle
        label="Notificações push no dispositivo"
        description="Lembrete do treino e recordes direto no celular"
        checked={checked}
        disabled={busy}
        onChange={(e) => (e.target.checked ? enable() : disable())}
      />
      {busy && <p className="text-xs text-muted">Processando…</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
