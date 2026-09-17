import { describe, expect, it } from "vitest";
import { describeError, errorGroupKey, isIgnorableClientError, normalizePath } from "./error-fingerprint";

describe("errorGroupKey", () => {
  it("agrupa a mesma falha com ids e números diferentes", () => {
    const a = errorGroupKey("server", "Sessão cm1abcdefghijklmnopqrstu não encontrada (404)", "/treino/sessao/cm1abcdefghijklmnopqrstu?x=1");
    const b = errorGroupKey("server", "Sessão cm9zyxwvutsrqponmlkjihgf não encontrada (500)", "/treino/sessao/cm9zyxwvutsrqponmlkjihgf");
    expect(a).toBe(b);
  });

  it("separa origens diferentes", () => {
    expect(errorGroupKey("client", "x", "/")).not.toBe(errorGroupKey("server", "x", "/"));
  });
});

describe("normalizePath", () => {
  it("remove query e troca ids", () => {
    expect(normalizePath("/api/cron/daily-email/13?secret=1")).toBe("/api/cron/daily-email/:id");
    expect(normalizePath(null)).toBe("");
  });
});

describe("describeError", () => {
  it("aceita Error, string e objetos", () => {
    expect(describeError(new Error("falhou")).message).toBe("falhou");
    expect(describeError("texto")).toEqual({ message: "texto", stack: null });
    expect(describeError({ code: 1 }).message).toBe('{"code":1}');
  });
});

describe("isIgnorableClientError", () => {
  it("ignora ruído do navegador e de extensões", () => {
    expect(isIgnorableClientError("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(isIgnorableClientError("Script error.")).toBe(true);
    expect(isIgnorableClientError("Cannot read properties of undefined (reading 'sets')")).toBe(false);
  });
});
