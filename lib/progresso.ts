import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/authz";

/**
 * ════════════════════════════════════════════════════════════════════
 *  QUANTOS DESTA LISTA VOCÊ JÁ LEU. E a resposta é só sua.
 *
 *  Uma lista curada só serve se você enxerga onde está o buraco. Era o que
 *  faltava: abrir a estante de outra pessoa e não saber quais daqueles livros já
 *  passaram por você. É o mesmo gesto do volume de mangá que falta aparecendo em
 *  cinza — mostrar a lacuna, nunca cobrar que ela se feche.
 *
 *  ═══ POR QUE ISTO NÃO MORA EM lib/listas.ts ═══
 *
 *  Porque lá um teste estrutural quebra o build se qualquer consulta do módulo
 *  contar em volta de `readings` ou `library_entries`, e essa trava protege a
 *  recusa mais antiga do projeto: contador de gente em volta de leitura.
 *
 *  Esta conta não é dessa família (ela conta LIVROS SEUS, não gente), mas a
 *  diferença é fina demais para se defender com uma exceção dentro da trava
 *  alheia: uma exceção a mais naquele regex e a regra global fica um pouco mais
 *  frouxa para sempre. Módulo novo, trava nova, e as duas continuam inteiras.
 *
 *  ═══ A TRAVA DESTE MÓDULO: O PROGRESSO É SEMPRE DO VIEWER ═══
 *
 *  Nenhuma função daqui aceita o id de OUTRA pessoa. Não é "a gente filtra
 *  direitinho": é que não existe parâmetro para pedir o progresso alheio, então
 *  trocar um UUID no corpo da requisição não leva a lugar nenhum. O id sai do
 *  viewer e de mais lugar nenhum, e lib/progresso.sql.test.ts quebra o build se
 *  uma consulta daqui ler `library_entries` sem amarrar em `viewer.id`.
 *
 *  É isso que mantém a promessa de pé: "12 de 40" é um número sobre você e uma
 *  lista, e nunca um número que se põe ao lado do de outra pessoa. Sem placar de
 *  quem completou mais, porque o app nunca sabe o de ninguém além de quem olha.
 *
 *  ═══ O QUE CONTA COMO LIDO ═══
 *
 *  Uma leitura TERMINADA (`finished_on` preenchido), que é a mesma régua de
 *  lib/stats.ts. Não vale ter o livro, não vale estar lendo, e não vale
 *  abandonar: o oposto transformaria desistir num jeito de fechar a lista, e
 *  abandono aqui não é fracasso nem atalho, é só outra coisa.
 *
 *  Reler não infla: a obra conta uma vez (`distinct`), porque a pergunta é
 *  "quais destes eu li", e não "quantas vezes".
 * ════════════════════════════════════════════════════════════════════
 */

/** O progresso de quem olha, sobre uma lista. Nunca o de outra pessoa. */
export type Progresso = {
  /** Quantas obras desta lista você terminou. */
  lidos: number;
  /** O tamanho da lista. */
  total: number;
  /** Inteiro de 0 a 100, arredondado. Lista vazia é 0, e não divisão por zero. */
  pct: number;
};

/**
 * QUAIS destas obras você já leu. O conjunto vazio é resposta legítima (você não
 * leu nenhuma); quem não entrou recebe vazio também, e a tela não mostra nada.
 */
export async function jaLiQuais(viewer: Viewer, workIds: string[]): Promise<Set<string>> {
  if (!viewer || workIds.length === 0) return new Set();

  const rows = await db.execute<{ work_id: string }>(sql`
    select distinct le.work_id
      from library_entries le
      join readings r on r.entry_id = le.id
     where le.user_id = ${viewer.id}::uuid
       and le.work_id = any(${sql.param(workIds)}::uuid[])
       and r.finished_on is not null`);

  return new Set(rows.map((r) => r.work_id));
}

/**
 * O progresso já contado, para a linha da tela. `lidos` nunca passa de `total`
 * porque o conjunto vem da própria lista.
 */
export function progressoDe(lidos: number, total: number): Progresso {
  return { lidos, total, pct: total === 0 ? 0 : Math.round((lidos / total) * 100) };
}

/** As duas coisas de uma vez, que é como toda tela usa. */
export async function progressoNaLista(viewer: Viewer, workIds: string[]): Promise<Progresso> {
  const lidos = await jaLiQuais(viewer, workIds);
  return progressoDe(lidos.size, workIds.length);
}
