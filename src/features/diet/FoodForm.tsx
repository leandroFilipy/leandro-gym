"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, FormError, SelectField, SubmitButton } from "@/components/ui/Field";
import { createFoodAction, updateFoodAction } from "@/server/actions/diet";
import { FoodPhotoField } from "./FoodPhotoField";
import type { FoodOption } from "./types";

interface Props {
  food?: FoodOption;
  defaultBarcode?: string;
  onDone?: () => void;
}

export function FoodForm({ food, defaultBarcode, onDone }: Props) {
  const [state, action] = useActionState(food ? updateFoodAction.bind(null, food.id) : createFoodAction, null);
  // Ref: chama onDone uma vez por envio, mesmo que o pai passe uma função nova a cada render.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (state?.ok) onDoneRef.current?.();
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Nome" name="name" defaultValue={food?.name} required autoFocus={!food} placeholder="Ex.: Arroz branco cozido" />
      <FoodPhotoField initialValue={food?.imageUrl} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade de referência" name="servingSize" type="number" step="any" inputMode="decimal" defaultValue={food?.servingSize ?? 100} required />
        <SelectField label="Unidade" name="unit" defaultValue={food?.unit ?? "G"}>
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
        <Field label="Calorias (kcal)" name="kcal" type="number" step="any" inputMode="decimal" defaultValue={food?.kcal} required />
        <Field label="Proteína (g)" name="protein" type="number" step="any" inputMode="decimal" defaultValue={food?.protein} required />
        <Field label="Carboidratos (g)" name="carbs" type="number" step="any" inputMode="decimal" defaultValue={food?.carbs} required />
        <Field label="Gorduras (g)" name="fat" type="number" step="any" inputMode="decimal" defaultValue={food?.fat} required />
      </div>
      <Field
        label="Código de barras"
        hint="opcional"
        name="barcode"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={food?.barcode ?? defaultBarcode ?? ""}
        placeholder="Para achar o produto lendo a embalagem"
      />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton size="lg" block>
        {food ? "Salvar" : "Cadastrar alimento"}
      </SubmitButton>
    </form>
  );
}
