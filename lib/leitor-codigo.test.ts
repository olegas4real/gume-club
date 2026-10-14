import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * As promessas do leitor de código de barras que um teste sem câmera consegue cobrar.
 * Ver components/leitor-codigo.tsx e .github/ISSUE_DRAFTS/08-leitor-de-codigo-de-barras.md.
 */
const fonte = readFileSync("components/leitor-codigo.tsx", "utf8");

describe("o leitor de código de barras", () => {
  it("não aparece onde o navegador não sabe ler: nada de botão quebrado", () => {
    expect(fonte).toContain("if (!pode) return null;");
    expect(fonte).toMatch(/includes\("ean_13"\)/);
  });

  it("desliga a câmera ao fechar", () => {
    expect(fonte).toMatch(/return \(\) => \{[\s\S]*getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/);
  });

  it("só entrega o que é ISBN (o código do preço fica de fora)", () => {
    expect(fonte).toContain("isbnDoCodigo(c.rawValue)");
  });

  it("não puxa biblioteca de fora: é o leitor do próprio navegador", () => {
    expect(fonte).not.toMatch(/from "(zxing|@zxing|quagga|html5-qrcode)/);
  });

  it("mora na busca e no modo rápido da lista colada", () => {
    expect(readFileSync("components/live-search.tsx", "utf8")).toContain("<LeitorCodigo");
    expect(readFileSync("components/import-form.tsx", "utf8")).toMatch(/<LeitorCodigo\s+varios/);
  });
});
