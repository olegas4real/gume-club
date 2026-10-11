import { describe, it, expect } from "vitest";
import {
  validarValor,
  ehTier,
  reais,
  MINIMO_CENTAVOS,
  MAXIMO_CENTAVOS,
  DIAS_DE_AVULSO,
  TIERS,
} from "@/lib/apoio";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O VALOR DO APOIO, CONFERIDO NO SERVIDOR.
 *
 *  A tela confere para a pessoa não errar. Este arquivo prova que o servidor confere de
 *  novo, porque quem manda o POST direto não passa por tela nenhuma. Um valor negativo,
 *  um zero ou um "1e9" entrariam inteiros na sessão de checkout.
 * ════════════════════════════════════════════════════════════════════
 */
describe("o valor do apoio avulso", () => {
  it("aceita o mínimo", () => {
    expect(validarValor(MINIMO_CENTAVOS)).toEqual({ ok: true, centavos: MINIMO_CENTAVOS });
  });

  it("recusa um centavo abaixo do mínimo", () => {
    const r = validarValor(MINIMO_CENTAVOS - 1);
    expect(r.ok).toBe(false);
  });

  /**
   * Zero e negativo não são "valores pequenos": são um jeito de criar cobrança de graça,
   * e no caso do negativo o Stripe recusaria, mas só depois de a rota ter aberto uma
   * sessão em nome de alguém.
   */
  it.each([0, -1, -100_000])("recusa %i", (v) => {
    expect(validarValor(v).ok).toBe(false);
  });

  /**
   * O teto existe pelo motivo oposto ao do piso: o campo é em REAIS, e o erro clássico é
   * a pessoa digitar pensando em centavos. Um apoio de cinquenta mil reais é um acidente,
   * e não uma generosidade.
   */
  it("recusa acima do teto", () => {
    expect(validarValor(MAXIMO_CENTAVOS + 1).ok).toBe(false);
    expect(validarValor(MAXIMO_CENTAVOS).ok).toBe(true);
  });

  /** Centavo é inteiro. Meio centavo não existe, e arredondar aqui seria inventar valor. */
  it.each([5.5, 1000.01, NaN, Infinity])("recusa o que não é inteiro: %s", (v) => {
    expect(validarValor(v).ok).toBe(false);
  });

  it("recusa texto e nulo", () => {
    for (const v of ["muito", "", null, undefined, {}, []]) {
      expect(validarValor(v).ok, `${JSON.stringify(v)} passou`).toBe(false);
    }
  });

  /**
   * O motivo da recusa é lido por gente, e vai para a tela. Uma mensagem vazia ou com
   * nome de variável dentro é como jargão de dev chega no leitor.
   */
  it("a recusa explica em português, e cita o valor", () => {
    const r = validarValor(1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.porque.length).toBeGreaterThan(10);
      expect(r.porque).toContain(reais(MINIMO_CENTAVOS));
    }
  });
});

describe("dinheiro na tela", () => {
  it("sai em real, e com vírgula", () => {
    expect(reais(500)).toMatch(/R\$\s?5,00/);
    expect(reais(1990)).toMatch(/R\$\s?19,90/);
  });
});

describe("os planos", () => {
  it("são três, e o tier só aceita esses três", () => {
    expect(TIERS).toHaveLength(3);
    for (const t of TIERS) expect(ehTier(t)).toBe(true);
  });

  /**
   * O tier chega pela rede, do corpo de um POST. Sem esta checagem ele iria direto para
   * uma consulta de preço e, pior, para um `insert` numa coluna com check constraint: o
   * erro apareceria como um 500 no meio de um pagamento.
   */
  it.each(["", "admin", "MARCADOR", "capa dura", null, 7, {}])("recusa %s", (v) => {
    expect(ehTier(v)).toBe(false);
  });
});

describe("a janela do apoio avulso", () => {
  /**
   * Trinta dias, num lugar só. Se este número mudar, ele muda aqui e em mais nenhum
   * lugar: a fórmula do banco lê esta constante. O teste existe para o dia em que alguém
   * escrever "30" de novo dentro de uma consulta.
   */
  it("é de 30 dias", () => {
    expect(DIAS_DE_AVULSO).toBe(30);
  });
});

/**
 * A CONTA DO MÊS não pode entregar quanto uma pessoa paga. Com uma ou duas pessoas
 * apoiando, "X de R$ 110 cobertos" diria o valor delas, e a lista de apoiadores é
 * pública. Ver APOIADORES_PRA_MOSTRAR_COBERTURA em lib/apoio.ts.
 */
describe("a conta do mês", () => {
  it("com menos de três apoiadores, a cobertura não aparece", async () => {
    const { contaDoMes, APOIADORES_PRA_MOSTRAR_COBERTURA } = await import("@/lib/apoio");
    for (let n = 0; n < APOIADORES_PRA_MOSTRAR_COBERTURA; n++) {
      expect(contaDoMes(n, 490).cobertura, `com ${n} apoiador(es) a soma vazou`).toBeNull();
    }
  });

  it("com gente suficiente, a cobertura é a fração do custo", async () => {
    const { contaDoMes, CUSTO_MENSAL_CENTAVOS } = await import("@/lib/apoio");
    expect(contaDoMes(3, CUSTO_MENSAL_CENTAVOS / 2).cobertura).toBeCloseTo(0.5);
  });

  it("os preços dos planos vêm de um lugar só", async () => {
    const fonte = (await import("node:fs")).readFileSync("app/apoiar/page.tsx", "utf8");
    expect(fonte, "preço escrito à mão na /apoiar: use PRECO_CENTAVOS").not.toMatch(/"R\$ \d/);
  });
});
