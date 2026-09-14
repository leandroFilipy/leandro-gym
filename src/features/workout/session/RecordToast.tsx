"use client";

import { useEffect } from "react";
import { fmtSet } from "../format";

export interface RecordToastData {
  exercise: string;
  weight: number;
  repetitions: number;
  previous: { weight: number; repetitions: number } | null;
}

export function RecordToast({ record, onClose }: { record: RecordToastData; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(t);
  }, [record, onClose]);

  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-3xl border border-warn/40 bg-surface p-4 text-left shadow-2xl"
    >
      <div className="text-sm font-bold uppercase tracking-wider text-warn">🔥 Novo recorde</div>
      <div className="mt-1 text-lg font-bold">{record.exercise}</div>
      <div className="tabular text-2xl font-bold">{fmtSet(record)}</div>
      {record.previous && <div className="text-sm text-muted">Recorde anterior: {fmtSet(record.previous)}</div>}
    </button>
  );
}
