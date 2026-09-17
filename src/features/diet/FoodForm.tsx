"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Field, FormError, SelectField, SubmitButton } from "@/components/ui/Field";
import type { FoodPrefill } from "@/lib/domain/barcode";
import { createFoodAction, updateFoodAction } from "@/server/actions/diet";
import { FoodPhotoField } from "./FoodPhotoField";
import { LabelReader } from "./LabelReader";
import type { FoodOption } from "./types";

interface Props {
  food?: FoodOption;
  defaultBarcode?: string;
  /** Valores iniciais de um alimento novo (ex.: nome vindo do Open Food Facts). */
  prefill?: FoodPrefill | null;
  onDone?: () => void;
}

export function FoodForm({ food, defaultBarcode, prefill, onDone }: Props) {
  const [state, action] = useActionState(food ? updateFoodAction.bind(null, food.id) : createFoodAction, null);
  // Leitura da tabela por foto: junta os valores e remonta os campos (inputs não controlados).
  const [draft, setDraft] = useState<FoodPrefill>(prefill ?? {});
  const [version, setVersion] = useState(0);
  const [barcode, setBarcode] = useState(food?.barcode ?? defaultBarcode ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const initial = food ?? draft;

  const applyLabel = ({ name, ...values }: FoodPrefill) => {
    const typed = new FormData(formRef.current ?? undefined);
    const text = (key: string) => String(typed.get(key) ?? "").trim();
    // Mantém o que o usuário já digitou de nome, foto e código; a tabela manda nos números.
    setDraft({ ...values, name: text("name") || name || draft.name, imageUrl: text("imageUrl") || draft.imageUrl });
    setBarcode(text("barcode") || barcode);
    setVersion((v) => v + 1);
  };
  // Ref: chama onDone uma vez por envio, mesmo que o pai passe uma função nova a cada render.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (state?.ok) onDoneRef.current?.();
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      {!food && <LabelReader onRead={applyLabel} />}
      <form ref={formRef} key={version} action={action} className="flex flex-col gap-3">
        <Field label="Nome" name="name" defaultValue={initial.name} required autoFocus={!food && version === 0} placeholder="Ex.: Arroz branco cozido" />
        <FoodPhotoField initialValue={initial.imageUrl} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade de referência" name="servingSize" type="number" step="any" inputMode="decimal" defaultValue={initial.servingSize ?? 100} required />
          <SelectField label="Unidade" name="unit" defaultValue={initial.unit ?? "G"}>
            <option value="G">gramas (g)</option>
            <option value="KG">quilogramas (kg)</option>
            <option value="ML">mililitros (ml)</option>
            <option value="L">litros (L)</option>
            <option value="UNIT">unidade (un)</option>
            <option value="PORTION">porção</option>
          </SelectField>
        </div>
        <p className="-mt-1 text-xs text-muted">Valores nutricionais para a quantidade de referência:</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calorias (kcal)" name="kcal" type="number" step="any" inputMode="decimal" defaultValue={initial.kcal} required />
          <Field label="Proteína (g)" name="protein" type="number" step="any" inputMode="decimal" defaultValue={initial.protein} required />
          <Field label="Carboidratos (g)" name="carbs" type="number" step="any" inputMode="decimal" defaultValue={initial.carbs} required />
          <Field label="Gorduras (g)" name="fat" type="number" step="any" inputMode="decimal" defaultValue={initial.fat} required />
        </div>
        <Field
          label="Código de barras"
          hint="opcional"
          name="barcode"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={barcode}
          placeholder="Para achar o produto lendo a embalagem"
        />
        <FormError message={state && !state.ok ? state.error : null} />
        <SubmitButton size="lg" block>
          {food ? "Salvar" : "Cadastrar alimento"}
        </SubmitButton>
      </form>
    </div>
  );
}
