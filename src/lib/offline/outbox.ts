"use client";

// Fila local de escritas de séries. Se a internet cair na academia, a série fica
// guardada no localStorage e é reenviada quando a conexão voltar. O id da série é
// gerado no cliente, então reenviar é seguro (o servidor faz upsert).

export interface SetPayload {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight: number;
  repetitions: number;
  rir: number | null;
}

export interface SetRecordInfo {
  weight: number;
  repetitions: number;
  previous: { weight: number; repetitions: number } | null;
}

type Op = { kind: "upsert"; payload: SetPayload } | { kind: "delete"; id: string };

const KEY = "lg-outbox-v1";
const EVENT = "lg-outbox-change";
let queue: Op[] | null = null;
let flushing = false;

function load(): Op[] {
  if (queue) return queue;
  try {
    queue = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Op[];
  } catch {
    queue = [];
  }
  return queue;
}

function save(q: Op[]) {
  queue = q;
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // armazenamento indisponível: fica só em memória
  }
  window.dispatchEvent(new Event(EVENT));
}

function send(op: Op): Promise<Response> {
  if (op.kind === "upsert") {
    return fetch("/api/sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op.payload) });
  }
  return fetch(`/api/sets?id=${encodeURIComponent(op.id)}`, { method: "DELETE" });
}

/** 2xx ou erro definitivo (4xx exceto 401/408/429) → pode remover da fila. */
function isSettled(res: Response) {
  return res.ok || (res.status >= 400 && res.status < 500 && ![401, 408, 429].includes(res.status));
}

export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    while (load().length > 0) {
      const [op, ...rest] = load();
      try {
        const res = await send(op);
        if (!isSettled(res)) break;
        save(rest);
      } catch {
        break; // sem rede
      }
    }
  } finally {
    flushing = false;
  }
}

/** Envia direto se der; senão enfileira. Mantém a ordem se já houver fila. */
async function submit(op: Op): Promise<Response | null> {
  if (load().length === 0 && navigator.onLine) {
    try {
      const res = await send(op);
      if (isSettled(res)) return res;
    } catch {
      // cai para a fila
    }
  }
  save([...load(), op]);
  void flushOutbox();
  return null;
}

export async function submitSet(payload: SetPayload): Promise<{ record: SetRecordInfo | null } | null> {
  const res = await submit({ kind: "upsert", payload });
  if (!res?.ok) return null;
  return (await res.json()) as { record: SetRecordInfo | null };
}

export async function deleteSet(id: string): Promise<void> {
  await submit({ kind: "delete", id });
}

export function pendingCount(): number {
  return typeof window === "undefined" ? 0 : load().length;
}

export function subscribeOutbox(cb: () => void): () => void {
  const onOnline = () => void flushOutbox();
  window.addEventListener(EVENT, cb);
  window.addEventListener("online", onOnline);
  const timer = window.setInterval(() => load().length && void flushOutbox(), 15_000);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("online", onOnline);
    window.clearInterval(timer);
  };
}
