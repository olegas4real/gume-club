import { describe, it, expect, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, works, libraryEntries } from "@/lib/db/schema";
import { getVitrine, PISO_LIVROS, PISO_LIDOS } from "@/lib/vitrine";

const marca = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const pessoas: string[] = [];
const obras: string[] = [];

async function estante(nome: string, livros: number, lidos: number, visibility: "public" | "private" = "public") {
  const handle = `vit-${nome}-${marca}`;
  const [u] = await db
    .insert(users)
    .values({ handle, email: `${handle}@vitrine.test`, image: "https://example.com/f.jpg" })
    .returning({ id: users.id });
  pessoas.push(u!.id);
  for (let i = 0; i < livros; i++) {
    const [w] = await db.insert(works).values({ slug: `vit-${nome}-${i}-${marca}`, title: `zz vit ${nome} ${i} ${marca}` }).returning({ id: works.id });
    obras.push(w!.id);
    await db.insert(libraryEntries).values({ userId: u!.id, workId: w!.id, visibility, status: i < lidos ? "read" : "want_to_read" });
  }
  return handle;
}

afterAll(async () => {
  for (const id of pessoas) await db.execute(sql`delete from users where id = ${id}::uuid`);
  for (const id of obras) await db.execute(sql`delete from works where id = ${id}::uuid`);
});

describe("a vitrine da home", () => {
  it("só sorteia estante cheia, pública, e nunca a rala", async () => {
    const cheia = await estante("cheia", PISO_LIVROS, PISO_LIDOS);
    const rala = await estante("rala", 4, 1);
    const escondida = await estante("escondida", PISO_LIVROS, PISO_LIDOS, "private");

    const vistos = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const h = await getVitrine();
      expect(h).not.toBeNull();
      vistos.add(h!);
    }
    expect(vistos.has(rala)).toBe(false);
    expect(vistos.has(escondida)).toBe(false);

    // Todo sorteado cumpre o piso, contando só o que é público.
    for (const h of vistos) {
      const [c] = await db.execute<{ n: number; lidos: number }>(sql`
        select count(*)::int as n, count(*) filter (where le.status = 'read')::int as lidos
          from users u join library_entries le on le.user_id = u.id and le.visibility = 'public'
         where u.handle = ${h}`);
      expect(c!.n).toBeGreaterThanOrEqual(PISO_LIVROS);
      expect(c!.lidos).toBeGreaterThanOrEqual(PISO_LIDOS);
    }
    void cheia;
  });
});
