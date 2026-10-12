"use client";

import { useState, useTransition } from "react";
import { salvarApoioPublico, salvarMoldura } from "@/app/perfil/actions";

/**
 * ════════════════════════════════════════════════════════════════════
 *  APARECER NA LISTA DE QUEM APOIA.
 *
 *  Só existe para quem apoia. Quem não apoia não vê esta seção, porque uma caixa
 *  perguntando se você quer aparecer numa lista da qual você não faz parte não é uma
 *  opção: é uma cobrança educada.
 *
 *  Ela nasce MARCADA (ver a migration 0056), e é por isso que ela precisa ser fácil de
 *  achar: quem já está numa página pública tem que conseguir sair dela num clique, e no
 *  mesmo dia em que entrou.
 * ════════════════════════════════════════════════════════════════════
 */
/**
 * A moldura: "opção de moldura de apoiador e aí tu seleciona se quer a moldura da sua
 * honra/elo ou de apoiador" — o dono. A regra já existia (coroaDe, em lib/honras.ts) e
 * /insignias já prometia a escolha; faltava o lugar de escolher. As duas prévias vêm
 * desenhadas do servidor, com a sua cara.
 */
type Escolha = "honra" | "apoiador";

export function ApoioPublico({
  aparecendo,
  moldura,
  nomeDaHonra,
  previas,
}: {
  aparecendo: boolean;
  moldura: Escolha;
  nomeDaHonra: string;
  previas: Record<Escolha, React.ReactNode>;
}) {
  const [escolha, setEscolha] = useState<Escolha>(moldura);
  const [salvandoMoldura, começarMoldura] = useTransition();

  function escolher(nova: Escolha) {
    const antes = escolha;
    setEscolha(nova);
    setErro(null);
    começarMoldura(async () => {
      const r = await salvarMoldura(nova);
      if (!r.ok) {
        setEscolha(antes);
        setErro("Não deu para salvar agora. Tente de novo daqui a pouco.");
      }
    });
  }

  const [marcado, setMarcado] = useState(aparecendo);
  const [pendente, começar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function alternar(novo: boolean) {
    /**
     * A tela muda na hora, e volta atrás se o servidor recusar. Um interruptor que espera
     * a rede para se mexer parece quebrado, e quem clica clica de novo.
     */
    setMarcado(novo);
    setErro(null);

    começar(async () => {
      const r = await salvarApoioPublico(novo);
      if (!r.ok) {
        setMarcado(!novo);
        setErro("Não deu para salvar agora. Tente de novo daqui a pouco.");
      }
    });
  }

  return (
    <section className="surface mt-6 p-6">
      <h2 className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
        seu apoio
      </h2>

      <label className="mt-4 flex cursor-pointer items-start gap-3">
        {/* Rosa, e não verde-água: é a cor de "quem faz", e apoiar é contribuir. */}
        <input
          type="checkbox"
          checked={marcado}
          disabled={pendente}
          onChange={(e) => alternar(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-colaborar)] disabled:opacity-40"
        />
        <span className="text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          <span className="font-medium text-[var(--color-ink)]">
            Mostrar que você apoia.
          </span>{" "}
          Seu nome entra na lista de quem apoia e ganha a etiqueta &ldquo;apoia o Gume&rdquo; no
          perfil, sem quanto você apoia e sem ordem nenhuma. Se desmarcar, você apoia em
          silêncio.
        </span>
      </label>

      <h3 className="mt-7 text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
        sua moldura
      </h3>
      <div className="mt-4 flex flex-wrap gap-3" role="radiogroup" aria-label="sua moldura">
        {(["honra", "apoiador"] as const).map((op) => (
          <button
            key={op}
            type="button"
            role="radio"
            aria-checked={escolha === op}
            disabled={salvandoMoldura}
            onClick={() => escolher(op)}
            className="flex items-center gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-left transition-colors disabled:opacity-60"
            style={{
              borderColor: escolha === op ? "var(--color-ink)" : "var(--color-rule)",
            }}
          >
            {previas[op]}
            <span className="text-[14px] text-[var(--color-ink-soft)]">
              {op === "honra" ? `A da sua honra (${nomeDaHonra})` : "A de apoiador"}
            </span>
          </button>
        ))}
      </div>

      {erro && <p className="mt-3 text-[13px] text-[var(--color-perigo)]">{erro}</p>}
    </section>
  );
}
