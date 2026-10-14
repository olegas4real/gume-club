import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse, detectar } from "@/lib/import/parse";

/**
 * O que vem do Openreads e do BookWyrm, medido. Formatos copiados da documentação do
 * Openreads (doc/csv.md) e do código do BookWyrm (views/preferences/export.py), com
 * livros fictícios. Ver lib/import/fixtures/LEIA-ME.md.
 */
const arquivo = (n: string) => readFileSync(`lib/import/fixtures/${n}`, "utf8");
const openreads = parse(arquivo("openreads.csv"));
const bookwyrm = parse(arquivo("bookwyrm.csv"));
const por = (ls: ReturnType<typeof parse>, t: string) => ls.find((l) => l.titulo.startsWith(t))!;

describe("o arquivo do Openreads", () => {
  it("é reconhecido, e o livro que a pessoa apagou lá não entra aqui", () => {
    expect(detectar(arquivo("openreads.csv"))).toBe("openreads");
    expect(openreads.map((l) => l.titulo)).not.toContain("Livro Fictício Apagado");
    expect(openreads).toHaveLength(4);
  });

  it("entende os quatro status", () => {
    expect(por(openreads, "Livro Fictício Um").status).toBe("read");
    expect(por(openreads, "Livro Fictício Dois").status).toBe("reading");
    expect(por(openreads, "Livro Fictício Três").status).toBe("want_to_read");
    expect(por(openreads, "Livro Fictício Quatro").status).toBe("did_not_finish");
  });

  it("traz as DUAS leituras, com as datas", () => {
    expect(por(openreads, "Livro Fictício Um").leituras).toEqual([
      { comecou: "2024-01-02", terminou: "2024-02-10", abandonou: null },
      { comecou: "2025-03-01", terminou: "2025-03-20", abandonou: null },
    ]);
  });

  it("quem está lendo traz o dia em que começou", () => {
    expect(por(openreads, "Livro Fictício Dois").leituras).toEqual([
      { comecou: "2025-06-01", terminou: null, abandonou: null },
    ]);
  });

  it("separa as etiquetas, e traz o formato, a nota, a resenha e a nota privada", () => {
    const l = por(openreads, "Livro Fictício Um");
    expect(l.prateleiras).toEqual(["fantasia", "favoritos"]);
    expect(l.formato).toBe("hardcover");
    expect(l.estrelas).toBe(4.5);
    expect(l.resenha).toBe("Bom demais.");
    expect(l.notaPrivada).toBe("nota minha");
    expect(l.isbn13).toBe("9780000000002");
  });
});

describe("o arquivo do BookWyrm", () => {
  it("é reconhecido, e traz os cinco livros com autor", () => {
    expect(detectar(arquivo("bookwyrm.csv"))).toBe("bookwyrm");
    expect(bookwyrm).toHaveLength(5);
    expect(por(bookwyrm, "Fixture BW Lido").autor).toBe("Autora Fictícia");
  });

  it("entende as estantes de leitura, inclusive 'parei de ler'", () => {
    expect(por(bookwyrm, "Fixture BW Lido").status).toBe("read");
    expect(por(bookwyrm, "Fixture BW Lendo").status).toBe("reading");
    expect(por(bookwyrm, "Fixture BW Quero").status).toBe("want_to_read");
    expect(por(bookwyrm, "Fixture BW Parei").status).toBe("did_not_finish");
  });

  it("traz as datas de começar, terminar e parar", () => {
    expect(por(bookwyrm, "Fixture BW Lido").leituras).toEqual([{ comecou: "2024-01-02", terminou: "2024-02-10", abandonou: null }]);
    expect(por(bookwyrm, "Fixture BW Lendo").leituras).toEqual([{ comecou: "2025-06-01", terminou: null, abandonou: null }]);
    expect(por(bookwyrm, "Fixture BW Parei").leituras).toEqual([{ comecou: "2024-06-01", terminou: null, abandonou: "2024-07-01" }]);
  });

  it("traz a resenha limpa e a nota", () => {
    expect(por(bookwyrm, "Fixture BW Lido").resenha).toBe("Gostei muito.");
    expect(por(bookwyrm, "Fixture BW Lido").estrelas).toBe(4);
    expect(por(bookwyrm, "Fixture BW Lido").isbn13).toBe("9780000000002");
  });

  it("uma estante que a pessoa criou vira prateleira, pelo nome, e não status", () => {
    const l = por(bookwyrm, "Fixture BW Estante Minha");
    expect(l.status).toBe("want_to_read");
    expect(l.prateleiras).toEqual(["Ficção científica"]);
  });
});
