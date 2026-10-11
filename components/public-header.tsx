import Link from "next/link";
import { Logo } from "@/components/logo";
import { LinkCriarConta } from "@/components/chamada-conta";

/**
 * Chrome for somebody who is not logged in.
 *
 * They get the mark, one door, and nothing else. The app sidebar is full of
 * things a visitor does not have (their shelves, their tags, their profile), and
 * showing it would be a lobby full of doors that are all locked. The landing is a
 * manifesto, and a manifesto with a nav rail beside it is a product tour.
 */
export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
      <Link href="/">
        <Logo />
      </Link>

      <nav className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/sobre"
          className="text-[13px] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
        >
          Sobre
        </Link>
        {/* "Entrar" sozinho mandava todo desconhecido para o login. Ver
            components/chamada-conta.tsx. */}
        <Link
          href="/entrar"
          className="text-[13px] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
        >
          Entrar
        </Link>
        <LinkCriarConta className="rounded-[var(--radius-control)] bg-[var(--color-ink)] px-4 py-1.5 text-[13px] font-medium text-[var(--color-canvas)]">
          Criar conta
        </LinkCriarConta>
      </nav>
    </header>
  );
}
