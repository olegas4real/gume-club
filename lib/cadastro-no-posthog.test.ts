import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O CADASTRO É CONTADO NO POSTHOG, E SÓ O CADASTRO.
 *
 *  O PostHog já captura visita e clique sozinho (`$pageview` e autocapture).
 *  Mandar o funil inteiro seria a mesma visita contada duas vezes, e um número
 *  dobrado é PIOR que um número que falta: ele parece certo, e ninguém vai
 *  conferir.
 *
 *  O que falta lá é a CONVERSÃO — justamente o que nenhuma captura automática
 *  adivinha, porque ela acontece depois de uma volta pelo Google.
 * ════════════════════════════════════════════════════════════════════
 */

/** Monta um `window` de mentira com a URL do anúncio e um PostHog espião. */
function navegadorCom(busca: string, comPostHog = true) {
  const capture = vi.fn();
  vi.stubGlobal("window", {
    location: { search: busca },
    ...(comPostHog ? { posthog: { capture } } : {}),
  });
  // Sem sendBeacon nem fetch de verdade: o que importa aqui é o PostHog, e a
  // escrita no banco já tem o próprio teste (lib/criativo-no-funil.sql.test.ts).
  vi.stubGlobal("navigator", { sendBeacon: vi.fn(() => true) });
  vi.stubGlobal("Blob", class { constructor(public partes: unknown[]) {} });
  return capture;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("o evento de cadastro", () => {
  it("conta no PostHog, com o nome do anúncio junto", async () => {
    const capture = navegadorCom("?utm_source=meta&utm_campaign=angulos-out2026&utm_content=estante");
    const { registrarEvento } = await import("@/lib/funil-client");

    registrarEvento("cadastro_ok", { origem: "instagram" });

    expect(capture).toHaveBeenCalledWith("cadastrou", {
      origem: "instagram",
      campanha: "angulos-out2026",
      criativo: "estante",
    });
  });

  /**
   * Um número dobrado é pior que um número que falta. Visita e clique já são
   * capturados sozinhos pelo PostHog.
   */
  it.each(["visita_home", "clique_criar", "viu_entrar"] as const)(
    "%s NÃO conta no PostHog: ele já captura isso sozinho",
    async (tipo) => {
      const capture = navegadorCom("?utm_source=meta&utm_content=estante");
      const { registrarEvento } = await import("@/lib/funil-client");

      registrarEvento(tipo, { origem: "instagram" });

      expect(capture).not.toHaveBeenCalled();
    },
  );

  it("sem anúncio nenhum, o cadastro conta mesmo assim, com os rótulos vazios", async () => {
    const capture = navegadorCom("");
    const { registrarEvento } = await import("@/lib/funil-client");

    registrarEvento("cadastro_ok", { origem: "direto" });

    expect(capture).toHaveBeenCalledWith("cadastrou", {
      origem: "direto",
      campanha: null,
      criativo: null,
    });
  });

  /**
   * Bloqueador de anúncio derruba o PostHog numa fatia real dos navegadores —
   * o do próprio dono derruba o GA e o Clarity. Quando `window.posthog` não
   * existe, o cadastro não pode cair junto.
   */
  it("não quebra quando o PostHog foi bloqueado ou está desligado", async () => {
    navegadorCom("?utm_content=estante", false);
    const { registrarEvento } = await import("@/lib/funil-client");

    expect(() => registrarEvento("cadastro_ok", { origem: "instagram" })).not.toThrow();
  });
});

/**
 * ═══ ESTRUTURAL: A PORTA É UMA SÓ ═══
 *
 * O cadastro é registrado em DOIS pontos de app/entrar/page.tsx, e vai ganhar
 * um terceiro no dia em que entrar outro jeito de criar conta. Se cada tela
 * chamasse o PostHog por conta própria, a terceira seria esquecida — e a que
 * falta não quebra nada, só faz o funil mentir para menos.
 */
describe("ninguém chama o PostHog por fora", () => {
  const fontes = ["app", "components", "lib"].flatMap((raiz) =>
    readdirSync(raiz, { recursive: true, encoding: "utf8" })
      .filter((f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test."))
      .map((f) => join(raiz, f)),
  );

  it("só lib/funil-client.ts fala com o posthog do navegador", () => {
    const culpados = fontes.filter((f) => {
      if (f === join("lib", "funil-client.ts")) return false;
      // components/medicao.tsx é quem CARREGA o script; carregar não é medir.
      if (f === join("components", "medicao.tsx")) return false;
      return /posthog\s*\??\.\s*capture/.test(readFileSync(f, "utf8"));
    });

    expect(
      culpados,
      "quem mede cadastro por fora de lib/funil-client.ts vira o ponto que alguém esquece de atualizar",
    ).toEqual([]);
  });
});
