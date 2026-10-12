import { describe, it, expect, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getEscadas } from "@/lib/escada";

/**
 * As etiquetas ao lado do nome. Ver components/etiqueta-do-nome.tsx.
 */
const marca = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const criados: string[] = [];

async function leitor(nome: string, campos: Record<string, unknown>) {
  const handle = `etq-${nome}-${marca}`;
  const [u] = await db.insert(users).values({ handle, email: `${handle}@etq.test`, ...campos }).returning({ id: users.id });
  criados.push(u!.id);
  return u!.id;
}

afterAll(async () => {
  for (const id of criados) await db.execute(sql`delete from users where id = ${id}::uuid`);
});

const daqui30 = new Date(Date.now() + 30 * 86_400_000);

describe("a etiqueta de apoiador", () => {
  it("aparece para quem apoia e deixou público", async () => {
    const id = await leitor("pub", { avulsoBadgeUntil: daqui30, supporterPublic: true });
    expect((await getEscadas(id)).apoiaEmPublico).toBe(true);
  });

  it("não aparece para quem apoia em silêncio", async () => {
    const id = await leitor("silencio", { avulsoBadgeUntil: daqui30, supporterPublic: false });
    const e = await getEscadas(id);
    expect(e.apoia).toBe(true);
    expect(e.apoiaEmPublico).toBe(false);
  });

  it("some quando o apoio acaba", async () => {
    const id = await leitor("acabou", { avulsoBadgeUntil: new Date(Date.now() - 86_400_000), supporterPublic: true });
    expect((await getEscadas(id)).apoiaEmPublico).toBe(false);
  });
});

describe("o idealizador", () => {
  it("é uma etiqueta escrita, e não um ícone sem legenda", () => {
    const perfil = readFileSync("app/[handle]/page.tsx", "utf8");
    expect(perfil).toContain('<EtiquetaDoNome tipo="idealizador" />');
    expect(perfil).not.toContain("SeloIdealizador");
    expect(readFileSync("components/etiqueta-do-nome.tsx", "utf8")).toContain('texto: "idealizador"');
  });
});
