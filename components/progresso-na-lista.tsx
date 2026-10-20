import { BookOpenCheck } from "lucide-react";
import type { Progresso } from "@/lib/progresso";

/**
 * ════════════════════════════════════════════════════════════════════
 *  "VOCÊ LEU 12 DE 40, 30%." E ninguém mais vê isso.
 *
 *  A linha fecha a pergunta que toda lista boa abre: já li quais destes? Sem
 *  ela, a resposta só existia capa por capa, de memória.
 *
 *  ═══ NÚMERO, E NÃO BARRA ═══
 *
 *  Uma barra de progresso pela metade pede para ser preenchida, e aí a lista
 *  deixa de ser convite e vira tarefa. Esta é a mesma recusa da ofensiva e da
 *  meta de livros por mês, uma casa adiante: o número informa, a barra cobra.
 *
 *  ═══ E É SÓ SEU ═══
 *
 *  O progresso é sempre o de quem está olhando (lib/progresso.ts não tem como
 *  perguntar o de outra pessoa), então não existe o par que faria disso um
 *  placar. A frase diz isso em voz alta, uma vez, porque quem lê "30%" numa
 *  lista pública tem toda razão de perguntar quem mais está vendo.
 *
 *  ═══ A LISTA VAZIA NÃO GANHA LINHA ═══
 *
 *  "Você leu 0 de 0" é um comentário, não é informação. Mesma régua do zero em
 *  components/quem-guardou.tsx.
 * ════════════════════════════════════════════════════════════════════
 */
export function ProgressoNaLista({ progresso }: { progresso: Progresso }) {
  if (progresso.total === 0) return null;

  return (
    <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--color-ink-faint)]">
      <BookOpenCheck size={14} strokeWidth={1.5} aria-hidden />
      <span>
        Você leu{" "}
        <span className="tabular font-medium text-[var(--color-ink)]">
          {progresso.lidos} de {progresso.total}
        </span>
        , {progresso.pct}%
      </span>
      <span className="text-[12px]">só você vê isso</span>
    </p>
  );
}
