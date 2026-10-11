import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * ════════════════════════════════════════════════════════════════════
 *  "VER UMA ESTANTE": PARA ONDE O SEGUNDO BOTÃO DA HOME LEVA.
 *
 *  Ele levava para a primeira das três estantes sorteadas da home, e o único piso era
 *  ter três capas. A auditoria de 2026-10-10 caiu numa estante de quatro livros, um
 *  terminado: o primeiro contato de um desconhecido com o produto era uma estante
 *  vazia. Design vazio mente, e aqui ele mentia na vitrine.
 *
 *  Agora o destino é sorteado só entre estantes que mostram o que o Gume é: pelo menos
 *  PISO_LIVROS livros públicos e PISO_LIDOS terminados, com foto, de quem não saiu nem
 *  foi banido. Continua sorteado, e não "a maior": nada neste app ordena gente por
 *  quanto ela leu (lib/honras.regras.test.ts). O piso só diz quem PODE ser sorteado.
 *
 *  Se ninguém passa no piso, devolve null e o botão some. Melhor nenhum convite do
 *  que um convite para o vazio.
 * ════════════════════════════════════════════════════════════════════
 */

export const PISO_LIVROS = 30;
export const PISO_LIDOS = 10;

export async function getVitrine(): Promise<string | null> {
  const [linha] = await db.execute<{ handle: string }>(sql`
    select u.handle
      from users u
      join library_entries le on le.user_id = u.id and le.visibility = 'public'
     where u.deleted_at is null and u.banned_at is null and u.image is not null
     group by u.id
    having count(*) >= ${PISO_LIVROS}
       and count(*) filter (where le.status = 'read') >= ${PISO_LIDOS}
     order by random()
     limit 1`);
  return linha?.handle ?? null;
}
