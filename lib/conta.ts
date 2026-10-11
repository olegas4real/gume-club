import { sql } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * ════════════════════════════════════════════════════════════════════
 *  APAGAR A CONTA, DE VERDADE.
 *
 *  A tela de perfil prometeu isto desde a primeira versão: "quando chegar vai apagar
 *  mesmo: tudo que você escreveu some junto, sem deixar rastro para os outros". E é
 *  direito de quem usa (LGPD), não uma gentileza.
 *
 *  ═══ É UM DELETE, E NÃO UM `deleted_at` ═══
 *
 *  `deleted_at` existe, mas um carimbo de "saiu" deixa o histórico de leitura inteiro no
 *  banco, e o histórico de leitura é justamente o dado que diz religião, saúde,
 *  sexualidade e política de alguém. Apagar é apagar. Toda tabela que aponta para
 *  `users` já decide o que acontece (conferido contra o banco, e o teste trava):
 *
 *   - O que é DA PESSOA vai junto (CASCADE): estante, notas, resenhas, coleções,
 *     seguidores, sessões, apoio.
 *   - O que é DO ACERVO fica, sem o nome (SET NULL): uma correção de ficha, uma capa
 *     enviada, uma obra cadastrada. A ficha certa é de todo mundo; quem corrigiu, não.
 *
 *  ═══ A ORDEM IMPORTA ═══
 *
 *  1. Cancelar a assinatura no Stripe ANTES de apagar. Se o cancelamento falhar, a conta
 *     NÃO é apagada: apagar a conta e deixar o cartão sendo cobrado todo mês por um
 *     apoio que não tem mais dono é o pior desfecho possível, e ninguém mais conseguiria
 *     achar a assinatura pela tela.
 *  2. Apagar a linha. O banco leva o resto.
 *  3. A foto, por último e sem travar: a linha já não existe, e uma foto órfã num
 *     armazenamento não aparece em lugar nenhum. Falhar aqui vira log, não erro na tela.
 * ════════════════════════════════════════════════════════════════════
 */

export type ApagarConta =
  | { ok: true }
  | { ok: false; motivo: "idealizador" | "apoio" | "sumiu" };

/** As assinaturas que ainda cobram. Qualquer estado que não seja fim de linha. */
const STATUS_ENCERRADOS = ["canceled", "incomplete_expired"];

export async function apagarConta(userId: string): Promise<ApagarConta> {
  const [eu] = await db.execute<{ image: string | null; idealizador: boolean }>(sql`
    select u.image,
           exists (select 1 from badge_grants g
                    where g.user_id = u.id and g.badge = 'idealizador' and g.revoked_at is null) as idealizador
      from users u where u.id = ${userId}::uuid`);
  if (!eu) return { ok: false, motivo: "sumiu" };

  // Só existe um idealizador, e é ele quem concede moderação. Apagá-lo pela tela
  // deixaria o Gume sem ninguém que possa fazer isso. É uma operação de banco, à mão.
  if (eu.idealizador) return { ok: false, motivo: "idealizador" };

  const assinaturas = await db.execute<{ id: string }>(sql`
    select stripe_subscription_id as id from stripe_subscription
     where user_id = ${userId}::uuid
       and status <> all(${sql.param(STATUS_ENCERRADOS)}::text[])`);

  if (assinaturas.length > 0) {
    const s = stripe();
    if (!s) return { ok: false, motivo: "apoio" };
    try {
      for (const a of assinaturas) await s.subscriptions.cancel(a.id);
    } catch (e) {
      console.error("[conta] cancelar assinatura antes de apagar", e);
      return { ok: false, motivo: "apoio" };
    }
  }

  await db.execute(sql`delete from users where id = ${userId}::uuid`);

  if (eu.image && process.env.BLOB_READ_WRITE_TOKEN && /\.blob\.vercel-storage\.com\//.test(eu.image)) {
    await del(eu.image).catch((e) => console.error("[conta] apagar a foto", e));
  }

  return { ok: true };
}
