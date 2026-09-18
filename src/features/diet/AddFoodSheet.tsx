"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, ChevronLeft, ImageIcon, Mic, ScanBarcode, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Stepper } from "@/components/ui/Stepper";
import { cn } from "@/lib/cn";
import type { FoodPrefill } from "@/lib/domain/barcode";
import { scaleMacros } from "@/lib/domain/nutrition";
import { foodMatches } from "@/lib/domain/food-search";
import { decimalsForMeasure, measuresFor, stepForMeasure, toBaseQuantity, type Measure } from "@/lib/domain/units";
import { fmtNumber } from "@/lib/format";
import { MEAL_LABEL, UNIT_LABEL } from "@/lib/labels";
import { addFoodToMealAction, applyFavoriteAction, lookupBarcodeAction } from "@/server/actions/diet";
import type { MealType } from "@/generated/prisma/enums";
import { BarcodeScanner } from "./BarcodeScanner";
import { FoodForm } from "./FoodForm";
import { MacroLine } from "./MacroLine";
import { PlatePhoto } from "./PlatePhoto";
import { VoiceMeal } from "./VoiceMeal";
import type { FavoriteOption, FoodOption } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  mealType: MealType;
  foods: FoodOption[];
  frequentIds: string[];
  favorites: FavoriteOption[];
}

export function AddFoodSheet({ open, onClose, date, mealType, foods, frequentIds, favorites }: Props) {
  const [tab, setTab] = useState<"foods" | "favorites">("foods");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<FoodOption | null>(null);
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Leitor de código de barras: desligado, câmera aberta ou produto não encontrado (cadastro).
  const [scan, setScan] = useState<
    { mode: "off" } | { mode: "camera" } | { mode: "photo" } | { mode: "voice" } | { mode: "not_found"; barcode: string; prefill: FoodPrefill | null }
  >({ mode: "off" });
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();

  // Medidas disponíveis para o alimento (unidade base + compatíveis + caseiras).
  const measures = useMemo(() => (selected ? measuresFor(selected) : []), [selected]);
  // Quantidade convertida para a unidade base do alimento (para macros e para o servidor).
  const baseQuantity = selected && measure ? toBaseQuantity(quantity, measure) : 0;

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term) return foods.filter((f) => foodMatches(f.name, term)).slice(0, 40);
    const frequent = frequentIds.map((id) => foods.find((f) => f.id === id)).filter((f): f is FoodOption => Boolean(f));
    return [...frequent, ...foods.filter((f) => !frequentIds.includes(f.id))];
  }, [foods, frequentIds, q]);

  const close = () => {
    setSelected(null);
    setMeasure(null);
    setQ("");
    setError(null);
    setScan({ mode: "off" });
    setScanNote(null);
    onClose();
  };

  const lookup = (barcode: string) =>
    startLookup(async () => {
      setError(null);
      const r = await lookupBarcodeAction(barcode);
      if (!r.ok) return setError(r.error);
      if (r.data.status === "not_found") return setScan({ mode: "not_found", barcode: r.data.barcode, prefill: r.data.prefill });
      setScan({ mode: "off" });
      setScanNote(r.data.created ? "Produto importado do Open Food Facts. Confira os valores com o rótulo." : null);
      pick(r.data.food);
    });

  const pick = (f: FoodOption) => {
    const ms = measuresFor(f);
    const baseMeasure = ms[0]; // primeira = unidade base
    setSelected(f);
    setMeasure(baseMeasure);
    setQuantity(f.servingSize); // servingSize está na unidade base (fator 1)
  };

  // Troca a medida preservando a quantidade equivalente na unidade base.
  const changeMeasure = (next: Measure) => {
    if (!measure) return;
    const base = toBaseQuantity(quantity, measure);
    const nextQty = next.toBase > 0 ? base / next.toBase : 0;
    setQuantity(Number(nextQty.toFixed(decimalsForMeasure(next))));
    setMeasure(next);
  };

  const add = () =>
    selected &&
    start(async () => {
      const r = await addFoodToMealAction({ date, mealType, foodId: selected.id, quantity: baseQuantity });
      if (!r.ok) return setError(r.error);
      close();
    });

  const applyFav = (id: string) =>
    start(async () => {
      const r = await applyFavoriteAction(id, date, mealType);
      if (!r.ok) return setError(r.error);
      close();
    });

  return (
    <Sheet open={open} onClose={close} title={`Adicionar · ${MEAL_LABEL[mealType]}`}>
      {selected ? (
        <div className="flex flex-col gap-4">
          <button type="button" onClick={() => { setSelected(null); setScanNote(null); }} className="flex items-center gap-1 self-start text-sm text-muted">
            <ChevronLeft className="size-4" /> Voltar
          </button>
          <div>
            <div className="text-xl font-bold">{selected.name}</div>
            <div className="text-xs text-muted">
              Referência: {fmtNumber(selected.servingSize)}
              {UNIT_LABEL[selected.unit]} = {fmtNumber(selected.kcal)} kcal
            </div>
          </div>
          {scanNote && <p className="rounded-md border-l-4 border-accent bg-accent/10 px-3 py-2 text-xs text-muted">{scanNote}</p>}
          {measures.length > 1 && measure && (
            <div>
              <div className="mb-1 text-center font-display text-xs font-bold uppercase tracking-[0.16em] text-muted">Medida</div>
              <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
                {measures.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => changeMeasure(m)}
                    className={cn("h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm", m.id === measure.id ? "bg-surface font-semibold" : "text-muted")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {measure && (
            <Stepper
              label="Quantidade"
              unit={measure.label}
              value={quantity}
              step={stepForMeasure(measure, selected.servingSize)}
              min={0}
              decimals={decimalsForMeasure(measure)}
              onChange={setQuantity}
            />
          )}
          <div className="rounded-2xl bg-surface-2 p-3 text-center">
            <MacroLine m={scaleMacros(selected, baseQuantity)} className="text-sm" />
            {measure && !measure.id.startsWith("u:") && baseQuantity > 0 && (
              <div className="mt-1 text-xs text-faint">≈ {fmtNumber(Math.round(baseQuantity))} {UNIT_LABEL[selected.unit]}</div>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button size="lg" block disabled={pending || baseQuantity <= 0} onClick={add}>
            {pending ? "Adicionando…" : "Adicionar"}
          </Button>
        </div>
      ) : scan.mode === "camera" ? (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setScan({ mode: "off" })} className="flex items-center gap-1 self-start text-sm text-muted">
            <ChevronLeft className="size-4" /> Voltar
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
          <BarcodeScanner onDetected={lookup} busy={lookingUp} />
        </div>
      ) : scan.mode === "photo" ? (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setScan({ mode: "off" })} className="flex items-center gap-1 self-start text-sm text-muted">
            <ChevronLeft className="size-4" /> Voltar
          </button>
          <PlatePhoto date={date} mealType={mealType} onDone={close} />
        </div>
      ) : scan.mode === "voice" ? (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setScan({ mode: "off" })} className="flex items-center gap-1 self-start text-sm text-muted">
            <ChevronLeft className="size-4" /> Voltar
          </button>
          <VoiceMeal date={date} mealType={mealType} onDone={close} />
        </div>
      ) : scan.mode === "not_found" ? (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setScan({ mode: "camera" })} className="flex items-center gap-1 self-start text-sm text-muted">
            <ChevronLeft className="size-4" /> Ler outro código
          </button>
          <p className="rounded-md border-l-4 border-warn bg-warn/10 px-3 py-2 text-sm text-muted">
            {scan.prefill?.name ? (
              <>Achei <span className="text-fg">{scan.prefill.name}</span>, mas sem tabela nutricional.</>
            ) : (
              <>Código <span className="tabular text-fg">{scan.barcode}</span> não está na base.</>
            )}{" "}
            Tire uma foto da tabela nutricional ou preencha com os dados do rótulo — na próxima leitura ele aparece direto.
          </p>
          <FoodForm key={scan.barcode} defaultBarcode={scan.barcode} prefill={scan.prefill} onDone={() => lookup(scan.barcode)} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {(["foods", "favorites"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("h-9 rounded-lg text-sm", tab === t ? "bg-surface font-semibold" : "text-muted")}
              >
                {t === "foods" ? "Alimentos" : `Favoritas (${favorites.length})`}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}

          {tab === "foods" ? (
            <>
              <div className="flex gap-2">
                <input
                  autoFocus
                  placeholder="Buscar alimento…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
                />
                <Button variant="secondary" aria-label="Ler código de barras" onClick={() => { setError(null); setScan({ mode: "camera" }); }}>
                  <ScanBarcode className="size-5" />
                </Button>
                <Button variant="secondary" aria-label="Foto do prato (IA)" onClick={() => { setError(null); setScan({ mode: "photo" }); }}>
                  <Camera className="size-5" />
                </Button>
                <Button variant="secondary" aria-label="Falar a refeição (IA)" onClick={() => { setError(null); setScan({ mode: "voice" }); }}>
                  <Mic className="size-5" />
                </Button>
              </div>
              <ul className="flex flex-col">
                {list.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => pick(f)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 bg-cover bg-center text-faint"
                        style={f.imageUrl ? { backgroundImage: `url(${JSON.stringify(f.imageUrl)})` } : undefined}
                      >
                        {!f.imageUrl && <ImageIcon className="size-3.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 truncate font-medium">
                          {frequentIds.includes(f.id) && !q && <Star className="size-3 fill-warn text-warn" />}
                          {f.name}
                        </span>
                        <span className="text-xs text-muted">
                          {fmtNumber(f.servingSize)}
                          {UNIT_LABEL[f.unit]} · P {fmtNumber(f.protein)}g
                        </span>
                      </span>
                      <span className="tabular ml-auto shrink-0 text-sm text-muted">{fmtNumber(f.kcal)} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
              {list.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">
                  Não encontrado. <Link className="text-accent" href="/dieta/alimentos">Cadastrar alimento</Link>
                </p>
              )}
            </>
          ) : favorites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhuma favorita. Monte uma refeição e toque em ☆ para salvá-la.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {favorites.map((f) => (
                <li key={f.id}>
                  <button type="button" disabled={pending} onClick={() => applyFav(f.id)} className="w-full rounded-2xl border border-line p-3 text-left hover:border-accent disabled:opacity-50">
                    <div className="font-semibold">{f.name}</div>
                    <div className="truncate text-xs text-muted">{f.items.map((i) => i.name).join(", ")}</div>
                    <MacroLine m={f.totals} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  );
}
