import { describe, expect, it } from "vitest";
import { bodyFatCategory, navyBodyFat, navySeries } from "./body-fat";

describe("navyBodyFat", () => {
  it("homem: 178 cm, cintura 85, pescoço 38 ≈ 17%", () => {
    const bf = navyBodyFat({ sex: "MALE", heightCm: 178, waist: 85, neck: 38 })!;
    expect(bf).toBeGreaterThan(15.5);
    expect(bf).toBeLessThan(18.5);
  });

  it("mulher usa quadril: 165 cm, cintura 72, quadril 98, pescoço 33 ≈ 27%", () => {
    const bf = navyBodyFat({ sex: "FEMALE", heightCm: 165, waist: 72, hip: 98, neck: 33 })!;
    expect(bf).toBeGreaterThan(24);
    expect(bf).toBeLessThan(30);
  });

  it("mulher sem quadril não calcula", () => {
    expect(navyBodyFat({ sex: "FEMALE", heightCm: 165, waist: 72, neck: 33 })).toBeNull();
  });

  it("cintura menor que pescoço (erro de digitação) não calcula", () => {
    expect(navyBodyFat({ sex: "MALE", heightCm: 178, waist: 30, neck: 38 })).toBeNull();
  });

  it("menos cintura = menos gordura", () => {
    const a = navyBodyFat({ sex: "MALE", heightCm: 178, waist: 90, neck: 38 })!;
    const b = navyBodyFat({ sex: "MALE", heightCm: 178, waist: 85, neck: 38 })!;
    expect(b).toBeLessThan(a);
  });
});

describe("navySeries", () => {
  it("carrega o último pescoço conhecido para registros só de cintura", () => {
    const s = navySeries(
      [
        { date: "2026-09-01", waist: 90, neck: 38 },
        { date: "2026-09-08", waist: 88 },
        { date: "2026-09-10", hip: 100 }, // homem: quadril não muda o cálculo, mas é um registro
        { date: "2026-09-12" },
      ],
      "MALE",
      178,
    );
    expect(s.map((p) => p.date)).toEqual(["2026-09-01", "2026-09-08", "2026-09-10"]);
    expect(s[1].value).toBeLessThan(s[0].value);
  });
});

describe("bodyFatCategory", () => {
  it("faixas masculinas", () => {
    expect(bodyFatCategory(12, "MALE")).toBe("Atleta");
    expect(bodyFatCategory(20, "MALE")).toBe("Média");
  });
});
