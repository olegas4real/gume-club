import { describe, it, expect } from "vitest";
import { isbnDiverge, isbnRepetido, parecido, type Achado } from "@/lib/import/tipos";

const achado = (o: Partial<Achado>): Achado => ({
  titulo: "",
  autor: null,
  como: "isbn13",
  slug: "x",
  tituloNoCatalogo: null,
  autorNoCatalogo: null,
  coverUrl: null,
  ...o,
});

describe("o ISBN que aponta para outro livro não é 'certo'", () => {
  // Os três da auditoria de 2026-10-10, como a prévia mostrou.
  it.each([
    ["Vidas Secas", "Graciliano Ramos", "Neblina", "Adalgisa Nery"],
    ["Cem Anos de Solidão", "Gabriel García Márquez", "1984", "George Orwell"],
    ["O Estrangeiro", "Albert Camus", "Getúlio", "Lira Neto"],
  ])("%s de %s, casado com %s de %s, desce para confira", (titulo, autor, tituloNoCatalogo, autorNoCatalogo) => {
    expect(isbnDiverge(achado({ titulo, autor, tituloNoCatalogo, autorNoCatalogo }))).toBe(true);
  });

  // O que NÃO pode virar alarme: tradução, subtítulo, nome escrito de outro jeito.
  it.each([
    ["One Hundred Years of Solitude", "Gabriel García Márquez", "Cem Anos de Solidão", "Gabriel García Márquez"],
    ["Crime and Punishment", "Fyodor Dostoyevsky", "Crime e Castigo", "Fiódor Dostoiévski"],
    ["O Senhor dos Anéis", "Tolkien", "O Senhor dos Anéis: A Sociedade do Anel", "J.R.R. Tolkien"],
    ["Dom Casmurro", null, "Dom Casmurro", "Machado de Assis"],
    ["The Stranger", "Albert Camus", "O Estrangeiro", "Albert Camus"],
  ])("%s de %s, casado com %s, continua certo", (titulo, autor, tituloNoCatalogo, autorNoCatalogo) => {
    expect(isbnDiverge(achado({ titulo, autor, tituloNoCatalogo, autorNoCatalogo }))).toBe(false);
  });

  it("palpite por título e livro novo não passam por esta régua", () => {
    expect(isbnDiverge(achado({ como: "titulo", titulo: "A", tituloNoCatalogo: "B" }))).toBe(false);
    expect(isbnDiverge(achado({ como: "novo", titulo: "A" }))).toBe(false);
  });

  it("título só de número compara inteiro", () => {
    expect(parecido("1984", "1984")).toBe(true);
    expect(parecido("1984", "Cem Anos de Solidão")).toBe(false);
  });
});

describe("o mesmo ISBN em duas linhas do arquivo", () => {
  it("marca as duas quando os títulos são outros", () => {
    const linhas = [
      { titulo: "Cem Anos de Solidão", isbn13: "9788535914849", isbn10: null },
      { titulo: "Dom Casmurro", isbn13: "9788535911664", isbn10: null },
      { titulo: "1984", isbn13: "9788535914849", isbn10: null },
    ];
    expect([...isbnRepetido(linhas)].sort()).toEqual([0, 2]);
  });

  it("a mesma linha duas vezes não é conflito: a importação junta", () => {
    const linhas = [
      { titulo: "Dom Casmurro", isbn13: "9788535911664", isbn10: null },
      { titulo: "Dom Casmurro", isbn13: "9788535911664", isbn10: null },
    ];
    expect(isbnRepetido(linhas).size).toBe(0);
  });
});
