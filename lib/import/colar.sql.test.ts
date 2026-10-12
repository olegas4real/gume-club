import { describe, it, expect, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, works, authors } from "@/lib/db/schema";
import { lerLista } from "@/lib/import/colar";
import { procurarDaLista, aplicarDoAcervo } from "@/lib/import/colar-acervo";

/**
 * A lista colada, perguntada ao banco de verdade. Ver lib/import/colar-acervo.ts.
 */
const marca = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const pessoas: string[] = [];
const obras: string[] = [];
const autores: string[] = [];

async function leitor() {
  const handle = `colar-${marca}-${pessoas.length}`;
  const [u] = await db.insert(users).values({ handle, email: `${handle}@colar.test` }).returning({ id: users.id });
  pessoas.push(u!.id);
  return { id: u!.id };
}

afterAll(async () => {
  for (const id of pessoas) await db.execute(sql`delete from users where id = ${id}::uuid`);
  for (const id of obras) await db.execute(sql`delete from works where id = ${id}::uuid`);
  for (const id of autores) await db.execute(sql`delete from authors where id = ${id}::uuid`);
});

const opcoes = { limite: 100, tamanho: 200 };

describe("colar uma lista", () => {
  it("uma linha que não bate com nada não vira livro, nem ficha nova", async () => {
    const eu = await leitor();
    const inventado = `zz nada casa com isto ${marca}`;
    const { livros } = lerLista(`${inventado} - Ninguém Escreveu ${marca}`, "read", opcoes);

    const { achados } = await procurarDaLista(livros);
    expect(achados[0]!.como).toBe("novo");

    // Mesmo que o navegador mande a linha para gravar, o servidor recusa.
    const r = await aplicarDoAcervo(eu, livros);
    expect(r.entraram).toBe(0);
    expect(r.perdidos).toHaveLength(1);

    const [naEstante] = await db.execute(sql`select 1 from library_entries where user_id = ${eu.id}::uuid`);
    expect(naEstante).toBeUndefined();
    const [ficha] = await db.execute(sql`select 1 from works where title ilike ${"%" + inventado + "%"}`);
    expect(ficha).toBeUndefined();
  });

  it("uma linha que casa entra na estante, no status escolhido", async () => {
    const eu = await leitor();
    const [a] = await db.insert(authors).values({ name: `Autora Colar ${marca}`, slug: `autora-colar-${marca}` }).returning({ id: authors.id });
    autores.push(a!.id);
    const titulo = `zz colar existe ${marca}`;
    const [w] = await db.insert(works).values({ slug: `colar-${marca}`, title: titulo, authorId: a!.id }).returning({ id: works.id });
    obras.push(w!.id);

    const { livros } = lerLista(`1. ${titulo} (Autora Colar ${marca})`, "reading", opcoes);
    const { livros: candidatos, achados } = await procurarDaLista(livros);
    expect(achados[0]!.como).toBe("titulo");
    expect(achados[0]!.slug).toBe(`colar-${marca}`);

    const r = await aplicarDoAcervo(eu, candidatos);
    expect(r.entraram).toBe(1);
    const [e] = await db.execute<{ work_id: string; status: string }>(sql`
      select work_id, status from library_entries where user_id = ${eu.id}::uuid`);
    expect(e!.work_id).toBe(w!.id);
    expect(e!.status).toBe("reading");
  });
});
