import type { MetadataRoute } from "next";
import { urlDoApp } from "@/lib/stripe";

/**
 * O que os buscadores podem ler. `/robots.txt` respondia 404.
 *
 * Fora: as telas que só existem para quem está dentro (estante, perfil, importar,
 * painel), as rotas de servidor e a porta de entrada. O resto do Gume é público de
 * propósito: a ficha do livro, as listas, a página de quem faz.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/painel", "/perfil", "/estante", "/importar", "/estatisticas", "/entrar", "/cuidar", "/moderacao"],
    },
    sitemap: urlDoApp("/sitemap.xml"),
  };
}
