import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse, detectar } from "@/lib/import/parse";
import { fromStars } from "@/lib/veredito";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O QUE VEM DO SKOOB, MEDIDO.
 *
 *  O Skoob não tem exportação oficial. Circulam dois formatos, e os dois estão em
 *  lib/import/fixtures/ (ver o LEIA-ME de lá): o do `skoob_downloader` (colunas do
 *  Goodreads, copiadas do código dele) e o de uma extensão que lê a estante na tela
 *  (hipotético: cabeçalho em português, ponto e vírgula, nota com vírgula).
 *
 *  Cada `it` diz o que entra e o que se perde.
 * ════════════════════════════════════════════════════════════════════
 */
const downloader = parse(readFileSync("lib/import/fixtures/skoob-downloader.csv", "utf8"));
const extensao = parse(readFileSync("lib/import/fixtures/skoob-extensao.csv", "utf8"));
const por = (livros: ReturnType<typeof parse>, inicio: string) => livros.find((l) => l.titulo.startsWith(inicio))!;

describe("o arquivo do skoob_downloader", () => {
  it("é lido como Goodreads, e traz os cinco livros", () => {
    expect(detectar(readFileSync("lib/import/fixtures/skoob-downloader.csv", "utf8"))).toBe("goodreads");
    expect(downloader).toHaveLength(5);
  });

  it("traz ISBN, nota, data, resenha e se a pessoa tem o livro", () => {
    const l = por(downloader, "Fixture Um");
    expect(l.isbn13).toBe("9780000000002");
    expect(l.status).toBe("read");
    expect(l.estrelas).toBe(5);
    expect(l.leituras[0]!.terminou).toBe("2024-03-07");
    expect(l.resenha).toContain("resenha de mentira");
    expect(l.possui).toBe(true);
  });

  it("o abandonado volta a ser abandonado, e não 'quero ler'", () => {
    // O downloader escreve abandonado como to-read + a etiqueta "abandoned".
    expect(por(downloader, "Fixture Três").status).toBe("did_not_finish");
    expect(por(downloader, "Fixture Três").prateleiras).not.toContain("abandoned");
  });

  it("o relendo entra como lendo, marcado como releitura", () => {
    const l = por(downloader, "Fixture Quatro");
    expect(l.status).toBe("reading");
    expect(l.relendo).toBe(true);
    expect(l.prateleiras).not.toContain("rereading");
  });

  it("as estantes de verdade (gênero) continuam como prateleira", () => {
    expect(por(downloader, "Fixture Dois").prateleiras).toEqual(["fantasia"]);
  });
});

describe("o arquivo de uma extensão (cabeçalho em português)", () => {
  it("traz os seis livros, sem ISBN, com o separador do Excel em português", () => {
    expect(extensao).toHaveLength(6);
    expect(extensao.every((l) => l.isbn13 === null && l.isbn10 === null)).toBe(true);
    expect(por(extensao, "Fixture A").autor).toBe("Autora Fictícia");
  });

  it("entende as cinco estantes do Skoob", () => {
    expect(por(extensao, "Fixture A").status).toBe("read");
    expect(por(extensao, "Fixture C").status).toBe("want_to_read");
    expect(por(extensao, "Fixture D").status).toBe("reading");
    expect(por(extensao, "Fixture E").status).toBe("reading");
    expect(por(extensao, "Fixture E").relendo).toBe(true);
    expect(por(extensao, "Fixture F").status).toBe("did_not_finish");
  });

  it("lê a data dd/mm/aaaa, com o dia primeiro", () => {
    expect(por(extensao, "Fixture A").leituras[0]!.terminou).toBe("2024-03-07");
    expect(por(extensao, "Fixture F").leituras[0]!.abandonou).toBe("2024-02-20");
  });

  it("a nota com vírgula vira número, e o meio ponto sobe para a palavra de cima", () => {
    expect(por(extensao, "Fixture A").estrelas).toBe(4.5);
    expect(fromStars(4.5)).toBe(5);
    expect(fromStars(3.5)).toBe(4);
    expect(por(extensao, "Fixture B").estrelas).toBe(3);
  });

  it("a resenha com vírgula dentro chega inteira", () => {
    expect(por(extensao, "Fixture A").resenha).toBe("Resenha fictícia, com vírgula dentro.");
  });
});
