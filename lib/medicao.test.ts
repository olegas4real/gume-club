import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ════════════════════════════════════════════════════════════════════
 *  UM MEDIDOR NOVO NASCE COM A CSP ABERTA, OU NÃO NASCE.
 *
 *  ═══ O MODO DE FALHA, E POR QUE ELE É PIOR QUE UM ERRO ═══
 *
 *  A decisão de 2026-07-23 diz, em texto: "as duas listas (o script que entra
 *  na página e o host que a CSP deixa falar) ligam e desligam JUNTAS, pela
 *  mesma variável, para nunca existir script bloqueado em silêncio nem porta
 *  aberta à toa."
 *
 *  Isso era verdade por SORTE: alguém lembrou, duas vezes. E o dia em que
 *  alguém esquecer não vai ter erro nenhum. O script entra na página, o
 *  navegador recusa a conexão calado, e o painel de medição mostra um número
 *  MENOR do que a verdade.
 *
 *  Número menor não parece bug. Parece pouco tráfego. É a lei do AGENTS.md
 *  ("nunca traduza falha em ausência de dado") na sua forma mais escorregadia,
 *  porque aqui o dado que some é sobre nós mesmos, e ninguém reclama.
 *
 *  ═══ A REGRA ═══
 *
 *  Toda variável de medição lida por components/medicao.tsx tem que aparecer
 *  no middleware.ts (que é onde a CSP é montada) e no .env.example (que é onde
 *  quem hospeda descobre que ela existe).
 *
 *  Não confere QUAIS hosts: isso muda quando o fornecedor muda de endereço, e
 *  um teste que soubesse os hosts de cor viraria um segundo lugar para
 *  atualizar. Confere o que não pode ser esquecido: que alguém PENSOU na CSP
 *  quando pôs um script novo.
 * ════════════════════════════════════════════════════════════════════
 */

const raiz = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** As variáveis que o componente da medição lê para decidir o que injetar. */
function variaveisDaMedicao(): string[] {
  const src = raiz("components/medicao.tsx")
    // Sem comentário: o cabeçalho do arquivo CITA as variáveis para explicá-las,
    // e um teste que lesse o texto cru se provaria com a própria documentação.
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

  return [...new Set([...src.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)].map((m) => m[1]!))];
}

describe("a medição e a CSP andam juntas", () => {
  it("o componente lê pelo menos um medidor, e todos por variável", () => {
    const vars = variaveisDaMedicao();
    expect(vars.length, "components/medicao.tsx parou de ler variável nenhuma").toBeGreaterThan(0);
  });

  it("toda variável de medição também é conhecida pelo middleware, que monta a CSP", () => {
    const mw = raiz("middleware.ts");

    for (const v of variaveisDaMedicao()) {
      expect(
        mw.includes(v),
        `${v} injeta script em components/medicao.tsx e o middleware.ts não sabe dela. ` +
          "O navegador vai bloquear a conexão em silêncio, e o relatório vai vir menor " +
          "que a verdade sem ninguém perceber.",
      ).toBe(true);
    }
  });

  it("toda variável de medição está no .env.example", () => {
    const exemplo = raiz(".env.example");

    for (const v of variaveisDaMedicao()) {
      expect(
        exemplo.includes(v),
        `${v} não está no .env.example. Quem hospeda o Gume não tem como adivinhar ` +
          "que ela existe.",
      ).toBe(true);
    }
  });

  /**
   * ═══ E A PORTA CONTINUA FECHADA SEM A VARIÁVEL ═══
   *
   * A outra metade da promessa, e a que protege quem hospeda o Gume por conta
   * própria: sem a variável, o host não entra na CSP. Um host de medição
   * escrito solto na lista (fora do `&&`) abriria a porta na instância de todo
   * mundo, inclusive nas que nunca ligaram medição nenhuma.
   */
  it("nenhum host de medição entra na CSP sem a variável dele ao lado", () => {
    /**
     * ═══ AQUI NÃO SE REMOVE COMENTÁRIO POR REGEX. O PRIMEIRO RASCUNHO FEZ, E
     *     O TESTE SE DESATIVOU SOZINHO ═══
     *
     * O jeito usual deste repo (`.replace(/\/\*[\s\S]*?\*\//g, " ")`, como em
     * lib/imagens.test.ts) tem um buraco que só aparece com host curinga:
     *
     *     "https://*.googletagmanager.com"
     *              ↑↑
     *
     * Esses dois caracteres SÃO uma abertura de comentário. O removedor engolia
     * dali até o próximo `*​/`, junto com as linhas que este teste precisava ler,
     * e o teste passava sem examinar nada. Ele foi pego mutando o middleware de
     * propósito (host cravado, sem variável) e vendo o verde continuar.
     *
     * A régua nova não precisa de comentário removido: ela olha só para linhas
     * com uma URL ENTRE ASPAS, que é o que vira CSP de verdade. Prosa de
     * comentário cita host sem aspas e sem `https://`, então não entra. E as
     * duas linhas de guarda descartam o que é claramente comentário.
     */
    const linhas = raiz("middleware.ts")
      .split("\n")
      .filter((l) => {
        const t = l.trim();
        return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
      });

    const MEDIDORES = [
      "cloudflareinsights.com",
      "clarity.ms",
      "sentry.io",
      "google-analytics.com",
      "googletagmanager.com",
      "analytics.google.com",
    ];

    /** Quantas linhas de host este teste de fato examinou. Ver a asserção final. */
    let examinadas = 0;

    for (const host of MEDIDORES) {
      // Só URL entre aspas: é o que vira CSP. `[^"]*` não atravessa a aspa de
      // fechamento, então a busca não escorrega para a linha inteira.
      const citada = new RegExp(`"https://[^"]*${host.replace(/\./g, "\\.")}[^"]*"`);

      for (const linha of linhas) {
        if (!citada.test(linha)) continue;
        examinadas++;
        expect(
          /process\.env\.NEXT_PUBLIC_[A-Z0-9_]+\s*&&/.test(linha),
          `o host ${host} entra na CSP sem depender de variável nenhuma (${linha.trim()}). ` +
            "Toda instância auto-hospedada passaria a abrir essa porta de fábrica.",
        ).toBe(true);
      }
    }

    /**
     * ═══ E A TRAVA CONTRA ESTE TESTE SE DESATIVAR DE NOVO ═══
     *
     * Um laço que não acha nada passa, e foi exatamente assim que a primeira
     * versão mentiu por meia hora. Se um dia os hosts mudarem de forma e nenhum
     * for mais reconhecido aqui, é para ficar VERMELHO, e não verde por vazio.
     */
    expect(
      examinadas,
      "este teste não encontrou host de medição nenhum no middleware.ts. Ou a CSP " +
        "perdeu a medição, ou a forma de escrever os hosts mudou e este teste virou " +
        "enfeite. As duas exigem alguém olhar.",
    ).toBeGreaterThanOrEqual(MEDIDORES.length);
  });
});

/**
 * ════════════════════════════════════════════════════════════════════
 *  E NÃO BASTA O HOST ESTAR LÁ: TÊM QUE ESTAR **TODOS** OS DELE.
 *
 *  O teste acima prova que cada host de medição depende de uma variável. Ele não
 *  prova que a lista está COMPLETA — e foi aí que o Clarity morreu.
 *
 *  A CSP liberava `www.clarity.ms`, que entrega só a TAG: um carregador de dez
 *  linhas. A biblioteca de verdade vem de `scripts.clarity.ms` e o pixel de
 *  `c.clarity.ms`, os dois bloqueados. A tag carregava, o navegador recusava o
 *  resto calado, e o painel ficava vazio — o que parece "ninguém entrou", e não
 *  "a medição está quebrada". Descoberto num Chrome limpo, lendo as violações de
 *  CSP, meses depois de instalado.
 *
 *  É a MESMA armadilha que o comentário do GA no middleware.ts já descrevia ("o
 *  navegador bloqueia CALADO; um número menor não parece um erro"), e ela pegou
 *  um medidor que não era o GA. Então vira teste, e não parágrafo.
 *
 *  Este teste chama o middleware DE VERDADE e lê o cabeçalho que ele devolve: a
 *  pergunta é "esta CSP deixa o Clarity funcionar?", e nenhuma leitura de código
 *  responde isso.
 * ════════════════════════════════════════════════════════════════════
 */
describe("a CSP libera TODOS os hosts de cada medidor, e não só o primeiro", () => {
  /** O que cada medidor precisa de verdade, por diretiva. Medido no navegador. */
  const EXIGIDO: Record<string, { env: string; valor: string; script?: string[]; img?: string[]; connect?: string[] }> = {
    clarity: {
      env: "NEXT_PUBLIC_CLARITY_ID",
      valor: "xxxxxxxxxx",
      // A tag carrega de www, a biblioteca de scripts, e o pixel de c.
      script: ["https://www.clarity.ms", "https://scripts.clarity.ms"],
      img: ["https://c.clarity.ms"],
      connect: ["https://x.clarity.ms"],
    },
    "google analytics": {
      env: "NEXT_PUBLIC_GA_ID",
      valor: "G-TESTE",
      script: ["https://www.googletagmanager.com"],
      img: ["https://www.google-analytics.com"],
      connect: ["https://region1.google-analytics.com", "https://analytics.google.com"],
    },
    posthog: {
      env: "NEXT_PUBLIC_POSTHOG_KEY",
      valor: "phc_teste",
      script: ["https://us-assets.i.posthog.com"],
      connect: ["https://us.i.posthog.com", "https://us-assets.i.posthog.com"],
    },
    "pixel da meta": {
      env: "NEXT_PUBLIC_FB_PIXEL_ID",
      valor: "123456",
      script: ["https://connect.facebook.net"],
      img: ["https://www.facebook.com"],
    },
  };

  /** `https://*.clarity.ms` cobre `https://scripts.clarity.ms`. */
  function cobre(diretiva: string, host: string): boolean {
    return diretiva.split(/\s+/).some((permitido) => {
      if (permitido === host) return true;
      if (!permitido.startsWith("https://*.")) return false;
      const sufixo = permitido.slice("https://*.".length);
      const dele = host.replace(/^https:\/\//, "");
      return dele === sufixo || dele.endsWith(`.${sufixo}`);
    });
  }

  it.each(Object.entries(EXIGIDO))("%s", async (nome, exigido) => {
    const { NextRequest } = await import("next/server");
    const antes = process.env[exigido.env];
    process.env[exigido.env] = exigido.valor;

    try {
      const { middleware } = await import("@/middleware");
      const csp = middleware(new NextRequest("https://gume.club/")).headers.get("content-security-policy") ?? "";

      const diretiva = (qual: string) =>
        csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${qual} `)) ?? "";

      for (const [qual, hosts] of [["script-src", exigido.script], ["img-src", exigido.img], ["connect-src", exigido.connect]] as const) {
        for (const host of hosts ?? []) {
          expect(
            cobre(diretiva(qual), host),
            `o ${nome} precisa falar com ${host}, e a ${qual} não libera. ` +
              "O navegador vai bloquear CALADO: nada quebra na tela, e o painel " +
              "mostra um número menor do que a verdade.",
          ).toBe(true);
        }
      }
    } finally {
      if (antes === undefined) delete process.env[exigido.env];
      else process.env[exigido.env] = antes;
    }
  });
});
