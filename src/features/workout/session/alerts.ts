"use client";

// Alertas do fim do descanso: som, vibração e notificação.
// O áudio precisa ser "destravado" por um toque do usuário (primeAudio no CONCLUIR SÉRIE).

let ctx: AudioContext | null = null;

export function primeAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function beep() {
  if (!ctx) return;
  const start = ctx.currentTime;
  [0, 0.25, 0.5].forEach((offset, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.4, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.2);
  });
}

export function vibrate(pattern: number[] = [300, 120, 300]) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

export async function notify(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(title, { body, tag: "rest", icon: "/icons/192" });
  else new Notification(title, { body });
}
