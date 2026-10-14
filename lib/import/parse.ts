import { parseCsvObjetos, isbn as lerIsbn, ano as lerAno, data as lerData } from "@/lib/import/csv";
import type { LivroImportado, Leitura, Fonte, Formato } from "@/lib/import/tipos";
import { STATUSES, type Status } from "@/lib/library";

/**
 * ════════════════════════════════════════════════════════════════════
 *  DE UM CSV QUALQUER PARA UM LIVRO. Sem perdas.
 *
 *  A fonte é DETECTADA pelos cabeçalhos, e não perguntada: a pessoa
 *  acabou de baixar um arquivo de um site e não tem a menor obrigação
 *  de saber como ele se chama. Um menu "de onde veio este arquivo?" é
 *  uma pergunta que o app consegue responder sozinho.
 *
 *  E um arquivo que a gente NÃO reconhece ainda é importado: as colunas
 *  são casadas por apelido, e o que casar entra. Metade de uma estante é
 *  melhor que uma mensagem de erro, DESDE QUE a pessoa saiba o que veio
 *  e o que não veio, e é para isso que existe o relatório.
 * ════════════════════════════════════════════════════════════════════
 */

/** As colunas que denunciam cada fonte. Uma basta. */
const ASSINATURAS: [Fonte, string[]][] = [
  ["goodreads", ["exclusive_shelf", "bookshelves", "my_rating"]],
  ["storygraph", ["read_status", "star_rating", "dates_read"]],
  ["fable", ["fable_id", "reading_status"]],
  // Openreads: o formato está em doc/csv.md do projeto. "readings" é a coluna que só ele tem.
  ["openreads", ["readings", "book_format"]],
  // BookWyrm: views/preferences/export.py. "author_text" e "review_cw" são dele.
  ["bookwyrm", ["author_text", "review_cw", "shelf_name"]],
  ["skoob", ["skoob_id", "estante"]],
];

export function detectar(texto: string): Fonte {
  const [primeira] = parseCsvObjetos(texto);
  if (!primeira) return "desconhecida";

  const colunas = Object.keys(primeira);
  for (const [fonte, marcas] of ASSINATURAS) {
    if (marcas.some((m) => colunas.includes(m))) return fonte;
  }
  return "desconhecida";
}

/**
 * Os apelidos de cada campo, em ordem de preferência.
 *
 * Uma lista, e não um `if` por fonte: os arquivos de verdade divergem em detalhes
 * bobos ("Author" e "Authors", "ISBN13" e "ISBN/UID"), e um `if` por fonte vira
 * quatro cópias da mesma tradução, das quais três ficam desatualizadas.
 */
const APELIDOS = {
  titulo: ["title", "titulo", "book", "livro", "nome"],
  autor: ["author", "authors", "autor", "autores", "primary_author", "author_l_f", "author_text"],
  isbn13: ["isbn13", "isbn_13", "isbn_uid", "isbn"],
  isbn10: ["isbn10", "isbn_10"],
  editora: ["publisher", "editora"],
  anoEdicao: ["year_published", "publication_year", "ano_de_publicacao", "ano_da_edicao"],
  anoObra: ["original_publication_year", "ano_em_que_a_obra_foi_escrita", "ano_da_obra"],
  paginas: ["number_of_pages", "pages", "paginas", "page_count"],
  formato: ["binding", "format", "formato", "edition_format", "book_format"],
  estrelas: ["my_rating", "star_rating", "rating", "nota", "minha_nota"],
  resenha: ["my_review", "review", "resenha", "review_content"],
  notaPrivada: ["private_notes", "notes", "comments", "notas_privadas"],
  prateleiras: ["bookshelves", "tags", "shelves", "prateleiras", "estantes"],
  statusBruto: ["exclusive_shelf", "read_status", "reading_status", "estante", "lido", "status", "shelf"],
  possui: ["owned", "owned_copies", "possui"],
  vezes: ["read_count", "times_read"],
  terminou: ["date_read", "last_date_read", "data_de_leitura", "finished", "finish_date"],
  comecou: ["date_started", "started", "data_de_inicio", "start_date"],
  /** BookWyrm: o dia em que a pessoa parou de ler. */
  parou: ["stopped_date"],
  varias: ["dates_read"],
  /** Openreads: "começo|fim|tempo" por leitura, as leituras separadas por ";". */
  sessoes: ["readings"],
  /** Openreads: o livro que a pessoa apagou lá continua no arquivo, marcado. */
  apagado: ["deleted"],
  /** BookWyrm: o NOME da estante, quando ela é uma que a pessoa criou. */
  nomeDaEstante: ["shelf_name"],
} as const;

function pega(linha: Record<string, string>, apelidos: readonly string[]): string | undefined {
  for (const a of apelidos) {
    const v = linha[a];
    if (v !== undefined && v.trim() !== "") return v.trim();
  }
  return undefined;
}

/**
 * A prateleira exclusiva vira STATUS.
 *
 * "to-read", "currently-reading" e "read" NÃO viram prateleira inventada: elas já
 * SÃO o status. Criar uma estante chamada "read" com 300 livros dentro é ruído, e
 * é exatamente o lixo que outros importadores despejam na conta da pessoa.
 */
const STATUS_DE: Record<string, Status> = {
  "to-read": "want_to_read",
  "to_read": "want_to_read",
  "want to read": "want_to_read",
  "quero ler": "want_to_read",
  "nao lido": "want_to_read",
  "currently-reading": "reading",
  "currently reading": "reading",
  "reading": "reading",
  "lendo": "reading",
  "read": "read",
  "lido": "read",
  "finished": "read",
  "did-not-finish": "did_not_finish",
  "did not finish": "did_not_finish",
  "dnf": "did_not_finish",
  "abandonado": "did_not_finish",

  // As estantes do Skoob, como uma extensão que lê a tela as escreveria. Ver
  // lib/import/skoob.test.ts.
  "vou ler": "want_to_read",
  "lidos": "read",
  "relendo": "reading",
  "abandonei": "did_not_finish",
  "abandonados": "did_not_finish",

  // E como o skoob_downloader as escreve: as colunas do Goodreads não têm "relendo"
  // nem "abandonado", então ele põe a exclusiva mais próxima e uma ETIQUETA ao lado
  // ("to-read" + "abandoned"). A etiqueta é o status de verdade. Ver statusDaEtiqueta.
  "rereading": "reading",
  "abandoned": "did_not_finish",

  // Openreads.
  "in_progress": "reading",
  "planned": "want_to_read",

  // BookWyrm: "parei de ler" é largar.
  "stopped-reading": "did_not_finish",
};

/** A releitura. Não tem status próprio aqui: é "lendo", e a tela avisa o que se perde. */
const RELEITURA = new Set(["relendo", "rereading"]);

/**
 * A etiqueta que corrige a exclusiva. O skoob_downloader escreve um abandonado como
 * "to-read" com "abandoned" nas estantes; ler só a exclusiva poria na sua estante, como
 * "quero ler", um livro que você largou.
 */
function statusDaEtiqueta(linha: Record<string, string>, st: Status): { st: Status; relendo: boolean } {
  const etiquetas = (pega(linha, APELIDOS.prateleiras) ?? "")
    .split(/[,;]/)
    .map((p) => p.trim().toLowerCase());
  const bruto = (pega(linha, APELIDOS.statusBruto) ?? "").trim().toLowerCase();
  const relendo = RELEITURA.has(bruto) || etiquetas.some((e) => RELEITURA.has(e));
  if (st === "want_to_read" && etiquetas.some((e) => STATUS_DE[e] === "did_not_finish")) {
    return { st: "did_not_finish", relendo };
  }
  return { st, relendo };
}

/** As prateleiras que a pessoa inventou, sem as três que já são o status. */
const EXCLUSIVAS = new Set(Object.keys(STATUS_DE));

function status(bruto: string | undefined): Status {
  const k = (bruto ?? "").trim().toLowerCase();
  const achado = STATUS_DE[k];
  if (achado) return achado;
  // Um status que a gente não conhece não vira "lido" por otimismo: inventar uma
  // leitura que não aconteceu é a pior perda que um importador pode causar.
  return "want_to_read";
}

function isStatus(v: string): v is Status {
  return (STATUSES as readonly string[]).includes(v);
}

/**
 * As leituras. RELER É DE PRIMEIRA CLASSE, e é o dado mais difícil de reconstruir
 * depois, porque ninguém lembra em que ano releu.
 *
 * O StoryGraph exporta VÁRIAS datas num campo só. O Goodreads exporta uma data e
 * um `Read Count`: a perda é DELE, não nossa. O certo, e é o que a gente faz: se
 * ele leu 3 vezes e só sabemos a data da última, criamos 3 leituras, a última com
 * a data e as outras SEM. Jogar as outras duas fora seria apagar duas leituras que
 * aconteceram.
 */
function leituras(linha: Record<string, string>, st: Status): Leitura[] {
  const varias = pega(linha, APELIDOS.varias);
  const datas = varias
    ? varias.split(/[;|]/).map((d) => lerData(d)).filter((d): d is string => d !== null)
    : [];

  /**
   * O Openreads guarda cada leitura com COMEÇO e FIM ("2024-01-02T…|2024-02-10T…|"), e
   * várias por livro. É o formato mais completo que chega aqui: nenhuma leitura vira
   * leitura sem data.
   */
  const sessoes = (pega(linha, APELIDOS.sessoes) ?? "")
    .split(";")
    .map((s) => s.split("|"))
    .map(([c, f]) => ({ comecou: lerData(c), terminou: lerData(f), abandonou: null }))
    .filter((s) => s.comecou || s.terminou);
  if (sessoes.length > 0) {
    if (st === "read") return sessoes;
    // Lendo: as leituras terminadas ficam, e a aberta é a de agora. Com data, "terminei"
    // e "estou lendo" não se confundem.
    if (st === "reading") return sessoes;
    if (st === "did_not_finish") {
      const ultima = sessoes[sessoes.length - 1]!;
      return [{ comecou: ultima.comecou, terminou: null, abandonou: ultima.terminou }];
    }
    return [];
  }

  const fim = lerData(pega(linha, APELIDOS.terminou));
  const inicio = lerData(pega(linha, APELIDOS.comecou));
  const vezes = Math.max(1, parseInt(pega(linha, APELIDOS.vezes) ?? "1", 10) || 1);

  if (st === "did_not_finish") {
    return [{ comecou: inicio, terminou: null, abandonou: lerData(pega(linha, APELIDOS.parou)) ?? fim }];
  }

  if (st === "reading") {
    return inicio ? [{ comecou: inicio, terminou: null, abandonou: null }] : [];
  }

  if (st !== "read") return [];

  // O StoryGraph: uma linha por data, e todas contam.
  if (datas.length > 0) {
    return datas.map((d) => ({ comecou: null, terminou: d, abandonou: null }));
  }

  if (!fim && vezes <= 1) {
    // Lido, sem data. É um FATO, e não um erro: "eu li, não sei quando".
    return [{ comecou: inicio, terminou: null, abandonou: null }];
  }

  // Leu N vezes e a fonte só guardou a data da última. As outras N-1 existem, e
  // entram sem data.
  const todas: Leitura[] = [];
  for (let i = 0; i < vezes - 1; i++) {
    todas.push({ comecou: null, terminou: null, abandonou: null });
  }
  todas.push({ comecou: inicio, terminou: fim, abandonou: null });
  return todas;
}

/**
 * A resenha vem com HTML (`<br/>`, `<i>`), porque o Goodreads guarda HTML. Vira
 * texto limpo: HTML cru dentro do banco é uma injeção esperando um lugar para
 * acontecer, e a resenha é renderizada como texto em toda tela do Gume.
 */
function texto(bruto: string | undefined): string | null {
  if (!bruto) return null;
  const limpo = bruto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return limpo || null;
}

/**
 * A nota. `0` no Goodreads quer dizer NÃO AVALIEI, e não "zero estrelas".
 *
 * Gravar 0 estoura o check `ratings_words` no banco (que só aceita 1..5), e é bem
 * que estoure: uma nota zero é uma opinião que a pessoa nunca deu.
 */
function estrelas(bruto: string | undefined): number | null {
  if (!bruto) return null;
  const n = Number(bruto.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(5, n);
}

function prateleiras(linha: Record<string, string>): string[] {
  // BookWyrm exporta UMA estante por livro. Se ela não é de leitura (to-read, read…), é
  // uma que a pessoa criou, e o que vale é o nome que ela deu, não o identificador.
  const estante = (pega(linha, APELIDOS.statusBruto) ?? "").trim().toLowerCase();
  const nome = pega(linha, APELIDOS.nomeDaEstante);
  if (nome && estante && !STATUS_DE[estante]) return [nome.slice(0, 60)];

  const bruto = pega(linha, APELIDOS.prateleiras);
  if (!bruto) return [];
  return bruto
    // O Openreads separa as etiquetas com "|||||".
    .split(/\|{5}|[,;]/)
    .map((p) => p.trim())
    .filter((p) => p !== "" && !EXCLUSIVAS.has(p.toLowerCase()))
    .slice(0, 20);
}

/**
 * ════════════════════════════════════════════════════════════════════
 *  "Binding" VIRA FORMATO. E ele estava sendo jogado fora.
 *
 *  Numa estante de verdade isso não é detalhe: a planilha que virou este produto tinha
 *  **29 capas duras de 44 livros**. Essa pessoa coleciona OBJETOS, e não arquivos — e o
 *  formato é a coluna que diz isso.
 *
 *  ═══ O QUE O GOODREADS ESCREVE, DE VERDADE ═══
 *
 *  Não é um enum: é texto livre da ficha da editora. "Hardcover", "Paperback", "Mass
 *  Market Paperback", "Kindle Edition", "Audible Audio", "Audio CD", "ebook".
 *
 *  Então a tradução casa por PEDAÇO, e não por igualdade — e o que não for reconhecido
 *  vira `null`, e nunca "brochura" por otimismo. Chutar "brochura" numa capa dura é
 *  inventar um fato sobre o objeto que está na mão da pessoa, e ela não tem como saber
 *  que a gente chutou.
 * ════════════════════════════════════════════════════════════════════
 */
function formato(bruto: string | undefined): Formato | null {
  const s = (bruto ?? "").trim().toLowerCase();
  if (!s) return null;

  // A ordem importa: "mass market paperback" tem "paperback" dentro, e "audiobook"
  // não pode ser lido como "book". O mais específico primeiro.
  if (/audi|audible|cd\b/.test(s)) return "audiobook";
  if (/kindle|ebook|e-book|epub|digital/.test(s)) return "ebook";
  if (/hardcover|hardback|capa dura|encadernad/.test(s)) return "hardcover";
  if (/paperback|brochura|pocket|bolso|capa comum|capa mole/.test(s)) return "paperback";

  // "Unknown Binding", "Board book", "Leather Bound": existe, e não é nenhum dos quatro.
  return "other";
}

function possui(linha: Record<string, string>): boolean {
  const bruto = pega(linha, APELIDOS.possui);
  if (!bruto) return false;
  const k = bruto.toLowerCase();
  if (k === "0" || k === "false" || k === "no" || k === "nao") return false;
  return true;
}

/** Um CSV inteiro, em livros. As linhas sem título não viram nada: não são livros. */
export function parse(texto_: string): LivroImportado[] {
  return parseCsvObjetos(texto_)
    .map(linha)
    .filter((l): l is LivroImportado => l !== null);
}

function linha(l: Record<string, string>): LivroImportado | null {
  const titulo = pega(l, APELIDOS.titulo);
  if (!titulo) return null;
  // Apagado na origem (o Openreads exporta a lixeira junto). Não é um livro da estante.
  if ((pega(l, APELIDOS.apagado) ?? "").toLowerCase() === "true") return null;

  const { st, relendo } = statusDaEtiqueta(l, status(pega(l, APELIDOS.statusBruto)));
  const ids = lerIsbn(pega(l, APELIDOS.isbn13) ?? pega(l, APELIDOS.isbn10));

  return {
    titulo: titulo.slice(0, 300),
    autor: (pega(l, APELIDOS.autor) ?? null)?.slice(0, 200) ?? null,
    isbn13: ids.isbn13,
    isbn10: ids.isbn10,
    editora: (pega(l, APELIDOS.editora) ?? null)?.slice(0, 200) ?? null,
    anoEdicao: lerAno(pega(l, APELIDOS.anoEdicao)),
    anoObra: lerAno(pega(l, APELIDOS.anoObra)),
    paginas: (() => {
      const n = parseInt(pega(l, APELIDOS.paginas) ?? "", 10);
      return Number.isInteger(n) && n > 0 && n < 50_000 ? n : null;
    })(),
    formato: formato(pega(l, APELIDOS.formato)),
    status: isStatus(st) ? st : "want_to_read",
    prateleiras: prateleiras(l),
    leituras: leituras(l, st),
    estrelas: estrelas(pega(l, APELIDOS.estrelas)),
    resenha: texto(pega(l, APELIDOS.resenha)),
    notaPrivada: texto(pega(l, APELIDOS.notaPrivada)),
    possui: possui(l),
    ...(relendo ? { relendo: true as const } : {}),
  };
}
