// Busca "inteligente" de alimentos: além do nome, casa por categoria.
// Ex.: buscar "carne" retorna picanha, alcatra, patinho, costela… mesmo sem a palavra "carne".

/** Palavras-chave adicionais por trecho encontrado no nome do alimento. */
const KEYWORD_RULES: { match: RegExp; add: string[] }[] = [
  // Bovinos
  { match: /picanha|alcatra|patinho|contrafil|coxão|maminha|acém|acem|fraldinha|cupim|músculo|musculo|costela bovina|carne moída|carne moida|língua bovina|lingua bovina|coração bovino|coracao bovino|bife|bovino|filé mignon|file mignon/i, add: ["carne", "carne de boi", "carne bovina", "boi", "bovino", "vaca", "red meat"] },
  { match: /fígado bovino|figado bovino/i, add: ["carne", "boi", "bovino", "fígado", "figado", "miúdo", "miudo"] },
  // Suínos
  { match: /suín|suin|lombo suíno|bisteca|pernil|panceta|linguiça|linguica|costela suína|costela suina|fígado suíno|figado suino/i, add: ["carne", "carne de porco", "porco", "suíno", "suino", "pork"] },
  // Aves / frango
  { match: /frango|galinha|coxa|sobrecoxa|asa de frango|peito de frango|coração de frango|coracao de frango|fígado de frango|figado de frango/i, add: ["carne", "frango", "galinha", "ave", "aves", "chicken", "carne de frango"] },
  // Peixes
  { match: /tilápia|tilapia|salmão|salmao|atum|sardinha|peixe/i, add: ["carne", "peixe", "pescado", "fish", "frutos do mar"] },
  // Ovos
  { match: /ovo|clara de ovo/i, add: ["ovo", "ovos", "egg"] },
  // Genérico: qualquer coisa "grelhada/assada/frita/cozida" de origem animal já pega acima.
];

/**
 * Texto de busca de um alimento: o nome + palavras-chave de categoria.
 * Usado tanto no filtro do cliente quanto na query do servidor.
 */
export function foodSearchText(name: string): string {
  const extra = KEYWORD_RULES.filter((r) => r.match.test(name)).flatMap((r) => r.add);
  return [name, ...extra].join(" ").toLowerCase();
}

/** true se o alimento casa com o termo buscado (por nome ou categoria). */
export function foodMatches(name: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return foodSearchText(name).includes(t);
}
