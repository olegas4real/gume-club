import type { Status } from "@/lib/library";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O LIVRO IMPORTADO. O contrato entre todo parser e o gravador.
 *
 *  A RÉGUA É SEM PERDAS: datas de leitura, notas, texto de resenha,
 *  prateleiras, ISBN. Se a exportação carrega, este tipo guarda.
 *
 *  Não é um objetivo, é a definição de pronto. Uma migração pela metade
 *  é PIOR que nenhuma: ela gasta o entusiasmo da pessoa e entrega uma
 *  estante mutilada, que ela vai ter que consertar à mão para sempre. É
 *  o maior motivo isolado de ninguém terminar de sair de uma plataforma
 *  que já superou, e é o motivo de este arquivo existir.
 *
 *  O "colar uma lista" continua sendo um bom paliativo, e ele PERDE
 *  TUDO: data, nota, resenha, prateleira. Isto aqui é o oposto dele.
 * ════════════════════════════════════════════════════════════════════
 */
export type LivroImportado = {
  // ── quem é o livro ────────────────────────────────────────────────
  titulo: string;
  autor: string | null;
  isbn13: string | null;
  isbn10: string | null;

  // ── qual edição é a sua ───────────────────────────────────────────
  editora: string | null;
  anoEdicao: number | null;
  /** O ano em que a OBRA foi escrita. Outro fato, e o schema separa de propósito. */
  anoObra: number | null;
  paginas: number | null;

  /**
   * CAPA DURA, BROCHURA, E-BOOK, AUDIOLIVRO.
   *
   * O Goodreads chama a coluna de "Binding", e ela estava sendo JOGADA FORA.
   *
   * Numa estante de verdade isso não é detalhe: a planilha que virou este produto tinha
   * 29 capas duras de 44 livros. **Essa pessoa coleciona objetos, não arquivos** — e o
   * formato é a coluna que diz isso. Perdê-la é apagar metade do que a estante conta.
   */
  formato: Formato | null;

  // ── onde ela está na sua estante ──────────────────────────────────
  status: Status;
  /** As prateleiras que a PESSOA inventou. Viram `collections`. */
  prateleiras: string[];

  /**
   * Uma leitura por vez que leu. RELER É DE PRIMEIRA CLASSE.
   *
   * Datas em "YYYY-MM-DD", porque `readings.started_on` é `date` e nunca
   * `timestamptz`: um timestamp aqui faz um livro terminado em 31 de dezembro,
   * por quem não vive em UTC, cair no ANO ERRADO da retrospectiva.
   *
   * Uma leitura sem data é um FATO ("eu li, não sei quando"), e não um erro: as
   * duas colunas são anuláveis exatamente para isso.
   */
  leituras: Leitura[];

  // ── o que você achou ──────────────────────────────────────────────
  /** 1..5, como a FONTE guarda. Vira palavra na hora de gravar, e a perda é declarada. */
  estrelas: number | null;
  resenha: string | null;
  /** O que ela escreveu para si. O Goodreads exporta separado da resenha. */
  notaPrivada: string | null;

  // ── ter não é ler ─────────────────────────────────────────────────
  possui: boolean;

  /**
   * Estava RELENDO na origem (o Skoob tem essa estante). Entra como "lendo", e a leitura
   * anterior, que o arquivo não data, fica de fora: a gravação não distingue "terminei
   * sem data" de "estou lendo sem data". A prévia avisa. Ver lib/import/skoob.test.ts.
   */
  relendo?: true;
};

/** Os cinco formatos do schema. Nada fora disto entra: o banco tem um enum. */
export type Formato = "hardcover" | "paperback" | "ebook" | "audiobook" | "other";

export type Leitura = {
  comecou: string | null;
  terminou: string | null;
  abandonou: string | null;
};

/**
 * O que o import ACHOU e o que ele PERDEU, dito em voz alta.
 *
 * Perda declarada é honesta. Perda silenciosa é como o catálogo do concorrente
 * virou lixo: a pessoa só descobre dois anos depois, quando já não dá para voltar.
 */
export type Relatorio = {
  /** Quantas linhas o arquivo tinha, e quantas viraram livro. */
  linhas: number;
  entraram: number;
  /** Achamos no catálogo, ou criamos a ficha. */
  novos: number;
  /** Linhas que não deram em livro nenhum, com o motivo. */
  perdidos: { linha: string; porque: string }[];
  /** As perdas que a gente ASSUME, e que a pessoa precisa saber. */
  avisos: string[];
};

/** A fonte de onde o arquivo veio. `desconhecida` ainda é importável. */
export type Fonte = "goodreads" | "storygraph" | "skoob" | "fable" | "openreads" | "bookwyrm" | "desconhecida" | "lista";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O TAMANHO DO LOTE. E por que ele NÃO mora no arquivo de ações.
 *
 *  Ele morava em `app/importar/actions.ts`, que é um arquivo `"use server"` — e um arquivo
 *  `"use server"` **só pode exportar funções assíncronas**. Uma constante ali derruba a
 *  rota inteira com um 500, e nenhum teste pega: os testes importam o módulo direto, e é o
 *  compilador do Next que faz essa checagem, na hora de montar a página.
 *
 *  Foi o navegador que pegou. Vale registrar: o build e a suíte estavam verdes.
 *
 *  ═══ E POR QUE SESSENTA ═══
 *
 *  Quatrocentos livros são quatrocentas buscas no catálogo, e elas não cabem numa
 *  requisição: a função morre no meio, e a pessoa vê "erro" depois de dois minutos — por um
 *  arquivo que ela levou uma hora para tirar do outro app.
 *
 *  Sessenta é rápido o bastante para a barra andar de verdade, e grande o bastante para
 *  quatrocentos livros serem sete idas, e não quatrocentas.
 * ════════════════════════════════════════════════════════════════════
 */
export const LOTE = 60;

/**
 * ════════════════════════════════════════════════════════════════════
 *  ONDE O LIVRO DO ARQUIVO FOI PARAR NO CATÁLOGO.
 *
 *  Isto mora aqui, e não em `lib/import/casar.ts`, porque a TELA precisa ler — e
 *  `casar.ts` importa o banco. Um tipo importado de lá arrasta o `postgres` inteiro para
 *  dentro do bundle do navegador.
 *
 *  É a mesma razão de `lib/shelf-view.ts` e `lib/badges-view.ts` existirem: vocabulário
 *  não tem banco dentro.
 * ════════════════════════════════════════════════════════════════════
 */
export type Casamento = "isbn13" | "isbn10" | "openlibrary" | "titulo" | "novo";

export type Achado = {
  /** A linha do arquivo, como ela veio. */
  titulo: string;
  autor: string | null;

  /** Como a gente casou. "novo" quer dizer que a obra vai ser criada. */
  como: Casamento;

  /** O que existe no catálogo, quando existe. É o que a pessoa vai olhar. */
  slug: string | null;
  tituloNoCatalogo: string | null;
  autorNoCatalogo: string | null;
  coverUrl: string | null;
};

/**
 * É um FATO, ou é um PALPITE?
 *
 * Casar por ISBN é um número impresso na contracapa: ou bate, ou não bate. Casar por título
 * é uma aposta — e a tela mostra a diferença, porque a pessoa precisa poder desconfiar do
 * segundo sem ter que desconfiar do primeiro.
 */
export function ehFato(como: Casamento): boolean {
  return como === "isbn13" || como === "isbn10" || como === "openlibrary";
}

/**
 * ════════════════════════════════════════════════════════════════════
 *  O ISBN É UM FATO SOBRE O NÚMERO, NÃO SOBRE O ARQUIVO.
 *
 *  A auditoria de 2026-10-10 importou vinte linhas e viu seis "pelo ISBN, esses são
 *  certos". Três estavam errados: "Vidas Secas" virou "Neblina", "Cem Anos de Solidão"
 *  virou "1984". O casamento estava certo; o NÚMERO do arquivo é que estava errado. E
 *  número errado em arquivo de gente é a regra: o Goodreads exporta o ISBN da edição
 *  que a pessoa clicou um dia, planilha tem copiar e colar torto.
 *
 *  Então o ISBN continua mandando no casamento (a gravação usa o mesmo, e a prévia não
 *  pode mostrar uma coisa e gravar outra), mas ele perde o selo de "certo" quando o
 *  livro que ele aponta não se parece em NADA com o que o arquivo dizia: nem uma palavra
 *  do título, nem uma do nome do autor. Aí a linha desce para "confira", com os dois
 *  lados na tela, e a pessoa decide se desmarca.
 *
 *  A régua é frouxa de propósito. Uma palavra em comum basta ("Crime e Castigo" e
 *  "Crime and Punishment"; "García Márquez" e "Gabriel García Márquez"). Ela não existe
 *  para achar tradução: existe para pegar o erro grosseiro, o livro que é OUTRO.
 * ════════════════════════════════════════════════════════════════════
 */

/** Palavras que não dizem nada sobre qual livro é. */
const VAZIAS = new Set([
  "the", "and", "of", "a", "an", "o", "os", "as", "um", "uma", "de", "do", "da", "dos", "das",
  "e", "em", "no", "na", "el", "la", "los", "las", "y", "le", "les", "des", "du", "et", "vol",
  "volume", "livro", "book",
]);

function palavras(texto: string): Set<string> {
  return new Set(
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3 && !VAZIAS.has(p)),
  );
}

/** Pelo menos uma palavra que conta em comum. Sem palavra que conte, só igualdade serve. */
export function parecido(a: string, b: string): boolean {
  const pa = palavras(a);
  const pb = palavras(b);
  if (pa.size === 0 || pb.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  for (const p of pa) if (pb.has(p)) return true;
  return false;
}

/**
 * O ISBN casou com um livro que é OUTRO? Título e autor, os dois, sem nada em comum com
 * o que o arquivo trouxe. Sem autor dos dois lados, o título decide sozinho.
 */
export function isbnDiverge(a: Achado): boolean {
  if (!ehFato(a.como) || !a.tituloNoCatalogo) return false;
  if (parecido(a.titulo, a.tituloNoCatalogo)) return false;
  if (a.autor && a.autorNoCatalogo && parecido(a.autor, a.autorNoCatalogo)) return false;
  return true;
}

/**
 * Linhas do MESMO arquivo com o mesmo ISBN e títulos diferentes. Um número só não pode
 * ser dois livros: pelo menos uma das linhas está errada, e importar as duas caladas
 * faria uma sumir dentro da outra. Devolve os índices.
 */
export function isbnRepetido(livros: Pick<LivroImportado, "titulo" | "isbn13" | "isbn10">[]): Set<number> {
  const porIsbn = new Map<string, number[]>();
  livros.forEach((l, i) => {
    const isbn = l.isbn13 ?? l.isbn10;
    if (!isbn) return;
    porIsbn.set(isbn, [...(porIsbn.get(isbn) ?? []), i]);
  });

  const repetidos = new Set<number>();
  for (const indices of porIsbn.values()) {
    if (indices.length < 2) continue;
    const titulos = indices.map((i) => livros[i]!.titulo);
    if (titulos.every((t) => parecido(t, titulos[0]!))) continue; // a mesma linha duas vezes
    for (const i of indices) repetidos.add(i);
  }
  return repetidos;
}
