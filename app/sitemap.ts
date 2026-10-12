import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { urlDoApp } from "@/lib/stripe";

/**
 * O mapa do site. `/sitemap.xml` respondia 404.
 *
 * As páginas públicas da casa e as FICHAS DE LIVRO, que são públicas e são o que
 * alguém procura no Google ("os sete maridos de evelyn hugo resenha"). Perfis de
 * leitor NÃO entram: eles só são indexáveis com e-mail verificado (ver
 * generateMetadata em app/[handle]/page.tsx), e listar todos aqui desfaria essa trava.
 *
 * Gerado na hora do pedido, e não no build: o banco não é alcançável durante o build
 * do Railway, e um mapa gerado ali quebraria o deploy. Buscador pede pouco.
 */
export const dynamic = "force-dynamic";

const PAGINAS = ["/", "/sobre", "/explorar", "/queridinhos", "/contribuidores", "/o-que-vem", "/apoiar", "/privacidade", "/ajuda/skoob"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const obras = await db.execute<{ slug: string }>(sql`
    select slug from works order by created_at desc limit 40000`);

  return [
    ...PAGINAS.map((p) => ({ url: urlDoApp(p) })),
    ...obras.map((o) => ({ url: urlDoApp(`/livro/${o.slug}`) })),
  ];
}
