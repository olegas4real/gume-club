import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A política de privacidade é uma lista de afirmações sobre o código. Estes testes
 * quebram a build quando o código anda e a página fica para trás. Ver
 * app/privacidade/page.tsx.
 */
const ler = (p: string) => readFileSync(p, "utf8");

/**
 * O CÓDIGO, sem os comentários. Contar comentário como ocorrência faria o teste acusar
 * justamente os textos que EXPLICAM por que o medidor saiu, e o conserto seria apagar a
 * explicação: a trava passaria a cobrar silêncio sobre a própria regra.
 */
function semComentario(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Todo .ts/.tsx abaixo de uma pasta, para varrer o app inteiro e não só uma tela. */
function arquivosDe(dir: string, fora: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosDe(caminho, fora);
    else if (/\.tsx?$/.test(nome)) fora.push(caminho);
  }
  return fora;
}
const pagina = ler("app/privacidade/page.tsx");

describe("a política de privacidade", () => {
  it("é linkada de onde os dados são coletados", () => {
    expect(ler("app/entrar/page.tsx")).toContain('href="/privacidade"');
  });

  it("é linkada de onde a conta se apaga e da página de quem ainda não tem conta", () => {
    expect(ler("app/perfil/page.tsx")).toContain('href="/privacidade"');
    expect(ler("app/page.tsx")).toContain('href="/privacidade"');
    expect(ler("app/sobre/page.tsx")).toContain('href="/privacidade"');
  });

  /**
   * Cada serviço de fora que o código sabe ligar tem que estar nomeado na página. O
   * par é (arquivo que liga o serviço, o que ele lê, o nome que a página tem que dizer).
   */
  const SERVICOS: [string, string, string][] = [
    ["lib/stripe.ts", "STRIPE_SECRET_KEY", "Stripe"],
    ["lib/email.ts", "RESEND", "Resend"],
    ["lib/guardar.ts", "@vercel/blob", "Vercel"],
  ];
  it.each(SERVICOS)("%s liga %s, e a página diz %s", (arquivo, variavel, nome) => {
    expect(ler(arquivo)).toContain(variavel);
    expect(pagina).toContain(nome);
  });

  /**
   * A página não pode cravar endereço de contato. O gume.club saiu do ar em outubro de
   * 2026, e quem roda o Gume agora é outra pessoa: um endereço fixo aqui mandaria o
   * pedido de LGPD de quem usa a cópia dela para uma caixa que não é dela, e que no caso
   * do antigo nem recebe mais. Ver o cabeçalho de app/privacidade/page.tsx.
   */
  it("pega o contato do ambiente, e não crava nenhum endereço", () => {
    expect(pagina).toContain("NEXT_PUBLIC_CONTATO");
    expect(pagina).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  /**
   * E não pode afirmar no presente o que só valia para a instância hospedada. A lista de
   * serviços continua inteira (é o que o código sabe ligar), mas o texto tem que dizer
   * que o que está LIGADO depende de quem hospeda.
   */
  it("não fala como se existisse uma instância hospedada", () => {
    expect(pagina).toContain("depende de quem hospeda");
  });

  /**
   * O contrário da lista acima, e ele é o que segura a limpeza de 2026-10-28: nenhum
   * medidor voltou, e se voltar tem que voltar nomeado aqui. Varre o app inteiro, e não
   * só esta página, porque um script de medição entra em qualquer tela.
   */
  it("nenhum medidor voltou para o código", () => {
    const MEDIDORES = ["clarity", "googletagmanager", "google-analytics", "posthog", "fbq(", "connect.facebook.net", "cloudflareinsights", "@sentry/"];
    const fontes = ["app", "components", "lib", "middleware.ts"]
      .flatMap((raiz) => (raiz.endsWith(".ts") ? [raiz] : arquivosDe(raiz)))
      // Este arquivo nomeia os medidores de propósito, que é o ponto dele.
      .filter((f) => f !== "lib/privacidade.test.ts");
    const sujos = fontes.filter((f) => {
      const codigo = semComentario(ler(f)).toLowerCase();
      return MEDIDORES.some((m) => codigo.includes(m));
    });
    expect(sujos).toEqual([]);
  });

  it("a página promete apagar a conta, e o botão existe", () => {
    expect(pagina).toContain("Apagar a minha conta");
    expect(ler("components/apagar-conta.tsx")).toContain("Apagar a minha conta");
  });
});
