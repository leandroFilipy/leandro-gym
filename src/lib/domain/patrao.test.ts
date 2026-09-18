import { describe, expect, it } from "vitest";
import { fillMessage, pickMessage, stableHash, type PatraoScenario, type PatraoTone } from "./patrao";
import { CARRASCO_MESSAGES, SEM_DO_MESSAGES } from "./patrao-messages";

const KNOWN = new Set(["nome", "patente", "patente_abaixo", "faltam", "treino", "exercicio", "carga", "proteina", "falta_proteina", "agua", "meta_agua", "refeicao", "dias", "hora"]);
const ALL_VARS = Object.fromEntries([...KNOWN].map((k) => [k, `<${k}>`]));
const SCENARIOS: PatraoScenario[] = ["missed", "atRisk", "demoted", "protein", "meal", "water", "plateau", "praise", "comeback"];
const TONES: PatraoTone[] = ["MANSO", "SEM_DO", "CARRASCO"];

describe("patrão", () => {
  it("todas as frases usam só variáveis conhecidas", () => {
    const all = [...Object.values(SEM_DO_MESSAGES), ...Object.values(CARRASCO_MESSAGES)].flat();
    expect(all.length).toBeGreaterThan(500);
    for (const text of all) for (const m of text.matchAll(/\{(\w+)\}/g)) expect(KNOWN, text).toContain(m[1]);
  });

  it("sempre devolve frase completa para cada tom e cenário", () => {
    for (const tone of TONES)
      for (const scenario of SCENARIOS) {
        const msg = pickMessage(scenario, tone, ALL_VARS, "u1:2026-09-18");
        expect(msg, `${tone}/${scenario}`).not.toBe("");
        expect(msg).not.toMatch(/\{\w+\}/);
      }
  });

  it("sem a variável, a frase que depende dela fica de fora", () => {
    for (let i = 0; i < 40; i++) {
      const msg = pickMessage("missed", "SEM_DO", { treino: "Lower" }, `seed-${i}`);
      expect(msg).not.toMatch(/\{\w+\}/);
    }
  });

  it("é determinística por semente e varia entre dias", () => {
    const a = pickMessage("water", "CARRASCO", ALL_VARS, "u1:2026-09-18");
    expect(pickMessage("water", "CARRASCO", ALL_VARS, "u1:2026-09-18")).toBe(a);
    const days = new Set(Array.from({ length: 10 }, (_, i) => pickMessage("water", "CARRASCO", ALL_VARS, `u1:2026-09-${10 + i}`)));
    expect(days.size).toBeGreaterThan(3);
    expect(stableHash("abc")).toBe(stableHash("abc"));
  });

  it("preenche as variáveis", () => {
    expect(fillMessage("{agua} de {meta_agua}", { agua: "0,5 L", meta_agua: "3 L" })).toBe("0,5 L de 3 L");
  });
});
