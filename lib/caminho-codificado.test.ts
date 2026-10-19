import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O PONTO CODIFICADO NO CAMINHO. Ver o comentário em middleware.ts.
 *
 *  `GET /robots%2etxt` devolvia **500**, e não 404: o Next desfaz o `%2e` no
 *  meio do caminho, passa a enxergar `/robots.txt`, e discorda de si mesmo sobre
 *  quem ia atender — "Invariant app-page handler received invalid cache entry
 *  APP_ROUTE" (Sentry 7789689274).
 *
 *  Um 500 numa sondagem de robô não é só barulho no Sentry: é o app dizendo que
 *  ESTOUROU, quando a resposta honesta é "não existe".
 * ════════════════════════════════════════════════════════════════════
 */
const pede = (caminho: string) => middleware(new NextRequest(`https://gume.club${caminho}`));

describe("caminho com ponto ou barra codificados", () => {
  it("o endereço que derrubava o app agora é 404, e não 500", () => {
    expect(pede("/robots%2etxt").status).toBe(404);
  });

  it("vale para maiúscula, minúscula e para a barra", () => {
    for (const caminho of ["/robots%2Etxt", "/sitemap%2exml", "/a%2fb", "/a%2Fb", "/livro/x%2e%2e/y"]) {
      expect(pede(caminho).status, caminho).toBe(404);
    }
  });

  it("não devolve o conteúdo pedido: quem sonda não ganha a resposta que veio buscar", async () => {
    const res = pede("/robots%2etxt");
    expect(await res.text()).not.toContain("User-agent");
    expect(res.headers.get("location")).toBeNull(); // 404, e não redirecionamento
  });
});

describe("o que é legítimo continua passando", () => {
  it("os endereços de sempre não são tocados", () => {
    for (const caminho of ["/", "/robots.txt", "/explorar", "/marina", "/livro/o-hobbit", "/estante/favoritos"]) {
      expect(pede(caminho).status, caminho).toBe(200);
    }
  });

  /**
   * A regra mira em DUAS codificações, e não em "tem porcentagem". Um acento
   * codificado é um caminho normal, e barrar ele seria trocar um erro 500 por um
   * app que recusa gente.
   */
  it("acento codificado passa: a regra não é 'tem porcentagem'", () => {
    expect(pede("/jo%C3%A3o").status).toBe(200);
    expect(pede("/livro/cora%C3%A7%C3%A3o-das-trevas").status).toBe(200);
  });

  it("a query continua livre: o problema é o CAMINHO", () => {
    expect(pede("/explorar?q=%2e%2e%2f").status).toBe(200);
  });
});

describe("o 404 continua sendo uma resposta do Gume", () => {
  it("leva os cabeçalhos de segurança, como toda resposta que sai daqui", () => {
    const res = pede("/robots%2etxt");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
