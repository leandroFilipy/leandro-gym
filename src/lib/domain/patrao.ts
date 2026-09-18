// "Patrão": textos das notificações no tom escolhido (Manso, Sem dó, Carrasco).
// Escolha determinística por usuário + dia + cenário (varia todo dia, não repete no mesmo dia).

import { CARRASCO_MESSAGES, SEM_DO_MESSAGES } from "./patrao-messages";

export type PatraoTone = "MANSO" | "SEM_DO" | "CARRASCO";
export type PatraoScenario = "missed" | "atRisk" | "demoted" | "protein" | "meal" | "water" | "plateau" | "praise" | "comeback";
export type PatraoVars = Partial<Record<"nome" | "patente" | "patente_abaixo" | "faltam" | "treino" | "exercicio" | "carga" | "proteina" | "falta_proteina" | "agua" | "meta_agua" | "refeicao" | "dias" | "hora", string>>;

const MANSO: Record<PatraoScenario, readonly string[]> = {
  missed: [
    "Hoje era dia de {treino} e ficou sem treino. Amanhã é uma nova chance.",
    "O {treino} de hoje ficou pra trás. Se der, faz amanhã: dá pra trocar o dia no app.",
    "Sem treino hoje. Tudo bem, só não deixa virar sequência.",
  ],
  atRisk: ["Faltam {faltam} treinos pra manter a patente {patente} nesta semana."],
  demoted: ["Você desceu para {patente_abaixo}. Duas semanas batendo a meta e volta."],
  protein: [
    "Você está em {proteina} g de proteína. Faltam {falta_proteina} g pra meta de hoje.",
    "Faltam {falta_proteina} g de proteína. Um iogurte, ovos ou um shake resolvem.",
  ],
  meal: ["Registrou o {refeicao}? Leva 30 segundos: foto do prato, voz ou a favorita.", "O {refeicao} ainda está vazio no diário."],
  water: ["Você está em {agua} de {meta_agua} hoje. Bora beber água?", "Um copo d'água agora ajuda a fechar a meta de {meta_agua}."],
  plateau: ["O {exercicio} está estável em {carga} kg há alguns treinos. Veja as sugestões no app."],
  praise: ["Treino concluído. Bom trabalho!", "Mais um treino na conta. Continue assim!", "Recorde no {exercicio}: {carga} kg. Parabéns!"],
  comeback: ["Bem-vindo de volta! Foram {dias} dias. Vai com calma nas cargas hoje.", "Que bom te ver de novo depois de {dias} dias."],
};

/** O Carrasco não sabe elogiar: usa o elogio do Sem dó. E o Sem dó ganha o "voltou" aqui. */
const SEM_DO_EXTRA: Partial<Record<PatraoScenario, readonly string[]>> = {
  comeback: [
    "Olha quem lembrou que tem academia! {dias} dias sumido, tchê.",
    "{dias} dias de férias do ferro. A barra já tava procurando outro dono.",
    "Voltou! Achei que tinha virado lenda urbana.",
    "{dias} dias sem aparecer. Até o cusco achou que tu tinha se mudado.",
    "Bem-vindo de volta, sumido. As anilhas mandaram abraço. E cobrança.",
    "O filho pródigo voltou. Agora não some de novo, xiru.",
    "{dias} dias de sofá. Hoje o corpo vai reclamar, e com razão.",
    "Apareceu! Pega leve hoje, que tu tá mais enferrujado que porteira velha.",
    "Voltou depois de {dias} dias. Faz valer, porque a preguiça tá de olho.",
    "Retorno confirmado. Duração prevista: vamos ver se passa de duas semanas.",
  ],
};

function messagesFor(tone: PatraoTone, scenario: PatraoScenario): readonly string[] {
  if (tone === "MANSO") return MANSO[scenario];
  const semDo: readonly string[] = (SEM_DO_MESSAGES as Partial<Record<PatraoScenario, readonly string[]>>)[scenario] ?? SEM_DO_EXTRA[scenario] ?? MANSO[scenario];
  if (tone === "SEM_DO") return semDo;
  return (CARRASCO_MESSAGES as Partial<Record<PatraoScenario, readonly string[]>>)[scenario] ?? semDo;
}

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]);
}

/** Troca {variavel} pelos valores. */
export function fillMessage(text: string, vars: PatraoVars): string {
  return text.replace(PLACEHOLDER, (_, key: string) => vars[key as keyof PatraoVars] ?? `{${key}}`);
}

/** Hash simples e estável (FNV-1a) para escolher a frase do dia. */
export function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Frase do cenário no tom escolhido, só entre as que têm todas as variáveis disponíveis
 * (ex.: sem patente ainda, as frases com {patente} ficam de fora). `seed` = usuário + dia.
 */
export function pickMessage(scenario: PatraoScenario, tone: PatraoTone, vars: PatraoVars, seed: string): string {
  const usable = (list: readonly string[]) => list.filter((t) => placeholders(t).every((k) => vars[k as keyof PatraoVars] !== undefined));
  let pool = usable(messagesFor(tone, scenario));
  if (pool.length === 0) pool = usable(MANSO[scenario]);
  if (pool.length === 0) return "";
  return fillMessage(pool[stableHash(`${seed}:${scenario}`) % pool.length], vars);
}

const TITLES: Record<PatraoTone, Record<PatraoScenario, string>> = {
  MANSO: {
    missed: "Treino de hoje ficou pra trás",
    atRisk: "Patente em risco",
    demoted: "Patente rebaixada",
    protein: "Proteína do dia",
    meal: "Registro da refeição",
    water: "Hora da água 💧",
    plateau: "Treino de hoje",
    praise: "Bom treino!",
    comeback: "Bem-vindo de volta",
  },
  SEM_DO: {
    missed: "🐎 Recado do patrão",
    atRisk: "⚠️ Patente balançando",
    demoted: "📉 REBAIXADO",
    protein: "🥩 Cadê a proteína, tchê?",
    meal: "🍽️ Diário vazio",
    water: "💧 Bebe água, vivente",
    plateau: "🧱 Platô, xiru",
    praise: "🐎 Isso é que é bagual!",
    comeback: "👀 Olha quem voltou",
  },
  CARRASCO: {
    missed: "🪓 O Carrasco passou aqui",
    atRisk: "🪓 Última chamada",
    demoted: "🪓 REBAIXADO",
    protein: "🪓 Proteína: reprovado",
    meal: "🪓 Tu comeu escondido",
    water: "🪓 Nem água, né?",
    plateau: "🪓 Estacionado de novo",
    praise: "🐎 Hoje o Carrasco ficou quieto",
    comeback: "🪓 Lembrou que existe?",
  },
};

export function patraoTitle(scenario: PatraoScenario, tone: PatraoTone): string {
  return TITLES[tone][scenario];
}
