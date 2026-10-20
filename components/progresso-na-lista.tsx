import { BookOpenCheck } from "lucide-react";
import type { Progresso } from "@/lib/progresso";

/**
 * ════════════════════════════════════════════════════════════════════
 *  "VOCÊ LEU 12 DE 40, 30%." E ninguém mais vê isso.
 *
 *  A linha fecha a pergunta que toda lista boa abre: já li quais destes? Sem
 *  ela, a resposta só existia capa por capa, de memória.
 *
 *  ═══ TEM BARRA, E A PRIMEIRA VERSÃO NÃO TINHA ═══
 *
 *  Eu recusei a barra com o argumento de que ela pede para ser preenchida e
 *  transforma a lista em tarefa. O dono pediu a barra, e o argumento dele é
 *  mais forte: **o Gume já tem barra de progresso de leitura**, no perfil, e a
 *  virada está documentada em docs/design.md e em ai/DECISIONS.md. Recusar aqui
 *  seria o produto sendo incoerente consigo mesmo, não sendo fiel a um
 *  princípio.
 *
 *  A linha que o projeto de fato guarda não é "nada de barra": é que nada
 *  **olha para o relógio** e nada compara pessoas. Uma barra sobre uma lista
 *  fechada não faz nem uma coisa nem outra: ela tem um fim que não se move e um
 *  número que é só seu.
 *
 *  ═══ E É A MESMA BARRA DA HONRA, DE PROPÓSITO ═══
 *
 *  Mesma altura (3px), mesmo trilho (tinta a 8%), mesmo canto redondo,
 *  rótulo em cima com o número à esquerda e o alvo à direita. Ver Barra, em
 *  components/moldura.tsx. Uma segunda barra com geometria própria faria a tela
 *  parecer montada por duas pessoas.
 *
 *  O que muda é a tinta: lá a cor é a do degrau, porque a cor É a informação.
 *  Aqui não há degrau, então o preenchimento é tinta cheia, e o accent fica de
 *  fora: ele é link, estado ligado e foco, e nada mais.
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
    <div className="mt-6 max-w-sm">
      <div className="flex items-baseline justify-between gap-4">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
          <BookOpenCheck size={13} strokeWidth={1.75} aria-hidden />
          você leu{" "}
          <span className="tabular text-[var(--color-ink)]">
            {progresso.lidos} de {progresso.total}
          </span>
          <span className="normal-case tracking-normal text-[12px]">· só você vê</span>
        </span>

        <span className="tabular text-[12px] text-[var(--color-ink-faint)]">{progresso.pct}%</span>
      </div>

      {/* O trilho e o preenchimento, na geometria da barra da honra. O número já
          está escrito em cima, então a barra em si não precisa ser lida em voz
          alta: ela é a mesma informação, desenhada. */}
      <div
        aria-hidden
        className="mt-2 h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--color-ink) 8%, transparent)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${progresso.pct}%`,
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--color-ink) 55%, transparent), var(--color-ink))",
          }}
        />
      </div>
    </div>
  );
}
