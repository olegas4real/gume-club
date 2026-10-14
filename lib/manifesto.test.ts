import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import manifest from "@/app/manifest";

/**
 * O manifesto do app, nas promessas que o empacotamento Android depende (TWA, ver
 * docs/android.md) e que a web instalável também usa. Ver app/manifest.ts.
 */
const m = manifest();

describe("o manifesto do app", () => {
  it("tem identidade fixa: id, scope e start_url", () => {
    expect(m.id).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.lang).toBe("pt-BR");
  });

  it("não trava a orientação: leitor de tablet deitado é legítimo", () => {
    expect(m.orientation).toBeUndefined();
  });

  it("tem o ícone maskable de 512, além dos dois de sempre", () => {
    const maskable = m.icons?.find((i) => i.purpose === "maskable");
    expect(maskable?.src).toBe("/icon-maskable-512.png");
    expect(maskable?.sizes).toBe("512x512");
    expect(m.icons?.filter((i) => i.purpose === "any")).toHaveLength(2);
  });

  it("o maskable existe no disco e nasce em scripts/brand.mjs, nunca à mão", () => {
    expect(existsSync("public/icon-maskable-512.png")).toBe(true);
    expect(readFileSync("scripts/brand.mjs", "utf8")).toContain("icon-maskable-512");
  });
});
