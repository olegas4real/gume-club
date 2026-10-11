import { describe, it, expect, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, works, libraryEntries } from "@/lib/db/schema";
import { getStatsDoRecorte } from "@/lib/stats";

/**
 * Quem acabou de importar a estante inteira, com leituras sem data, não pode cair numa
 * casa vazia. Ver getStatsDoRecorte em lib/stats.ts.
 */
const marca = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const pessoas: string[] = [];
const obras: string[] = [];

async function leitor(nome: string, lidosSemData: number) {
  const handle = `rec-${nome}-${marca}`;
  const [u] = await db.insert(users).values({ handle, email: `${handle}@recorte.test` }).returning({ id: users.id });
  pessoas.push(u!.id);
  for (let i = 0; i < lidosSemData; i++) {
    const [w] = await db.insert(works).values({ slug: `rec-${nome}-${i}-${marca}`, title: `zz rec ${nome} ${i} ${marca}` }).returning({ id: works.id });
    obras.push(w!.id);
    await db.insert(libraryEntries).values({ userId: u!.id, workId: w!.id, status: "read", visibility: "private" });
  }
  return { id: u!.id };
}

afterAll(async () => {
  for (const id of pessoas) await db.execute(sql`delete from users where id = ${id}::uuid`);
  for (const id of obras) await db.execute(sql`delete from works where id = ${id}::uuid`);
});

describe("o recorte que abre", () => {
  it("importou lidos sem data: abre na vida inteira, com os livros", async () => {
    const eu = await leitor("importou", 3);
    const { year, stats } = await getStatsDoRecorte(eu, eu.id, undefined);
    expect(year).toBeNull();
    expect(stats.books).toBe(3);
  });

  it("quem pediu o ano recebe o ano, mesmo vazio", async () => {
    const eu = await leitor("pediu", 2);
    const ano = new Date().getFullYear();
    const { year, stats } = await getStatsDoRecorte(eu, eu.id, ano);
    expect(year).toBe(ano);
    expect(stats.books).toBe(0);
  });

  it("estante vazia continua no ano: não há vida inteira para mostrar", async () => {
    const eu = await leitor("vazio", 0);
    const { year } = await getStatsDoRecorte(eu, eu.id, undefined);
    expect(year).toBe(new Date().getFullYear());
  });
});
