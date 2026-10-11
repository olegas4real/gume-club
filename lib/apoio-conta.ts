import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contaDoMes, ehApoiador, PRECO_CENTAVOS, STATUS_VIVOS, type ContaDoMes } from "@/lib/apoio";

/**
 * O que entrou no mês, para a "conta do mês" de /apoiar. Servidor só: lib/apoio.ts
 * continua sem falar com o banco, e é por isso que esta consulta mora aqui.
 *
 * Entrou = o valor mensal de cada assinatura viva + o apoio avulso dos últimos 30 dias
 * (o avulso também vale 30 dias de insígnia: a mesma janela).
 *
 * Nunca devolve valor por pessoa, nem a soma quando há pouca gente: ver
 * APOIADORES_PRA_MOSTRAR_COBERTURA em lib/apoio.ts.
 */
export async function getContaDoMes(): Promise<ContaDoMes> {
  const [linha] = await db.execute<{
    apoiadores: number; marcador: number; lombada: number; capadura: number; avulso: number;
  }>(sql`
    select
      (select count(*) from users u where u.deleted_at is null and ${ehApoiador(sql`u`)})::int as apoiadores,
      (select count(*) from stripe_subscription s
        where s.tier = 'marcador' and s.status = any(${sql.param(STATUS_VIVOS as unknown as string[])}::text[]))::int as marcador,
      (select count(*) from stripe_subscription s
        where s.tier = 'lombada' and s.status = any(${sql.param(STATUS_VIVOS as unknown as string[])}::text[]))::int as lombada,
      (select count(*) from stripe_subscription s
        where s.tier = 'capadura' and s.status = any(${sql.param(STATUS_VIVOS as unknown as string[])}::text[]))::int as capadura,
      (select coalesce(sum(amount_cents), 0) from stripe_one_time_support
        where created_at > now() - interval '30 days')::int as avulso
  `);

  const entrou =
    (linha?.marcador ?? 0) * PRECO_CENTAVOS.marcador +
    (linha?.lombada ?? 0) * PRECO_CENTAVOS.lombada +
    (linha?.capadura ?? 0) * PRECO_CENTAVOS.capadura +
    (linha?.avulso ?? 0);

  return contaDoMes(linha?.apoiadores ?? 0, entrou);
}

/** Esta pessoa apoia hoje? Para não pedir apoio a quem já apoia. */
export async function apoiaHoje(userId: string): Promise<boolean> {
  const [linha] = await db.execute<{ sim: boolean }>(sql`
    select ${ehApoiador(sql`u`)} as sim from users u where u.id = ${userId}::uuid`);
  return Boolean(linha?.sim);
}
