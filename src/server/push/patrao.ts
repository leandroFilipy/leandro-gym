import "server-only";
import { patraoTitle, pickMessage, type PatraoScenario, type PatraoTone, type PatraoVars } from "@/lib/domain/patrao";
import { sendPushToUser } from "./index";

/** Push no tom do usuário. `date` entra na semente: a frase muda a cada dia. */
export function sendPatraoPush(
  userId: string,
  opts: { scenario: PatraoScenario; tone: PatraoTone; vars: PatraoVars; date: string; url: string; tag: string },
) {
  return sendPushToUser(userId, {
    title: patraoTitle(opts.scenario, opts.tone),
    body: pickMessage(opts.scenario, opts.tone, opts.vars, `${userId}:${opts.date}`),
    url: opts.url,
    tag: opts.tag,
  });
}

export const fmtLiters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;
