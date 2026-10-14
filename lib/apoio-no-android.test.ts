import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { apoioVisivelCom } from "@/lib/apoio-visivel";

/**
 * ════════════════════════════════════════════════════════════════════
 *  DENTRO DO APP ANDROID, O APOIO SOME. E só um teste defende uma regra.
 *
 *  A Play exige o sistema de pagamento dela para benefício digital, e a insígnia e a
 *  moldura de apoiador contam como benefício. A regra mora em lib/apoio-visivel.ts;
 *  estes testes cobram as três pontas: a decisão pura, as telas passando pela pergunta
 *  única, e as rotas de checkout fechando a porta de verdade.
 * ════════════════════════════════════════════════════════════════════
 */

afterEach(() => vi.restoreAllMocks());

describe("a decisão pura", () => {
  it.each([
    [true, false, true],
    [true, true, false],
    [false, false, false],
    [false, true, false],
  ])("instância ligada=%s, no app=%s, visível=%s", (ligado, noApp, esperado) => {
    expect(apoioVisivelCom(ligado, noApp)).toBe(esperado);
  });
});

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const p = path.join(dir, nome);
    if (statSync(p).isDirectory()) return arquivos(p);
    return /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  });
}

describe("toda tela passa pela pergunta única", () => {
  it("apoioLigado( não aparece fora de lib/: uma tela que o chame direto esquece o app Android", () => {
    const fora = [...arquivos("app"), ...arquivos("components"), "middleware.ts"]
      .filter((p) => readFileSync(p, "utf8").includes("apoioLigado("));
    // A única exceção é a própria /apoiar, que usa apoioLigado() para o 404 da
    // instância sem Stripe ANTES de decidir a versão do app (ver o comentário lá).
    expect(fora).toEqual(["app/apoiar/page.tsx"]);
  });

  it("o middleware grava a marca do app, e o cartão de portas filtra por ela", () => {
    const mw = readFileSync("middleware.ts", "utf8");
    expect(mw).toContain('searchParams.get("origem") === "android"');
    expect(mw).toContain('cookies.set("gume_app"');

    const portas = readFileSync("components/apoie-e-acompanhe.tsx", "utf8");
    expect(portas).toContain("{ apoio }: { apoio: boolean }");
    expect(portas).toMatch(/filter\(\(p\) => p\.key !== "apoiar" \|\| apoio\)/);
  });

  it("as duas rotas de checkout fecham a porta antes de falar com o Stripe", () => {
    for (const rota of ["app/api/checkout/subscription/route.ts", "app/api/checkout/avulso/route.ts"]) {
      const src = readFileSync(rota, "utf8");
      const guarda = src.indexOf("apoioVisivel()");
      const stripe = src.indexOf("checkout.sessions.create");
      expect(guarda, `${rota} não pergunta apoioVisivel()`).toBeGreaterThan(-1);
      expect(guarda, `${rota} pergunta tarde demais`).toBeLessThan(stripe);
    }
  });
});

describe("a rota recusa de verdade, sem chegar ao Stripe", () => {
  it("POST no checkout com o cookie do app devolve 404", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_de_mentira");
    vi.doMock("next/headers", () => ({
      cookies: async () => ({ has: (nome: string) => nome === "gume_app", get: () => ({ value: "android" }) }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/checkout/subscription/route");
    const res = await POST(
      new Request("http://local/api/checkout/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: "marcador" }),
      }),
    );
    expect(res.status).toBe(404);

    vi.doUnmock("next/headers");
    vi.unstubAllEnvs();
  });
});
