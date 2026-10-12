import { DOURADO } from "@/lib/dourado";
import { APOIADOR } from "@/lib/paleta";

/**
 * ════════════════════════════════════════════════════════════════════
 *  AS ETIQUETAS AO LADO DO NOME. Escritas, e não ícones.
 *
 *  O idealizador era uma bússola dourada sozinha ao lado do nome, e "não dá pra saber
 *  o que é" — o dono. Um ícone que precisa de legenda é um ícone que falhou. Agora é a
 *  palavra, numa etiqueta pequena.
 *
 *  E a de apoiador mora ao lado: "acho legal ter uma tag de apoiador do lado do nome"
 *  — o dono. Ela só aparece para quem apoia HOJE (o fato vem de ehApoiador, e some
 *  sozinho quando o apoio acaba) e deixou o apoio público: quem desmarcou "aparecer na
 *  lista de quem apoia" apoia em silêncio, e o app não conta a ninguém.
 *
 *  As duas são um FATO sobre a pessoa e a casa, nunca um degrau: não dizem quanto ela
 *  leu. Por isso nenhuma tem tamanho, brilho ou ordem que sugira que uma vale mais.
 * ════════════════════════════════════════════════════════════════════
 */
const TIPOS = {
  idealizador: {
    texto: "idealizador",
    cor: DOURADO,
    titulo: "Teve a ideia do Gume e começou a construir.",
  },
  apoiador: {
    texto: "apoia o Gume",
    cor: APOIADOR.de,
    titulo: "Ajuda a pagar a conta do servidor todo mês.",
  },
} as const;

export function EtiquetaDoNome({ tipo }: { tipo: keyof typeof TIPOS }) {
  const t = TIPOS[tipo];
  return (
    <span
      title={t.titulo}
      className="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase leading-[1.6] tracking-[0.12em]"
      style={{
        fontFamily: "var(--font-chrome)",
        color: t.cor,
        borderColor: `color-mix(in srgb, ${t.cor} 45%, transparent)`,
        background: `color-mix(in srgb, ${t.cor} 10%, transparent)`,
      }}
    >
      {t.texto}
    </span>
  );
}
