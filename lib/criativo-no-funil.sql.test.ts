import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { POST } from "@/app/api/eventos/route";
import { normalizarRotulo } from "@/lib/funil";

/**
 * ════════════════════════════════════════════════════════════════════
 *  QUAL PEÇA DO ANÚNCIO TROUXE QUEM VIROU GENTE. Ver a migration 0070.
 *
 *  A 0069 respondeu "de que REDE vêm os cadastros". Com três criativos
 *  rodando no mesmo Instagram, isso parou de responder qualquer coisa: os
 *  três caem no balde "instagram", e o relatório volta a ser o número inútil
 *  que o funil existe para matar.
 *
 *  Este teste cobra as duas metades: o rótulo ENTRA quando tem a forma certa,
 *  e NÃO entra quando não tem — inclusive quando alguém forja a URL.
 * ════════════════════════════════════════════════════════════════════
 */

const SUFIXO = "teste-criativo";

async function limpar() {
  await db.execute(sql`delete from eventos_funil where campanha like ${`%${SUFIXO}%`} or criativo like ${`%${SUFIXO}%`}`);
}

beforeEach(limpar);
afterAll(limpar);

/** Um POST na rota de eventos, como o navegador faz. */
async function evento(corpo: Record<string, unknown>, sessao = randomUUID()) {
  const res = await POST(new Request("https://gume.club/api/eventos", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `gume_sessao_anon=${sessao}` },
    body: JSON.stringify(corpo),
  }));
  return { res, sessao };
}

describe("o rótulo da peça, antes de tocar o banco", () => {
  it("aceita o que tem a forma de rótulo de anúncio", () => {
    expect(normalizarRotulo("angulos-out2026")).toBe("angulos-out2026");
    expect(normalizarRotulo("estante")).toBe("estante");
    expect(normalizarRotulo("A_B-2026")).toBe("a_b-2026"); // minúsculas
    expect(normalizarRotulo("  estante  ")).toBe("estante"); // sem borda
  });

  /**
   * Tudo ou nada, e não "limpa o que dá". Sanear o que sobra depois de tirar o
   * que não era para estar ali grava um rótulo que ninguém escreveu, e que não
   * casa com anúncio nenhum — um dado errado que PARECE certo.
   */
  it("recusa inteiro o que não tem a forma, em vez de limpar pela metade", () => {
    expect(normalizarRotulo("marina@exemplo.com")).toBeNull();
    expect(normalizarRotulo("estante; drop table")).toBeNull();
    expect(normalizarRotulo("peça com espaço")).toBeNull();
    expect(normalizarRotulo("<script>")).toBeNull();
    expect(normalizarRotulo("a".repeat(41))).toBeNull(); // mais de 40
    expect(normalizarRotulo("")).toBeNull();
    expect(normalizarRotulo(null)).toBeNull();
    expect(normalizarRotulo(42)).toBeNull();
    expect(normalizarRotulo({ campanha: "x" })).toBeNull();
  });
});

describe("a peça chega ao banco pelo caminho de verdade", () => {
  it("grava campanha e criativo quando o navegador manda os dois", async () => {
    const { sessao } = await evento({
      tipo: "visita_home",
      origem: "instagram",
      campanha: `${SUFIXO}-campanha`,
      criativo: `${SUFIXO}-estante`,
    });

    const [linha] = await db.execute<{ campanha: string; criativo: string; origem: string }>(sql`
      select campanha, criativo, origem from eventos_funil where sessao_anon = ${sessao}::uuid`);

    expect(linha?.campanha).toBe(`${SUFIXO}-campanha`);
    expect(linha?.criativo).toBe(`${SUFIXO}-estante`);
    // A origem continua funcionando como antes: a peça é uma dimensão NOVA,
    // e não a substituição de nada.
    expect(linha?.origem).toBe("instagram");
  });

  it("uma peça forjada vira nulo, e o evento continua valendo", async () => {
    const { res, sessao } = await evento({
      tipo: "visita_home",
      origem: "instagram",
      campanha: "marina@exemplo.com",
      criativo: `${SUFIXO}-ok`,
    });

    expect(res.status).toBe(200); // o evento não é descartado por causa do rótulo

    const [linha] = await db.execute<{ campanha: string | null; criativo: string }>(sql`
      select campanha, criativo from eventos_funil where sessao_anon = ${sessao}::uuid`);

    expect(linha?.campanha).toBeNull();
    expect(linha?.criativo).toBe(`${SUFIXO}-ok`);
  });

  it("sem peça nenhuma, as colunas ficam nulas: visita orgânica não inventa campanha", async () => {
    const { sessao } = await evento({ tipo: "visita_home", origem: "google" });

    const [linha] = await db.execute<{ campanha: string | null; criativo: string | null }>(sql`
      select campanha, criativo from eventos_funil where sessao_anon = ${sessao}::uuid`);

    expect(linha?.campanha).toBeNull();
    expect(linha?.criativo).toBeNull();
  });

  /**
   * O ponto da fatia inteira: a peça é observada na VISITA (é ali que a URL
   * traz o utm) e o cadastro acontece depois, já sem parâmetro nenhum. Se a
   * leitura não costurasse os dois pela sessão, toda peça teria visita e zero
   * cadastro, para sempre.
   */
  it("a peça vista na visita vale para o cadastro da MESMA sessão", async () => {
    const sessao = randomUUID();
    await evento({ tipo: "visita_home", origem: "instagram", campanha: `${SUFIXO}-c`, criativo: `${SUFIXO}-palavra` }, sessao);
    await evento({ tipo: "cadastro_ok", origem: "instagram" }, sessao);

    const [linha] = await db.execute<{ criativo: string; cadastros: number }>(sql`
      with peca as (
        select sessao_anon,
               (array_agg(criativo order by criado_em) filter (where criativo is not null))[1] as criativo
          from eventos_funil where sessao_anon = ${sessao}::uuid group by sessao_anon
      )
      select p.criativo,
             count(distinct e.sessao_anon) filter (where e.tipo = 'cadastro_ok')::int as cadastros
        from eventos_funil e join peca p using (sessao_anon)
       group by 1`);

    expect(linha?.criativo).toBe(`${SUFIXO}-palavra`);
    expect(linha?.cadastros).toBe(1);
  });
});

/**
 * A lei da 0069 não afrouxou porque a tabela ganhou duas colunas. Este teste é
 * o mesmo do eventos-funil.sql.test.ts, repetido de propósito: a tabela que
 * acabou de crescer é exatamente a hora em que alguém acrescenta um `user_id`
 * "só para cruzar com o cadastro".
 */
describe("e a tabela continua sem apontar para gente", () => {
  it("nenhuma coluna nova aponta para uma pessoa", async () => {
    const cols = await db.execute<{ column_name: string }>(sql`
      select column_name from information_schema.columns where table_name = 'eventos_funil'`);

    const nomes = cols.map((c) => c.column_name);
    expect(nomes).toContain("campanha");
    expect(nomes).toContain("criativo");
    expect(
      nomes.filter((n) => /user|usuario|viewer|leitor|email|nome|name|\bip\b|agent|fingerprint/i.test(n)),
      "a tabela do funil ganhou uma coluna que aponta para gente",
    ).toEqual([]);
  });
});
