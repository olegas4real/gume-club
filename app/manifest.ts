import type { MetadataRoute } from "next";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O MANIFESTO DO APP. Sem ele, "instalar" é um atalho pobre.
 *
 *  app/apple-icon.png já cobria o Safari/iOS (Adicionar à Tela de Início usa
 *  esse arquivo por convenção própria da Apple, sem manifesto nenhum). Mas o
 *  Chrome/Android só oferece a instalação DE VERDADE — ícone redondo do
 *  sistema, tela cheia sem barra de endereço, nome próprio no app switcher —
 *  quando existe um `manifest.webmanifest` para ler. Sem isto, "usar como
 *  app" no Android era só um atalho da web salvo na tela, com a barra do
 *  navegador ainda visível.
 *
 *  Next serve este arquivo em /manifest.webmanifest e já linka o <head>
 *  sozinho: nada a mais para escrever em app/layout.tsx.
 *
 *  Os ícones vêm de scripts/brand.mjs (pnpm brand) — a mesma arte-fonte do
 *  favicon e do apple-icon, nunca uma terceira cópia. Ver docs/design.md.
 * ════════════════════════════════════════════════════════════════════
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gume",
    short_name: "Gume",
    description: "A mente leitora nunca perde o fio.",
    /**
     * `id` e `scope` fixam a identidade do app instalado: sem `id`, trocar o
     * start_url um dia faria o navegador tratar o app como OUTRO app. E o
     * empacotamento Android (TWA, ver docs/android.md) lê este manifesto para
     * saber o que é "dentro" do app. `orientation` fica de fora de propósito:
     * um leitor de tablet deitado é um caso legítimo, e travar em retrato o
     * puniria.
     */
    id: "/",
    scope: "/",
    start_url: "/",
    lang: "pt-BR",
    dir: "ltr",
    display: "standalone",
    // O canvas escuro é a casa: a marca nasceu para ele, e é o tema que o
    // dono trouxe como o principal nesta rodada de redesign. Ver app/globals.css.
    background_color: "#17151d",
    theme_color: "#17151d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /**
       * O MASKABLE é uma arte separada, e tem que ser: o launcher do Android
       * recorta o ícone na forma que quiser e só promete os 80% centrais. O
       * icon-512 ocupa o quadro inteiro; recortado em círculo, as asas da
       * marca somem. Este nasce em scripts/brand.mjs com a arte na zona
       * segura, sobre o canvas escuro.
       */
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
