import { describe, it, expect, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, works, libraryEntries, revisions } from "@/lib/db/schema";
import { apagarConta } from "@/lib/conta";

/**
 * Apagar a conta, perguntado ao banco de verdade. Ver lib/conta.ts.
 */

const marca = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const obras: string[] = [];
const sobras: string[] = [];

async function novoLeitor(nome: string) {
  const handle = `conta-${nome}-${marca}`;
  const [u] = await db.insert(users).values({ handle, email: `${handle}@conta.test` }).returning({ id: users.id });
  sobras.push(u!.id);
  return u!.id;
}

afterAll(async () => {
  for (const id of sobras) await db.execute(sql`delete from users where id = ${id}::uuid`);
  for (const id of obras) await db.execute(sql`delete from revisions where target_id = ${id}::uuid`);
  for (const id of obras) await db.execute(sql`delete from works where id = ${id}::uuid`);
});

describe("apagar a conta", () => {
  it("leva a estante junto, e deixa a correção de ficha sem o nome", async () => {
    const eu = await novoLeitor("sai");
    const [w] = await db.insert(works).values({ slug: `conta-${marca}`, title: `zz conta ${marca}` }).returning({ id: works.id });
    obras.push(w!.id);
    await db.insert(libraryEntries).values({ userId: eu, workId: w!.id, status: "read", visibility: "public" });
    const [rev] = await db
      .insert(revisions)
      .values({ userId: eu, targetType: "work", targetId: w!.id, patch: { title: "x" }, previous: { title: "y" } })
      .returning({ id: revisions.id });

    expect(await apagarConta(eu)).toEqual({ ok: true });

    const [u] = await db.execute(sql`select 1 from users where id = ${eu}::uuid`);
    expect(u).toBeUndefined();
    const [le] = await db.execute(sql`select 1 from library_entries where user_id = ${eu}::uuid`);
    expect(le).toBeUndefined();
    const [r] = await db.execute<{ user_id: string | null }>(sql`select user_id from revisions where id = ${rev!.id}::uuid`);
    expect(r).toBeDefined();
    expect(r!.user_id).toBeNull();
  });

  it("recusa o idealizador, e não apaga nada", async () => {
    const eu = await novoLeitor("ideia");
    // Sem mexer no idealizador de verdade: o índice deixa um só, então o teste só roda
    // se ainda não houver nenhum neste banco.
    const [ja] = await db.execute(sql`select 1 from badge_grants where badge = 'idealizador' and revoked_at is null`);
    if (ja) return;
    await db.execute(sql`insert into badge_grants (user_id, badge) values (${eu}::uuid, 'idealizador')`);
    expect(await apagarConta(eu)).toEqual({ ok: false, motivo: "idealizador" });
    const [u] = await db.execute(sql`select 1 from users where id = ${eu}::uuid`);
    expect(u).toBeDefined();
  });

  it("toda tabela que aponta para uma pessoa diz o que fazer quando ela sai", async () => {
    // Uma chave estrangeira nova sem ON DELETE faria o apagar falhar no banco, e a
    // pessoa leria "não deu" sem saber por quê. Toda chave para users é CASCADE (é da
    // pessoa) ou SET NULL (é do acervo).
    const travam = await db.execute<{ coluna: string }>(sql`
      select c.conrelid::regclass || '.' || a.attname as coluna
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
       where c.contype = 'f' and c.confrelid = 'users'::regclass
         and c.confdeltype not in ('c', 'n')`);
    expect(travam.map((t) => t.coluna)).toEqual([]);
  });
});
