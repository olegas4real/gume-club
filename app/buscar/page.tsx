import Link from "next/link";
import { ScreenHeader } from "@/components/screen-header";
import { LiveSearch } from "@/components/live-search";

export const dynamic = "force-dynamic";

/**
 * One box: books and people. Results while you type.
 *
 * A reader looking for a friend and a reader looking for a book both begin by
 * typing a name, and asking them to pick a tab first is asking a question the app
 * can answer for itself.
 */
export default async function Buscar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 sm:px-10">
      <ScreenHeader title="Buscar" meta={["livros", "pessoas"]} />
      <LiveSearch initial={(raw ?? "").trim()} />

      {/* Colar uma lista morava aqui, com um casamento próprio (a busca solta, que
          podia trazer livro de fora do acervo). Mudou-se para /importar, ao lado do
          arquivo, pelo mesmo caminho dele: um fluxo só. Ver lib/import/colar.ts. */}
      <p className="mt-8 text-[13px] text-[var(--color-ink-faint)]">
        Tem uma lista de títulos, ou um arquivo do Goodreads, do StoryGraph ou do Fable?{" "}
        <Link href="/importar" className="underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)]">
          Traga de uma vez
        </Link>
        .
      </p>
    </main>
  );
}
