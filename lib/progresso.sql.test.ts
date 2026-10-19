import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, works, libraryEntries, readings } from "@/lib/db/schema";
import { jaLiQuais, progressoDe, progressoNaLista } from "@/lib/progresso";

/**
 * ════════════════════════════════════════════════════════════════════
 *  QUANTOS DESTA LISTA VOCÊ LEU. Contra Postgres de verdade.
 *
 *  Duas promessas moram aqui:
 *
 *  1. A CONTA. Lido é leitura TERMINADA. Ter o livro não é ler, estar lendo não
 *     é ler, abandonar não é ler, e reler não conta duas vezes.
 *
 *  2. O PROGRESSO É SEMPRE DE QUEM OLHA. Não existe parâmetro para pedir o de
 *     outra pessoa, e o teste estrutural lá embaixo quebra o build se uma
 *     consulta deste módulo ler `library_entries` sem amarrar em `viewer.id`.
 *     É essa amarra que impede o "12 de 40" de virar placar: o app nunca sabe
 *     o número de ninguém além de quem está na frente da tela.
 * ════════════════════════════════════════════════════════════════════
 */

let leitor: { id: string };
let outro: { id: string };
/** Terminado, abandonado, só na estante, relido duas vezes. */
let terminado: string;
let abandonado: string;
let soTenho: string;
let relido: string;

const criados: string[] = [];
const obras: string[] = [];
const marca = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** Põe a obra na estante da pessoa e devolve o id da entrada. */
async function naEstante(userId: string, workId: string) {
  const [e] = await db
    .insert(libraryEntries)
    .values({ userId, workId })
    .returning({ id: libraryEntries.id });
  return e!.id;
}

beforeAll(async () => {
  const mk = async (handle: string) => {
    const [u] = await db
      .insert(users)
      .values({ handle, email: `${handle}@progresso.test`, emailVerified: true })
      .returning({ id: users.id });
    criados.push(u!.id);
    return { id: u!.id };
  };

  const obra = async (nome: string) => {
    const [w] = await db
      .insert(works)
      .values({ slug: `progresso-${nome}-${marca}`, title: `${nome} ${marca}` })
      .returning({ id: works.id });
    obras.push(w!.id);
    return w!.id;
  };

  leitor = await mk(`progresso-leitor-${marca}`);
  outro = await mk(`progresso-outro-${marca}`);

  terminado = await obra("terminado");
  abandonado = await obra("abandonado");
  soTenho = await obra("so-tenho");
  relido = await obra("relido");

  await db.insert(readings).values({
    entryId: await naEstante(leitor.id, terminado),
    finishedOn: "2026-03-10",
  });

  await db.insert(readings).values({
    entryId: await naEstante(leitor.id, abandonado),
    startedOn: "2026-01-02",
    abandonedOn: "2026-02-01",
  });

  // Na estante e nada mais: ter não é ler.
  await naEstante(leitor.id, soTenho);

  const entradaDoRelido = await naEstante(leitor.id, relido);
  await db.insert(readings).values([
    { entryId: entradaDoRelido, finishedOn: "2019-05-01" },
    { entryId: entradaDoRelido, finishedOn: "2026-05-01" },
  ]);
});

afterAll(async () => {
  for (const id of criados) await db.execute(sql`delete from users where id = ${id}::uuid`);
  await db.execute(sql`delete from works where id = any(${sql.param(obras)}::uuid[])`);
});

describe("o que conta como lido", () => {
  it("uma leitura terminada conta", async () => {
    expect(await jaLiQuais(leitor, [terminado])).toEqual(new Set([terminado]));
  });

  /**
   * A REGRA QUE O DONO DECIDIU, e ela não é óbvia: abandonar poderia valer como
   * "resolvido para mim". Não vale. O oposto transformaria desistir num jeito de
   * fechar a lista, e o abandono no Gume é de primeira classe justamente por não
   * ser nem fracasso nem atalho.
   */
  it("abandonar não é ler", async () => {
    expect(await jaLiQuais(leitor, [abandonado])).toEqual(new Set());
  });

  it("ter o livro na estante não é ler", async () => {
    expect(await jaLiQuais(leitor, [soTenho])).toEqual(new Set());
  });

  it("reler não conta duas vezes: a pergunta é QUAIS, não quantas vezes", async () => {
    const lidos = await jaLiQuais(leitor, [relido]);
    expect(lidos.size).toBe(1);

    const p = await progressoNaLista(leitor, [relido, terminado, abandonado, soTenho]);
    expect(p.lidos, "a releitura inflou o progresso").toBe(2);
    expect(p.total).toBe(4);
    expect(p.pct).toBe(50);
  });
});

describe("o progresso é de quem olha, e de mais ninguém", () => {
  it("a leitura de outra pessoa não entra no meu progresso", async () => {
    expect(await jaLiQuais(outro, [terminado, relido])).toEqual(new Set());

    const p = await progressoNaLista(outro, [terminado, relido]);
    expect(p.lidos, "o progresso de alguém vazou para outra conta").toBe(0);
  });

  it("quem não entrou não recebe progresso nenhum", async () => {
    expect(await jaLiQuais(null, [terminado])).toEqual(new Set());
    expect((await progressoNaLista(null, [terminado])).lidos).toBe(0);
  });

  it("lista vazia é zero, e não divisão por zero", async () => {
    expect(await progressoNaLista(leitor, [])).toEqual({ lidos: 0, total: 0, pct: 0 });
    expect(progressoDe(0, 0).pct).toBe(0);
  });

  it("a porcentagem arredonda, e fecha em 100 quando leu tudo", () => {
    expect(progressoDe(1, 3).pct).toBe(33);
    expect(progressoDe(2, 3).pct).toBe(67);
    expect(progressoDe(40, 40).pct).toBe(100);
  });

  /**
   * ════════════════════════════════════════════════════════════════════
   *  A TRAVA: NENHUMA CONSULTA DAQUI LÊ A LEITURA DE OUTRA PESSOA.
   *
   *  A defesa de verdade é o desenho (não existe parâmetro de userId neste
   *  módulo), e o desenho se perde numa refatoração distraída: basta alguém
   *  achar útil receber um `ownerId` "só para a página do perfil". No dia em que
   *  isso acontecer, "12 de 40" vira um número que se põe ao lado do de outra
   *  pessoa, e o Gume passa a ter o placar que recusou desde o primeiro dia.
   *
   *  Então o build quebra antes.
   * ════════════════════════════════════════════════════════════════════
   */
  it("toda consulta deste módulo amarra library_entries no viewer, e nada mais", () => {
    const src = readFileSync("lib/progresso.ts", "utf8");

    const consultas = src.split(/\bsql`/).slice(1).map((b) => b.split("`")[0] ?? "");
    expect(consultas.length, "lib/progresso.ts ficou sem consulta nenhuma").toBeGreaterThan(0);

    for (const consulta of consultas) {
      if (!/\blibrary_entries\b/.test(consulta)) continue;
      expect(
        /user_id\s*=\s*\$\{viewer\.id\}/.test(consulta),
        "uma consulta lê library_entries sem amarrar no viewer: o progresso de " +
          "uma pessoa pode sair na tela de outra, e aí ele vira placar.",
      ).toBe(true);
    }
  });

  it("nenhuma função daqui aceita o id de outra pessoa", () => {
    const src = readFileSync("lib/progresso.ts", "utf8");

    for (const assinatura of src.match(/export (?:async )?function [^)]*\)/g) ?? []) {
      expect(
        /\b(ownerId|userId|user_id|alvo|donoId)\b/.test(assinatura),
        `${assinatura.split("(")[0]} passou a aceitar o id de outra pessoa. ` +
          "O progresso é de quem olha, e a garantia é não haver como pedir o alheio.",
      ).toBe(false);
    }
  });
});
