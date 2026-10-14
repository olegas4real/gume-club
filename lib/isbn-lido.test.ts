import { describe, it, expect } from "vitest";
import { isbnDoCodigo } from "@/lib/isbn-lido";

describe("o código de barras é um livro?", () => {
  it("o ISBN-13 da contracapa passa", () => {
    expect(isbnDoCodigo("9788535911664")).toBe("9788535911664");
    expect(isbnDoCodigo("9780000000002")).toBe("9780000000002");
  });

  it("o código do preço (que não começa com 978 nem 979) não é livro", () => {
    expect(isbnDoCodigo("7891234567895")).toBeNull();
  });

  it("uma leitura torta, com um número trocado, não passa", () => {
    expect(isbnDoCodigo("9788535911665")).toBeNull();
  });

  it("código curto (o de cinco dígitos do preço, ao lado) não passa", () => {
    expect(isbnDoCodigo("51990")).toBeNull();
  });
});
