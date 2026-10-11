import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Toda página pública oferece CRIAR conta a quem não tem uma, e não só "Entrar".
 * O conserto do funil tinha ido só para a home, e as páginas que recebem link de
 * fora seguiam mandando desconhecido para o login. Ver components/chamada-conta.tsx.
 */
const ler = (p: string) => readFileSync(p, "utf8");

describe("a chamada para criar conta", () => {
  it("aponta para o cadastro, e não para o login", () => {
    expect(ler("components/chamada-conta.tsx")).toContain('const CRIAR = "/entrar?novo=1"');
  });

  it("está no cabeçalho de toda página de quem não tem conta", () => {
    expect(ler("components/public-header.tsx")).toContain("<LinkCriarConta");
    const layout = ler("app/layout.tsx");
    const semConta = layout.slice(layout.indexOf("if (!viewer)"), layout.indexOf("</html>"));
    expect(semConta).toContain("<PublicHeader />");
  });

  // As páginas que mais recebem link de fora ganham também o cartão, com a frase
  // que diz o que a conta destrava ali.
  it.each(["app/livro/[slug]/page.tsx", "app/[handle]/page.tsx", "app/contribuidores/page.tsx", "app/sobre/page.tsx"])(
    "%s tem o cartão de criar conta",
    (pagina) => {
      expect(ler(pagina)).toMatch(/!viewer && \(\s*<ChamadaConta|<ChamadaConta/);
    },
  );

  it("a ficha do livro não convida a 'entrar' quem não tem conta", () => {
    expect(ler("app/livro/[slug]/page.tsx")).not.toMatch(/>\s*Entre para/);
  });
});
