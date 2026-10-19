"use client";

// Tipos só, apagados na compilação: nada de lib/funil.ts (que fala com o
// Postgres) entra no pacote do navegador.
import type { TipoDeEvento, ModoInicial } from "@/lib/funil";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O LADO DO NAVEGADOR DO FUNIL. Ver lib/funil.ts e app/api/eventos/route.ts.
 *
 *  `sendBeacon`, e não `fetch` esperado: um clique que já navega embora (o CTA
 *  de "criar conta" leva pra /entrar na hora) não pode depender de uma rede
 *  terminando antes — é a MESMA lição que este repo já aprendeu com
 *  `conviteEmVoo` (app/entrar/page.tsx), só que ali a saída é esperar; aqui,
 *  como o evento é só medição e nunca pode atrasar quem está navegando, a
 *  saída é não esperar nada.
 * ════════════════════════════════════════════════════════════════════
 */
export function registrarEvento(
  tipo: TipoDeEvento,
  dados: { origem?: string | null; modoInicial?: ModoInicial | null } = {},
): void {
  try {
    // A peça do anúncio vai SEMPRE, e não por parâmetro: quem chama já tem que
    // lembrar da origem, e um segundo item para lembrar é um item para esquecer.
    // Ela é lida da URL aqui dentro, e o servidor decide se vira rótulo ou nada.
    const { campanha, criativo } = pecaAtual();

    const corpo = JSON.stringify({
      tipo,
      origem: dados.origem ?? null,
      modoInicial: dados.modoInicial ?? null,
      campanha,
      criativo,
    });

    // O mesmo cadastro, contado também no PostHog. Ver `avisarPostHog`.
    if (tipo === "cadastro_ok") avisarPostHog(dados.origem ?? null, campanha, criativo);

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/eventos", new Blob([corpo], { type: "application/json" }));
    } else {
      // Navegador antigo sem sendBeacon: melhor um fetch que não é esperado
      // por ninguém do que nenhuma medição.
      void fetch("/api/eventos", {
        method: "POST",
        body: corpo,
        headers: { "content-type": "application/json" },
        keepalive: true,
      });
    }
  } catch {
    // Medir nunca pode quebrar a navegação de quem só está de passagem.
  }
}

/**
 * A origem, do jeito que o navegador enxerga: primeiro o que a própria URL diz
 * (`?utm_source=`), depois de onde a pessoa veio (`document.referrer`), e por
 * último "direto" — nunca vazio. O servidor (`normalizarOrigem`, lib/funil.ts)
 * é quem decide se isso vira um balde conhecido ou "outro"; aqui só se lê o
 * que o navegador sabe, sem julgar.
 */
export function origemAtual(): string | null {
  try {
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    if (utm) return utm;
    if (document.referrer) return document.referrer;
    return "direto";
  } catch {
    return null;
  }
}

/**
 * A PEÇA do anúncio, do jeito que o navegador enxerga: `utm_campaign` é a
 * campanha e `utm_content` é o criativo. Sem julgar a forma — quem decide se
 * isso vira rótulo é `normalizarRotulo()` no servidor (lib/funil.ts).
 *
 * Sem isso, três criativos rodando no mesmo Instagram caem todos no balde
 * "instagram", e o relatório não responde qual peça trouxe quem virou gente.
 */
export function pecaAtual(): { campanha: string | null; criativo: string | null } {
  try {
    const p = new URLSearchParams(window.location.search);
    return { campanha: p.get("utm_campaign"), criativo: p.get("utm_content") };
  } catch {
    return { campanha: null, criativo: null };
  }
}

/**
 * Carrega o `?utm_source=` que a home recebeu até o destino do clique — a
 * redundância pedida no item 6: cobre quem abre `/entrar` direto (sem o
 * cookie de sessão vivo) e ainda assim carrega de onde veio.
 */
export function hrefComUtm(base: string): string {
  if (typeof window === "undefined") return base;
  try {
    const de = new URLSearchParams(window.location.search);
    // Os três viajam juntos ou a redundância fica pela metade: quem abre
    // /entrar sem o cookie de sessão vivo carregaria a rede e perderia a peça,
    // que é exatamente o que esta leva veio consertar.
    const leva = new URLSearchParams();
    for (const chave of ["utm_source", "utm_campaign", "utm_content"]) {
      const valor = de.get(chave);
      if (valor) leva.set(chave, valor);
    }
    if ([...leva].length === 0) return base;

    const separador = base.includes("?") ? "&" : "?";
    return `${base}${separador}${leva.toString()}`;
  } catch {
    return base;
  }
}

/**
 * ════════════════════════════════════════════════════════════════════
 *  O CADASTRO, CONTADO TAMBÉM NO POSTHOG.
 *
 *  ═══ POR QUE AQUI DENTRO, E NÃO NA TELA DE /entrar ═══
 *
 *  O cadastro é registrado em DOIS pontos de app/entrar/page.tsx (o caminho do
 *  código e o do Google), e vai ganhar um terceiro no dia em que entrar outro
 *  jeito de criar conta. Chamar o PostHog lá seria duas chamadas hoje e uma
 *  esquecida depois — e a que falta não quebra nada, só faz o funil mentir para
 *  menos. Aqui a porta é uma só: quem registra `cadastro_ok` conta nos dois.
 *
 *  ═══ POR QUE SÓ O CADASTRO, E NÃO O FUNIL INTEIRO ═══
 *
 *  O PostHog já captura visita e clique sozinho (`$pageview` e autocapture).
 *  Mandar `visita_home` seria a mesma visita contada duas vezes, e um número
 *  dobrado é pior que um número que falta: ele parece certo.
 *
 *  O que falta lá é a CONVERSÃO, que é justamente o que nenhuma captura
 *  automática adivinha, porque ela acontece depois de uma volta pelo Google.
 *
 *  ═══ O QUE VAI, E O QUE NÃO VAI ═══
 *
 *  Vai o nome do anúncio e o balde de origem. Não vai nada da pessoa: ela
 *  continua anônima no PostHog (`person_profiles: "identified_only"`, e
 *  ninguém chama `identify`). O nome do cartaz, nunca quem passou na frente.
 *
 *  E ele some junto com o resto: sem `NEXT_PUBLIC_POSTHOG_KEY`, o script nunca
 *  entrou na página, `window.posthog` não existe, e isto aqui não faz nada —
 *  a mesma regra de desligado-de-fábrica que vale para a medição toda.
 * ════════════════════════════════════════════════════════════════════
 */
function avisarPostHog(origem: string | null, campanha: string | null, criativo: string | null): void {
  try {
    const ph = (window as unknown as { posthog?: { capture?: (e: string, p?: unknown) => void } }).posthog;
    ph?.capture?.("cadastrou", { origem, campanha, criativo });
  } catch {
    // Bloqueador de anúncio derruba o PostHog em uma fatia dos navegadores, e
    // isso é esperado: o funil do próprio banco (eventos_funil) é quem conta a
    // verdade. Medir nunca pode quebrar o cadastro de ninguém.
  }
}
