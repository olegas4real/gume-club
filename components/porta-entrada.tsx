import Link from "next/link";

/**
 * ════════════════════════════════════════════════════════════════════
 *  A PORTA DA HOME. Os dois botões da primeira dobra, e o alternador
 *  discreto pra quem já tem conta.
 *
 *  ═══ POR QUE ISTO SAIU DE app/page.tsx ═══
 *
 *  1.217 visitas de divulgação, 2 cadastros: o CTA da home dizia "Entrar",
 *  e um estranho sem conta batia num botão de LOGIN. "Entrar" em português
 *  lê como "fazer login", não como "começar" — e era a hipótese mais
 *  provável, e a mais barata de testar, para o 0,16%.
 *
 *  ═══ ELA JÁ FOI MEDIDA, E NÃO É MAIS ═══
 *
 *  Esta tela mandava `visita_home` e `clique_criar` para o funil, e os links
 *  ganhavam `?utm_source=` depois de montar, para a campanha saber qual
 *  anúncio trouxe quem. Os dois sumiram junto com a medição inteira: sem
 *  instância hospedada não há campanha para atribuir nem painel para olhar,
 *  e o que sobra de um medidor sem ninguém medindo é só código que manda
 *  dados dos outros para fora.
 *
 *  O que ficou é o que a fatia resolvia de verdade: a palavra no botão.
 *  Dois links estáticos, sem estado e sem efeito, renderizados no servidor.
 * ════════════════════════════════════════════════════════════════════
 */
export function PortaEntrada({ vitrine }: { vitrine: string | undefined }) {
  return (
    <>
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/entrar?novo=1"
          className="w-full rounded-[var(--radius-control)] bg-[var(--color-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--color-canvas)] sm:w-auto"
        >
          Criar conta
        </Link>

        {vitrine && (
          <Link
            href={`/@${vitrine}`}
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-rule)] px-7 py-3.5 text-[15px] text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] sm:w-auto"
          >
            Ver uma estante
          </Link>
        )}
      </div>

      {/* Quem já tem conta não devia precisar procurar: o link some no meio
          de duas frases, e é exatamente o oposto do que esta fatia resolve
          pro lado de quem chega pela primeira vez. */}
      <p className="mt-5 text-[14px] text-[var(--color-ink-faint)]">
        já tem conta?{" "}
        <Link
          href="/entrar"
          className="text-[var(--color-ink-soft)] underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)]"
        >
          entrar
        </Link>
      </p>
    </>
  );
}
