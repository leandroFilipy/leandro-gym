// Resolve URLs REAIS de fotos no Wikimedia Commons para cada alimento do seed e reescreve
// os `imageUrl` do prisma/seed.ts com links que funcionam de verdade (evita os 404 de
// nomes de arquivo chutados). Rode uma vez localmente:  node scripts/resolve-food-images.mjs
//
// Estratégia: para cada alimento, consulta a API do Commons por um termo em inglês e pega a
// primeira imagem (thumb 320px). Faz cache em scripts/food-images.json para não repetir.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = join(__dirname, "..", "prisma", "seed.ts");
const CACHE = join(__dirname, "food-images.json");

// Termo de busca em inglês por alimento (nome exato do seed → query).
const QUERY = {
  "Arroz branco cozido": "cooked white rice bowl",
  "Arroz integral cozido": "cooked brown rice",
  "Feijão carioca cozido": "carioca beans dish",
  "Feijão preto cozido": "cooked black beans",
  "Feijão branco cozido": "white beans dish",
  "Lentilha cozida": "cooked lentils",
  "Grão-de-bico cozido": "cooked chickpeas",
  "Ovo de galinha cozido": "boiled egg",
  "Ovo de galinha frito": "fried egg",
  "Clara de ovo cozida": "egg white",
  "Peito de frango grelhado": "grilled chicken breast",
  "Coxa de frango sem pele cozida": "cooked chicken thigh",
  "Filé de frango à milanesa": "chicken schnitzel",
  "Patinho sem gordura grelhado": "grilled beef steak",
  "Carne moída (acém) refogada": "ground beef cooked",
  "Músculo bovino refogado na panela": "beef stew meat",
  "Alcatra sem gordura grelhada": "sirloin steak grilled",
  "Contrafilé com gordura grelhado": "striploin steak grilled",
  "Contrafilé sem gordura grelhado": "striploin steak",
  "Coxão mole sem gordura cozido": "beef topside cooked",
  "Coxão duro sem gordura cozido": "beef silverside cooked",
  "Maminha grelhada": "tri tip steak grilled",
  "Picanha com gordura grelhada": "picanha grilled",
  "Picanha sem gordura grelhada": "picanha steak",
  "Costela bovina assada": "roasted beef ribs",
  "Lombo suíno assado": "roasted pork loin",
  "Bisteca suína grelhada": "grilled pork chop",
  "Tilápia grelhada": "grilled tilapia fish",
  "Salmão grelhado": "grilled salmon fillet",
  "Atum em lata em água": "canned tuna",
  "Sardinha em lata em óleo": "canned sardines",
  "Macarrão cozido sem óleo": "cooked spaghetti pasta",
  "Macarrão integral cozido": "whole wheat pasta",
  "Macarrão com ovos cozido": "egg noodles cooked",
  "Banana prata": "banana fruit",
  "Banana nanica": "banana bunch",
  "Banana da terra": "plantain fruit",
  "Maçã": "red apple fruit",
  "Laranja pera": "orange fruit slices",
  "Mamão formosa": "papaya fruit",
  "Morango": "strawberries fruit",
  "Abacate": "avocado fruit",
  "Leite integral": "glass of milk",
  "Leite semidesnatado": "glass of milk",
  "Leite desnatado": "glass of skim milk",
  "Leite integral sem lactose": "glass of milk",
  "Iogurte natural": "plain yogurt bowl",
  "Iogurte grego natural": "greek yogurt",
  "Queijo minas frescal": "fresh white cheese",
  "Queijo mussarela": "mozzarella cheese",
  "Requeijão cremoso": "cream cheese spread",
  "Aveia em flocos": "rolled oats",
  "Tapioca (goma hidratada)": "tapioca crepe",
  "Cuscuz de milho cozido": "cornmeal couscous brazilian",
  "Whey protein concentrado (genérico)": "whey protein powder scoop",
  "Whey protein isolado (genérico)": "whey protein powder",
  "Whey Growth concentrado 80% natural": "whey protein powder scoop",
  "Creatina monohidratada": "creatine monohydrate powder",
  "Pão francês": "brazilian french bread rolls",
  "Pão de forma integral": "whole wheat sliced bread",
  "Pão fatiado caseiro": "homemade sliced bread loaf",
  "Tapioca com queijo": "tapioca crepe cheese",
  "Batata-doce cozida": "cooked sweet potato",
  "Batata inglesa cozida": "boiled potatoes",
  "Mandioca cozida": "boiled cassava",
  "Brócolis cozido": "cooked broccoli",
  "Alface crespa": "green leaf lettuce",
  "Alface americana": "iceberg lettuce",
  "Tomate cru": "fresh tomato",
  "Cenoura crua": "fresh carrots",
  "Pepino cru": "cucumber vegetable",
  "Cebola crua": "onion vegetable",
  "Espinafre refogado": "cooked spinach",
  "Amendoim torrado": "roasted peanuts",
  "Pasta de amendoim integral": "peanut butter jar",
  "Castanha-do-pará": "brazil nuts",
  "Azeite de oliva extravirgem": "olive oil bottle",
  "Coxa de frango com pele assada": "roasted chicken thigh",
  "Coxa de frango sem pele grelhada": "grilled chicken thigh",
  "Sobrecoxa de frango com pele assada": "roasted chicken leg",
  "Sobrecoxa de frango sem pele cozida": "cooked chicken thigh meat",
  "Asa de frango assada": "roasted chicken wings",
  "Peito de frango cozido desfiado": "shredded chicken breast",
  "Coração de frango grelhado": "grilled chicken hearts",
  "Fígado de frango cozido": "cooked chicken liver",
  "Acém bovino assado": "roast beef chuck",
  "Acém bovino cozido": "beef chuck stew",
  "Fraldinha grelhada": "flank steak grilled",
  "Cupim assado": "beef hump roasted",
  "Bife de patinho frito no óleo": "fried beef steak",
  "Bife acebolado (contrafilé)": "steak with onions",
  "Costela bovina no bafo": "beef short ribs",
  "Carne moída refogada com óleo": "ground beef cooked",
  "Língua bovina cozida": "cooked beef tongue",
  "Fígado bovino grelhado": "grilled beef liver",
  "Fígado bovino frito com óleo": "fried beef liver",
  "Coração bovino grelhado": "grilled beef heart",
  "Costela suína assada": "roasted pork ribs",
  "Pernil suíno assado": "roasted pork leg",
  "Bisteca suína frita com óleo": "fried pork chop",
  "Lombo suíno grelhado sem gordura": "grilled pork loin",
  "Panceta suína frita": "fried pork belly",
  "Linguiça suína grelhada": "grilled pork sausage",
  "Fígado suíno grelhado": "grilled pork liver",
};

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

async function resolve(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
    "&gsrsearch=" + encodeURIComponent(query) +
    "&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json";
  const res = await fetch(url, { headers: { "User-Agent": "leandro-gym-seed/1.0 (contato@leandrogym.app)" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0];
  const thumb = first?.imageinfo?.[0]?.thumburl;
  return thumb ? thumb.split("?")[0] : null; // remove querystring de tracking
}

const names = Object.keys(QUERY);
let ok = 0;
for (const name of names) {
  if (cache[name]) { ok++; continue; }
  try {
    const u = await resolve(QUERY[name]);
    if (u) { cache[name] = u; ok++; console.log("✔", name); }
    else console.warn("∅ sem imagem:", name);
  } catch (e) {
    console.warn("✗", name, String(e.message ?? e));
  }
  await new Promise((r) => setTimeout(r, 200)); // gentil com a API
}
writeFileSync(CACHE, JSON.stringify(cache, null, 2));
console.log(`\nResolvidos ${ok}/${names.length}. Cache em ${CACHE}`);

// Reescreve o seed: troca img("...") por URL literal quando houver no cache.
let seed = readFileSync(SEED, "utf8");
let replaced = 0;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const [name, urlValue] of Object.entries(cache)) {
  // encontra a linha do alimento e substitui o valor de imageUrl (img("...") ou string literal)
  const re = new RegExp(`(\\{ name: "${escapeRe(name)}",[^\\n]*?imageUrl: )(img\\([^)]*\\)|"[^"]*")`);
  if (re.test(seed)) {
    seed = seed.replace(re, `$1${JSON.stringify(urlValue)}`);
    replaced++;
  } else {
    console.warn("regex não casou:", name);
  }
}
writeFileSync(SEED, seed);
console.log(`Seed atualizado: ${replaced} imageUrl reescritos.`);
