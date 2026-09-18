// Desenho anatômico do mapa muscular (viewBox 200×440, eixo do corpo em x=100).
// Cada forma é da metade esquerda; o componente espelha para a direita.

import type { MuscleGroup } from "@/generated/prisma/enums";

export type MuscleShape = { group: MuscleGroup; d: string };

/** Silhueta (metade esquerda). Aberta no eixo x=100: o contorno não desenha uma linha no meio do corpo. */
export const SILHOUETTE_HALF =
  "M100 6 C88 6 82 16 82 30 C82 42 87 50 90 53 L89 64 Q78 69 66 71 Q51 75 47 92 L43 118 Q40 138 41 160 Q36 188 33 222 Q29 237 32 250 Q37 257 42 250 L43 228 Q48 190 53 164 Q57 142 60 124 L63 150 Q65 172 71 190 Q69 206 71 222 Q67 262 71 300 Q73 312 75 324 Q71 352 77 396 L77 410 Q69 418 71 425 L97 425 L97 400 Q99 360 97 330 L98 300 L100 226";

export const FRONT_MUSCLES: MuscleShape[] = [
  // trapézio (parte de cima, visível de frente)
  { group: "BACK", d: "M91 60 Q81 66 68 71 Q77 75 87 72 Q93 68 95 62 Z" },
  // deltoide
  { group: "SHOULDERS", d: "M66 72 Q52 75 47 91 Q45 105 50 117 Q56 108 62 99 Q68 88 75 78 Q72 74 66 72 Z" },
  // peitoral: clavicular (cima) e esternal (baixo)
  { group: "CHEST", d: "M98 74 Q86 73 75 78 Q68 86 64 96 Q80 91 98 90 Z" },
  { group: "CHEST", d: "M98 93 Q80 94 64 99 Q62 109 66 117 Q80 125 98 121 Z" },
  // bíceps e braquial
  { group: "BICEPS", d: "M51 118 Q42 132 42 150 Q44 160 50 162 Q57 150 59 132 Q59 122 56 116 Z" },
  { group: "BICEPS", d: "M42 146 Q39 156 41 165 L46 164 Q44 156 44 148 Z" },
  // antebraço: braquiorradial e flexores
  { group: "FOREARMS", d: "M44 164 Q36 182 34 205 L37 222 L41 222 Q42 196 47 166 Z" },
  { group: "FOREARMS", d: "M48 166 Q44 196 42 222 L45 222 Q49 196 52 167 Z" },
  // oblíquo externo e serrátil
  { group: "ABS", d: "M85 146 Q78 146 72 152 Q70 172 76 190 L87 197 Q84 178 85 146 Z" },
  { group: "ABS", d: "M68 120 L82 126 L76 131 Z M68 131 L83 136 L77 141 Z M70 141 L84 146 L78 150 Z" },
  // reto abdominal (gomos)
  { group: "ABS", d: "M87 126 Q87 123 90 123 L98 123 L98 139 L87 140 Z" },
  { group: "ABS", d: "M87 143 L98 142 L98 157 L87 158 Z" },
  { group: "ABS", d: "M87 161 L98 160 L98 175 L87 176 Z" },
  { group: "ABS", d: "M87 179 L98 178 L98 207 Q92 205 88 197 Z" },
  // quadríceps: vasto lateral, reto femoral, vasto medial
  { group: "QUADS", d: "M73 207 Q67 241 69 281 Q71 301 77 313 Q80 291 80 262 Q80 232 78 211 Z" },
  { group: "QUADS", d: "M80 213 Q86 208 93 214 Q95 251 91 293 Q86 301 82 295 Q80 262 80 213 Z" },
  { group: "QUADS", d: "M93 270 Q98 281 97 301 Q93 315 84 313 Q89 301 93 270 Z" },
  // perna: tibial anterior e gastrocnêmio (borda interna)
  { group: "CALVES", d: "M77 336 Q73 356 77 388 L82 388 Q82 358 84 336 Z" },
  { group: "CALVES", d: "M90 331 Q97 349 95 373 L89 377 Q86 353 90 331 Z" },
];

export const BACK_MUSCLES: MuscleShape[] = [
  // trapézio
  { group: "BACK", d: "M99 50 L99 133 Q92 119 84 103 Q76 89 66 74 Q82 70 90 62 Q96 56 99 50 Z" },
  // deltoide posterior
  { group: "SHOULDERS", d: "M66 74 Q52 76 47 91 Q45 105 50 117 Q58 105 64 97 Q70 87 72 80 Z" },
  // infraespinhal / redondo
  { group: "BACK", d: "M84 103 Q74 99 68 101 Q64 111 66 121 Q76 119 86 113 Z" },
  // grande dorsal
  { group: "BACK", d: "M86 115 Q74 121 66 123 Q64 141 70 161 Q78 177 92 185 L96 161 Q92 139 86 115 Z" },
  // eretores da espinha
  { group: "BACK", d: "M92 151 L99 141 L99 199 L90 195 Q90 173 92 151 Z" },
  // tríceps: cabeça longa e lateral
  { group: "TRICEPS", d: "M52 118 Q43 132 43 150 Q45 160 50 164 Q57 152 59 132 Q59 122 56 116 Z" },
  { group: "TRICEPS", d: "M49 100 Q44 112 43 128 Q46 122 51 118 Q52 108 51 100 Z" },
  // antebraço: extensores
  { group: "FOREARMS", d: "M44 164 Q36 182 34 205 L37 222 L41 222 Q42 196 47 166 Z" },
  { group: "FOREARMS", d: "M48 166 Q44 196 42 222 L45 222 Q49 196 52 167 Z" },
  // glúteo médio e máximo
  { group: "GLUTES", d: "M73 190 Q71 199 73 207 Q86 201 98 201 L98 192 Q86 189 73 190 Z" },
  { group: "GLUTES", d: "M98 204 Q84 202 73 209 Q67 223 73 239 Q86 247 98 241 Z" },
  // posteriores: bíceps femoral e semitendíneo
  { group: "HAMSTRINGS", d: "M73 245 Q69 273 73 305 L84 307 Q84 277 84 249 Z" },
  { group: "HAMSTRINGS", d: "M86 249 Q86 279 86 307 L94 305 Q98 277 97 247 Z" },
  // panturrilha: gastrocnêmio (2 cabeças) e sóleo
  { group: "CALVES", d: "M77 323 Q71 345 77 369 Q84 374 86 363 Q86 341 86 323 Z" },
  { group: "CALVES", d: "M88 323 Q95 341 95 361 Q93 373 88 369 Q88 345 88 323 Z" },
  { group: "CALVES", d: "M79 372 Q84 382 86 393 L91 393 Q93 381 93 372 Q86 378 79 372 Z" },
];

/** Detalhes sem músculo (clavícula, joelho) para dar leitura de corpo. */
export const FRONT_DETAILS = "M86 70 Q76 72 68 71 M92 318 a6 5 0 1 0 0.1 0";
export const BACK_DETAILS = "M84 318 Q90 322 96 318";
