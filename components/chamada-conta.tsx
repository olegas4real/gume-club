"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { comVolta } from "@/lib/volta";

/**
 * ════════════════════════════════════════════════════════════════════
 *  A CHAMADA PARA CRIAR CONTA, FORA DA HOME. Um componente só.
 *
 *  O conserto da porta (components/porta-entrada.tsx) trocou "Entrar" por "Criar
 *  conta" só na home. As páginas que mais recebem link de fora (a ficha de um livro,
 *  o perfil de alguém, /contribuidores, /sobre) continuavam oferecendo só "Entrar", e
 *  a ficha do livro dizia "Entre para guardar este livro na estante": um convite que
 *  entrega um formulário de login a quem não tem conta.
 *
 *  Todo estado sem conta aponta para `/entrar?novo=1`, que abre já no modo de criar.
 *  "Já tenho conta" é o caminho secundário. `lib/chamada-conta.test.ts` quebra a build
 *  se uma dessas páginas perder a chamada.
 * ════════════════════════════════════════════════════════════════════
 */

const CRIAR = "/entrar?novo=1";

/** O link de criar conta. Já foi contado no funil de entrada, que não existe mais. */
export function LinkCriarConta({ className, children }: { className?: string; children: React.ReactNode }) {
  // Depois de criar a conta, a pessoa volta para a página que a convenceu (o livro,
  // a estante de alguém). Ver lib/volta.ts.
  const aqui = usePathname();
  return (
    <Link href={comVolta(CRIAR, aqui)} className={className}>
      {children}
    </Link>
  );
}

/** O cartão, com uma frase que diz o que a conta destrava NESTA página. */
export function ChamadaConta({ frase, className = "" }: { frase: string; className?: string }) {
  return (
    <section className={`surface p-6 ${className}`}>
      <p className="text-[15px] leading-relaxed text-[var(--color-ink)]">{frase}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <LinkCriarConta className="rounded-[var(--radius-control)] bg-[var(--color-ink)] px-5 py-2.5 text-[14px] font-medium text-[var(--color-canvas)]">
          Criar conta
        </LinkCriarConta>
        <JaTenhoConta
          className="text-[14px] text-[var(--color-ink-soft)] underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)]"
        >
          Já tenho conta
        </JaTenhoConta>
      </div>
    </section>
  );
}

/** "Já tenho conta", também com a volta: quem entra numa conta que já tem volta para cá. */
function JaTenhoConta({ className, children }: { className?: string; children: React.ReactNode }) {
  const aqui = usePathname();
  return (
    <Link href={comVolta("/entrar", aqui)} className={className}>
      {children}
    </Link>
  );
}
