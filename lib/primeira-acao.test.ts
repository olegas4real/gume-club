import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A home de quem acabou de criar a conta leva direto à primeira ação, e não a uma
 * estante vazia. Ver o bloco "O BOTÃO VAI PARA ONDE HÁ O QUE FAZER" em app/page.tsx.
 */
const home = readFileSync("app/page.tsx", "utf8");
const bloco = home.slice(home.indexOf("O BOTÃO VAI PARA ONDE HÁ O QUE FAZER"), home.indexOf("o ano, em números largos"));

describe("a primeira ação na home vazia", () => {
  it("estante vazia oferece importar, antes de buscar", () => {
    const importar = bloco.indexOf('href="/importar"');
    const buscar = bloco.indexOf('href="/buscar"');
    expect(importar).toBeGreaterThan(-1);
    expect(buscar).toBeGreaterThan(importar);
  });

  it("'Escolher um livro' só aparece quando há livro esperando", () => {
    const escolher = bloco.lastIndexOf("Escolher um livro");
    const condicao = bloco.lastIndexOf("counts.esperando", escolher);
    expect(escolher).toBeGreaterThan(-1);
    expect(condicao).toBeGreaterThan(-1);
  });
});
