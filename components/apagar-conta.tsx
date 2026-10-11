"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apagarMinhaConta } from "@/app/perfil/actions";
import { lastBook } from "@/lib/last-book";

/**
 * Apagar a conta. Dois passos, e o segundo pede o @ escrito à mão: é a única ação do
 * Gume que não tem desfazer, então ela não pode acontecer num clique distraído.
 *
 * Sem modal e sem "tem certeza?" em vermelho piscando. A frase diz o que vai embora e
 * o que fica, e a pessoa decide.
 */
export function ApagarConta({ handle }: { handle: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-4 text-[13px] text-[var(--color-ink-faint)] underline decoration-[var(--color-rule)] underline-offset-4 transition-colors hover:text-[var(--color-perigo)]"
      >
        Apagar a minha conta
      </button>
    );
  }

  const enviar = (data: FormData) =>
    start(async () => {
      setErro(null);
      const r = await apagarMinhaConta(String(data.get("confirmacao") ?? ""));
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      lastBook.esquecer();
      router.push("/");
      router.refresh();
    });

  return (
    <form action={enviar} className="mt-4 max-w-lg">
      <p className="text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
        Isto apaga a sua estante, as suas notas, resenhas, coleções e quem você segue. Não
        tem volta. Se você apoia todo mês, o apoio é cancelado junto. As correções que você
        fez em fichas de livros ficam, sem o seu nome.
      </p>
      <label className="mt-4 block">
        <span className="text-[13px] text-[var(--color-ink-faint)]">
          Para confirmar, escreva @{handle}
        </span>
        <input
          name="confirmacao"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="mt-1 w-full rounded-[var(--radius-control)] border border-[var(--color-rule)] bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-[var(--color-perigo)]"
        />
      </label>
      {erro && <p className="mt-2 text-[13px] text-[var(--color-perigo)]">{erro}</p>}
      <div className="mt-4 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] border px-4 py-2 text-[13px] font-medium text-[var(--color-perigo)] disabled:opacity-40"
          style={{ borderColor: "var(--color-perigo)" }}
        >
          {pending ? "Apagando" : "Apagar a conta de vez"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          Deixa pra lá
        </button>
      </div>
    </form>
  );
}
