import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * O botão de relatar não flutua no celular: ele cobria a ponta do botão do Google em
 * /entrar. Ver o cabeçalho de components/relatar-problema.tsx.
 */
const fonte = readFileSync("components/relatar-problema.tsx", "utf8");

describe("relatar um problema no celular", () => {
  it("o botão flutuante só existe a partir de sm", () => {
    const flutuantes = [...fonte.matchAll(/className="([^"]*\bfixed\b[^"]*)"/g)]
      .map((m) => m[1]!)
      .filter((c) => !c.includes("inset-0")); // o fundo do diálogo, que cobre tudo de propósito
    expect(flutuantes.length).toBeGreaterThan(0);
    for (const c of flutuantes) {
      expect(c).toMatch(/(^|\s)hidden(\s|$)/);
      expect(c).toMatch(/\bsm:flex\b/);
    }
  });

  it("no celular ele existe, como link no fim da página", () => {
    expect(fonte).toMatch(/sm:hidden[\s\S]{0,400}relatar um problema/);
  });
});
