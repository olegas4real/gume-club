import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O SKOOB NÃO TEM EXPORTAÇÃO, E O GUME NÃO PODE DIZER QUE TEM.
 *
 *  A central de ajuda do Skoob (abril de 2026) diz que ele não exporta nem importa
 *  estante, e a API pública morreu em setembro de 2025. O Gume prometia, em três telas,
 *  aceitar "o arquivo que você baixou do Skoob", e dizia que o Skoob importa o nosso
 *  CSV. As duas coisas eram falsas.
 *
 *  A regra: nenhuma tela põe "Skoob" perto de "baixou", "exportar", "importar" ou
 *  "arquivo" sem dizer, na mesma frase, que ele NÃO tem exportação. Só um teste defende
 *  uma regra.
 * ════════════════════════════════════════════════════════════════════
 */

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const p = path.join(dir, nome);
    if (statSync(p).isDirectory()) return arquivos(p);
    return /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  });
}

/** Só o texto que a pessoa lê: sem comentário de código. */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
    .replace(/\{\s*\}/g, " ");
}

const PERTO = 80;
const PROMESSA = /baix|export|import|arquivo|formato/i;
const RESSALVA = /não tem (botão de )?export|sem export|não export|não oferece export/i;

/** Devolve os trechos em que o Skoob aparece perto de uma promessa, sem a ressalva. */
export function promessasDoSkoob(texto: string): string[] {
  const achados: string[] = [];
  for (const m of texto.matchAll(/\bSkoob\b/g)) {
    const i = m.index!;
    const trecho = texto.slice(Math.max(0, i - PERTO), i + PERTO);
    if (PROMESSA.test(trecho) && !RESSALVA.test(trecho)) achados.push(trecho.replace(/\s+/g, " ").trim());
  }
  return achados;
}

describe("a promessa do Skoob", () => {
  it("a régua pega a frase velha e deixa passar a nova", () => {
    expect(promessasDoSkoob("O arquivo que você baixou do Goodreads, do StoryGraph, do Skoob ou do Fable.")).toHaveLength(1);
    expect(promessasDoSkoob("O arquivo sai no formato que o Skoob, o StoryGraph e o Oku sabem importar.")).toHaveLength(1);
    expect(promessasDoSkoob("Veio do Skoob? Ele não tem botão de exportar, mas tem caminho.")).toHaveLength(0);
  });

  /**
   * A página de ajuda do Skoob fala de arquivo e de Skoob em toda frase: ela é a
   * explicação. A exceção é nominal, e paga um preço: ela tem que abrir dizendo que o
   * Skoob não tem exportação (o teste de baixo cobra).
   */
  const EXCECOES = new Set([path.join("app", "ajuda", "skoob", "page.tsx")]);

  it("a página de ajuda, que é a exceção, abre com a ressalva", () => {
    const ajuda = readFileSync("app/ajuda/skoob/page.tsx", "utf8");
    const abertura = ajuda.slice(ajuda.indexOf("<h1"), ajuda.indexOf("<Passo"));
    expect(abertura).toMatch(RESSALVA);
  });

  it("nenhuma tela promete um arquivo do Skoob", () => {
    const telas = [...arquivos("app"), ...arquivos("components")].filter((p) => !EXCECOES.has(p));
    const quebradas = telas.flatMap((p) => {
      // O nome da fonte que o importador reconhece ("do Skoob") não é promessa: é o
      // rótulo de um arquivo que a pessoa JÁ trouxe. Ver nome() em import-form.tsx.
      const texto = semComentarios(readFileSync(p, "utf8")).replace(/skoob:\s*"Skoob"/g, "");
      return promessasDoSkoob(texto).map((t) => `${p}: ${t}`);
    });
    expect(quebradas).toEqual([]);
  });

  it("o arquivo exportado não diz que o Skoob o importa", () => {
    expect(promessasDoSkoob(readFileSync("lib/exportar.ts", "utf8").split("estante.csv")[1] ?? "")).toEqual([]);
  });
});
