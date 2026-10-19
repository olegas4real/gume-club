import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A política de privacidade é uma lista de afirmações sobre o código. Estes testes
 * quebram a build quando o código anda e a página fica para trás. Ver
 * app/privacidade/page.tsx.
 */
const ler = (p: string) => readFileSync(p, "utf8");
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
    ["components/medicao.tsx", "NEXT_PUBLIC_CLARITY_ID", "Microsoft Clarity"],
    ["components/medicao.tsx", "NEXT_PUBLIC_GA_ID", "Google Analytics"],
    ["components/medicao.tsx", "NEXT_PUBLIC_POSTHOG_KEY", "PostHog"],
    ["components/medicao.tsx", "NEXT_PUBLIC_FB_PIXEL_ID", "Meta"],
    ["instrumentation.ts", "SENTRY_DSN", "Sentry"],
    ["lib/stripe.ts", "STRIPE_SECRET_KEY", "Stripe"],
    ["lib/email.ts", "RESEND", "Resend"],
    ["lib/guardar.ts", "@vercel/blob", "Vercel"],
  ];
  it.each(SERVICOS)("%s liga %s, e a página diz %s", (arquivo, variavel, nome) => {
    expect(ler(arquivo)).toContain(variavel);
    expect(pagina).toContain(nome);
  });

  it("a página promete apagar a conta, e o botão existe", () => {
    expect(pagina).toContain("Apagar a minha conta");
    expect(ler("components/apagar-conta.tsx")).toContain("Apagar a minha conta");
  });
});
