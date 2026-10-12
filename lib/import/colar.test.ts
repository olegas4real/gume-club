import { describe, it, expect } from "vitest";
import { separar, lerLista } from "@/lib/import/colar";

describe("as formas de uma lista colada", () => {
  it.each([
    ["Dom Casmurro", { titulo: "Dom Casmurro", autor: null, isbn: null }],
    ["Dom Casmurro - Machado de Assis", { titulo: "Dom Casmurro", autor: "Machado de Assis", isbn: null }],
    ["Dom Casmurro — Machado de Assis", { titulo: "Dom Casmurro", autor: "Machado de Assis", isbn: null }],
    ["Dom Casmurro, Machado de Assis", { titulo: "Dom Casmurro", autor: "Machado de Assis", isbn: null }],
    ["Dom Casmurro (Machado de Assis)", { titulo: "Dom Casmurro", autor: "Machado de Assis", isbn: null }],
    ["Dom Casmurro por Machado de Assis", { titulo: "Dom Casmurro", autor: "Machado de Assis", isbn: null }],
    ["978-85-359-1166-4", { titulo: "9788535911664", autor: null, isbn: "9788535911664" }],
    ["Dom Casmurro 9788535911664", { titulo: "Dom Casmurro", autor: null, isbn: "9788535911664" }],
    ["ISBN: 853590277X", { titulo: "853590277X", autor: null, isbn: "853590277X" }],
  ])("%s", (linha, esperado) => {
    expect(separar(linha)).toEqual(esperado);
  });

  it("tira o ruído de quem copia de um site", () => {
    expect(separar("1. Torto Arado - Itamar Vieira Junior")).toEqual({ titulo: "Torto Arado", autor: "Itamar Vieira Junior", isbn: null });
    expect(separar("• A Hora da Estrela")?.titulo).toBe("A Hora da Estrela");
    expect(separar("- Vidas Secas ★★★★★")?.titulo).toBe("Vidas Secas");
    expect(separar("Quarto de Despejo · 200 páginas")?.titulo).toBe("Quarto de Despejo");
  });

  it("não parte um título que tem vírgula dentro", () => {
    expect(separar("Memórias, sonhos, reflexões")).toEqual({ titulo: "Memórias, sonhos, reflexões", autor: null, isbn: null });
  });

  it("linha vazia não vira livro, e o que passa do limite volta contado", () => {
    const { livros, sobra } = lerLista("A\n\n  \nB\nC\nD", "read", { limite: 3, tamanho: 200 });
    expect(livros.map((l) => l.titulo)).toEqual(["A", "B", "C"]);
    expect(livros.every((l) => l.status === "read")).toBe(true);
    expect(sobra).toBe(1);
  });
});
