import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { capa, poster, Moldura } from "@/lib/og";

/**
 * O PÔSTER NUNCA ESTOURA. É a promessa do cabeçalho de lib/og.tsx, e até o
 * conserto desta leva ela só valia para a CAPA; o DESENHO ficava descoberto.
 *
 * Nenhum caso aqui é inventado: cada um é um erro que derrubou o pôster de
 * verdade, ou que foi reproduzido quebrando o desenhista de propósito. Ver
 * Sentry 7647294007.
 *
 * O teste é `.ts` e não `.tsx` de propósito: o `include` do vitest.config.ts é
 * `**\/*.test.ts`, e alargar ele por causa de um arquivo é mexer na regra de
 * todo mundo para acomodar um caso. Os componentes são chamados como função,
 * que é o que o JSX faria de qualquer jeito.
 */

// 1x1 de verdade, em cada formato: os bytes importam, porque o desenhista decodifica.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const WEBP = Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64");

const respondeCom = (tipo: string, bytes: Buffer) =>
  vi.fn(async () =>
    new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": tipo } }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a capa embutida no pôster", () => {
  it("entra quando o formato é um que o desenhista sabe desenhar", async () => {
    vi.stubGlobal("fetch", respondeCom("image/png", PNG));
    expect(await capa("https://exemplo/capa.png")).toMatch(/^data:image\/png;base64,/);
  });

  it("ignora o parâmetro do content-type: 'image/jpeg; charset=binary' é jpeg", async () => {
    vi.stubGlobal("fetch", respondeCom("image/jpeg; charset=binary", PNG));
    expect(await capa("https://exemplo/capa.jpg")).toMatch(/^data:image\/jpeg;base64,/);
  });

  /**
   * ═══ O ERRO QUE DERRUBOU UM PÔSTER EM PRODUÇÃO ═══
   *
   * `image/webp` passava no antigo `startsWith("image/")`, e o satori estourava
   * com "u2 is not iterable" — sem citar a capa, nem o formato, nem o livro. Uma
   * capa que não desenha é uma capa que não entra, igual a uma que deu 404.
   */
  it("RECUSA webp e avif, que o desenhista não lê e por isso derrubam o pôster", async () => {
    vi.stubGlobal("fetch", respondeCom("image/webp", WEBP));
    expect(await capa("https://exemplo/capa.webp")).toBeNull();

    vi.stubGlobal("fetch", respondeCom("image/avif", WEBP));
    expect(await capa("https://exemplo/capa.avif")).toBeNull();
  });

  it("recusa o que nem imagem é", async () => {
    vi.stubGlobal("fetch", respondeCom("text/html", PNG));
    expect(await capa("https://exemplo/404.html")).toBeNull();
  });
});

describe("o pôster", () => {
  it("sai como PNG quando tudo dá certo", async () => {
    const res = await poster(Moldura({ children: "uma estante" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });

  /**
   * O desenhista também estoura em texto que ele não sabe moldar — hoje, árabe:
   * "lookupType: 5 - substFormat: 3 is not yet supported". O catálogo é de livros
   * do mundo todo e o nome de exibição é escrito por gente, então não dá para
   * listar o que ainda vai quebrar. Dá para garantir que nada disso vire 500 na
   * cara do robô do WhatsApp.
   */
  it("quando o desenho falha, devolve a moldura muda em vez de estourar", async () => {
    const res = await poster(Moldura({ children: "ألف ليلة وليلة" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });

  it("declara o tamanho, porque agora desenha inteiro antes de responder", async () => {
    const res = await poster(Moldura({ children: "oi" }));
    expect(Number(res.headers.get("content-length"))).toBeGreaterThan(1000);
  });
});

/**
 * ═══ ESTRUTURAL: UM PÔSTER NOVO NASCE PROTEGIDO ═══
 *
 * A proteção não pode depender de alguém lembrar dela. Quem chama a
 * `ImageResponse` direto na rota devolve um corpo que ainda VAI ser desenhado, e
 * o erro cai depois do retorno, fora do alcance de qualquer try/catch — que é
 * exatamente como este bug chegou em produção e ficou lá. A porta é uma só.
 */
describe("toda rota de pôster passa pela porta única", () => {
  const rotas = readdirSync("app", { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith("opengraph-image.tsx"))
    .map((f) => join("app", f));

  it("existe pelo menos uma rota de pôster para conferir", () => {
    expect(rotas.length).toBeGreaterThanOrEqual(4);
  });

  it.each(rotas)("%s usa poster() e não a ImageResponse crua", (rota) => {
    const fonte = readFileSync(rota, "utf8");
    expect(fonte).not.toContain("ImageResponse");
    expect(fonte).toContain("poster(");
  });

  it("as fontes e o tamanho vêm de lib/og.tsx, e não de uma segunda cópia", () => {
    for (const rota of rotas) {
      const fonte = readFileSync(rota, "utf8");
      expect(fonte, `${rota} carrega fonte por conta própria`).not.toContain("assets/fonts");
      expect(fonte, `${rota} repete o tamanho à mão`).not.toMatch(/width:\s*1200/);
    }
  });
});
