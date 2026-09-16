"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { fmtFullDate } from "@/lib/format";
import { POSE_LABEL, POSES } from "@/lib/labels";
import type { PhotoPose } from "@/generated/prisma/enums";

interface Props {
  pose: PhotoPose;
  a: string | null;
  b: string | null;
  /** Datas com foto, por pose (mais recentes primeiro). */
  datesByPose: Record<PhotoPose, string[]>;
}

export function PhotoCompareControls({ pose, a, b, datesByPose }: Props) {
  const router = useRouter();
  const go = (next: { pose?: PhotoPose; a?: string; b?: string }) => {
    const params = new URLSearchParams();
    const p = next.pose ?? pose;
    params.set("pose", p);
    // Trocar de pose volta ao padrão (primeira × última daquela pose).
    if (!next.pose) {
      params.set("a", next.a ?? a ?? "");
      params.set("b", next.b ?? b ?? "");
    }
    router.replace(`/progresso/corpo?${params.toString()}#comparar`, { scroll: false });
  };
  const dates = datesByPose[pose];
  const select = "h-10 w-full rounded-md border border-line bg-surface-2 px-2 text-sm outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
        {POSES.map((p) => (
          <button
            key={p}
            type="button"
            disabled={datesByPose[p].length === 0}
            onClick={() => go({ pose: p })}
            className={cn("h-9 rounded-sm text-sm disabled:opacity-40", p === pose ? "bg-surface font-semibold" : "text-muted")}
          >
            {POSE_LABEL[p]} ({datesByPose[p].length})
          </button>
        ))}
      </div>
      {dates.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {(["a", "b"] as const).map((side) => (
            <select key={side} aria-label={side === "a" ? "Antes" : "Depois"} className={select} value={(side === "a" ? a : b) ?? ""} onChange={(e) => go({ [side]: e.target.value })}>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {fmtFullDate(d)}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
    </div>
  );
}
