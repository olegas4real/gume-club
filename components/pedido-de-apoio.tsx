"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartHandshake, X } from "lucide-react";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O PEDIDO DE APOIO, NO MOMENTO BOM. Uma vez, e some.
 *
 *  "A parte de apoiar o gume deve ser mais importante, chamativa etc, preciso de
 *  apoios, como fazer sem ficar invasivo?" — o dono.
 *
 *  Aparece só logo depois de um momento em que a pessoa está grata ao Gume: terminou
 *  um livro, ou a estante dela acabou de entrar inteira numa importação. Nunca no meio
 *  de uma tarefa, nunca em tela de estranho, nunca para quem já apoia (quem chama
 *  decide isso no servidor).
 *
 *  ═══ UMA VEZ, DE VERDADE ═══
 *
 *  Contar como visto no instante em que aparece, e não só quando fecha: quem ignorou
 *  também viu. Volta só depois de INTERVALO_DIAS. O registro mora no navegador
 *  (localStorage), como o "já vi" do sino: é coisa que o aparelho sabe, não o banco.
 *  E se o navegador não deixar gravar, o pedido NÃO aparece: na dúvida, menos.
 * ════════════════════════════════════════════════════════════════════
 */

const CHAVE = "gume:pedido-de-apoio";
const INTERVALO_DIAS = 120;

export function PedidoDeApoio({ frase, custo }: { frase: string; custo: string }) {
  const [mostrar, setMostrar] = useState(false);

  // Só depois de montar: no servidor não existe localStorage, e decidir no primeiro
  // render faria o HTML do servidor e o do cliente discordarem.
  useEffect(() => {
    try {
      const antes = Number(localStorage.getItem(CHAVE) ?? 0);
      if (Date.now() - antes < INTERVALO_DIAS * 24 * 60 * 60 * 1000) return;
      localStorage.setItem(CHAVE, String(Date.now()));
      setMostrar(true);
    } catch {
      // Navegador sem armazenamento: não dá para garantir "uma vez", então não pede.
    }
  }, []);

  if (!mostrar) return null;

  return (
    <aside
      className="surface relative mt-8 flex items-start gap-4 p-5 sm:p-6"
      style={{ borderColor: "color-mix(in srgb, var(--color-colaborar) 35%, var(--color-rule))" }}
    >
      <HeartHandshake
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className="mt-0.5 shrink-0"
        style={{ color: "var(--color-colaborar)" }}
      />
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-[15px] leading-relaxed text-[var(--color-ink)]">{frase}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          O Gume é mantido por quem lê: custa cerca de {custo} por mês, sem anúncio e sem
          vender o que você lê.
        </p>
        <Link
          href="/apoiar"
          className="mt-4 inline-block rounded-[var(--radius-control)] px-4 py-2 text-[14px] font-medium text-[var(--color-canvas)]"
          style={{ background: "var(--color-colaborar)" }}
        >
          Apoiar o Gume
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setMostrar(false)}
        aria-label="Agora não"
        className="absolute right-3 top-3 p-1.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
      >
        <X size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </aside>
  );
}
