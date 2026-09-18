// Uso: node scripts/gen-patrao-messages.mjs docs/NOTIFICACOES.md src/lib/domain/patrao-messages.ts
import { readFileSync, writeFileSync } from "node:fs";

const [, , docPath, outPath] = process.argv;
const doc = readFileSync(docPath, "utf8").replace(/\r\n/g, "\n");
const carrascoAt = doc.indexOf("# Nível CARRASCO");
const semDoText = doc.slice(0, carrascoAt);
const carrascoText = doc.slice(carrascoAt);

const SEM_DO_KEYS = { 1: "missed", 2: "atRisk", 3: "demoted", 4: "protein", 5: "meal", 6: "water", 7: "plateau", 8: "praise" };
const CARRASCO_KEYS = { C1: "missed", C2: "atRisk", C3: "demoted", C4: "protein", C5: "meal", C6: "water", C7: "plateau", C8: "comeback" };

function parse(text, keys, prefix) {
  const out = {};
  const re = new RegExp(`^## (${prefix}\\d+)\\. .*$`, "gm");
  const heads = [...text.matchAll(re)];
  heads.forEach((h, i) => {
    const body = text.slice(h.index + h[0].length, heads[i + 1]?.index ?? text.length);
    const lines = [...body.matchAll(/^\d+\. (.+)$/gm)].map((m) => m[1].trim());
    out[keys[h[1]]] = lines;
  });
  return out;
}

const semDo = parse(semDoText, SEM_DO_KEYS, "");
const carrasco = parse(carrascoText, CARRASCO_KEYS, "C");
const fmt = (obj) =>
  "{\n" +
  Object.entries(obj)
    .map(([k, list]) => `  ${k}: [\n${list.map((s) => `    ${JSON.stringify(s)},`).join("\n")}\n  ],`)
    .join("\n") +
  "\n}";

const counts = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length]));
console.log("semDo", counts(semDo));
console.log("carrasco", counts(carrasco));

writeFileSync(
  outPath,
  `// GERADO a partir de docs/NOTIFICACOES.md — edite o documento e gere de novo.
// Frases dos tons "Sem dó" e "Carrasco". O tom "Manso" e os complementos ficam em patrao.ts.

export const SEM_DO_MESSAGES = ${fmt(semDo)} as const;

export const CARRASCO_MESSAGES = ${fmt(carrasco)} as const;
`,
);
