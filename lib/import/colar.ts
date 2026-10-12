import type { LivroImportado } from "@/lib/import/tipos";
import type { Status } from "@/lib/library";

/**
 * ════════════════════════════════════════════════════════════════════
 *  COLAR UMA LISTA: DE TEXTO SOLTO PARA CANDIDATOS.
 *
 *  "Seus amigos têm planilhas, não exports." A extensão do concorrente que tira a
 *  estante do Skoob só roda em Chrome no computador; colar funciona em qualquer
 *  telefone. Cada linha vira um LivroImportado e segue o MESMO caminho do arquivo:
 *  procurar no acervo (lib/import/casar.ts), conferir na prévia, gravar
 *  (lib/import/aplicar.ts). Não existe um segundo fluxo.
 *
 *  ═══ AS FORMAS QUE APARECEM NA VIDA REAL ═══
 *
 *    Título
 *    Título - Autor        (e com travessão, e com "—")
 *    Título, Autor         (só a ÚLTIMA vírgula, e só se o que sobra parece um nome)
 *    Título (Autor)
 *    Título por Autor      (e "by")
 *    9788535911664         (ISBN solto, com ou sem hífen, sozinho ou na linha)
 *    "1. Título" / "- Título" / "• Título", e o resto do ruído de quem copia de um site
 *
 *  Esta função NÃO casa nada e NÃO decide nada sobre o catálogo: só separa o que é
 *  título, autor e número. Errar aqui custa pouco, porque a prévia mostra os dois
 *  lados e a gravação recusa o que não tem ficha.
 * ════════════════════════════════════════════════════════════════════
 */

/** Um ISBN em qualquer lugar da linha: 13 ou 10 dígitos, com hífen e espaço no meio. */
const ISBN = /(?:97[89][\s-]?)?(?:\d[\s-]?){9}[\dXx]/;

/** O ruído de quem copia lista de um site: marcador, numeração, estrela, contagem. */
function limpar(linha: string): string {
  return linha
    // A numeração exige espaço depois ("1. Título"): sem isso, o "978-" de um ISBN com
    // hífen virava numeração e sumia.
    .replace(/^\s*(?:[-*•·▪◦>]+\s*|\d{1,4}[.)º°-]\s+|\[[ x]\]\s*)/i, "")
    .replace(/[★☆⭐✩✪]+/g, "")
    .replace(/\s*[·|]\s*\d+\s*p(?:á|a)g(?:ina)?s?\.?\s*$/i, "")
    .replace(/\s*\d+\s*p(?:á|a)ginas\s*$/i, "")
    .replace(/^["“'‘]+|["”'’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parece um nome de gente? Curto, e começa com maiúscula. Para não partir "Memórias, sonhos, reflexões". */
function pareceNome(s: string): boolean {
  const palavras = s.trim().split(/\s+/);
  return palavras.length >= 1 && palavras.length <= 5 && /^\p{Lu}/u.test(s.trim()) && !/\d/.test(s);
}

export type Separado = { titulo: string; autor: string | null; isbn: string | null };

export function separar(bruto: string): Separado | null {
  let linha = limpar(bruto);
  if (!linha) return null;

  let isbn: string | null = null;
  const achado = linha.match(ISBN);
  if (achado) {
    const digitos = achado[0].replace(/[\s-]/g, "").toUpperCase();
    if (digitos.length === 13 || digitos.length === 10) {
      isbn = digitos;
      linha = limpar(linha.replace(achado[0], " ").replace(/\b(?:isbn)[:\s]*/i, ""));
    }
  }

  if (!linha) return isbn ? { titulo: isbn, autor: null, isbn } : null;

  const tentativas: RegExp[] = [
    /^(.+?)\s+[—–-]\s+(.+)$/, // Título - Autor
    /^(.+?)\s*\(([^()]+)\)\s*$/, // Título (Autor)
    /^(.+?)\s+(?:por|by)\s+(.+)$/i, // Título por Autor
  ];
  for (const re of tentativas) {
    const m = linha.match(re);
    if (m && m[1]!.trim() && m[2]!.trim()) {
      return { titulo: m[1]!.trim(), autor: m[2]!.trim(), isbn };
    }
  }

  const virgula = linha.lastIndexOf(",");
  if (virgula > 0) {
    const resto = linha.slice(virgula + 1).trim();
    if (pareceNome(resto)) return { titulo: linha.slice(0, virgula).trim(), autor: resto, isbn };
  }

  return { titulo: linha, autor: null, isbn };
}

/** O texto colado, em candidatos. As linhas além do limite não somem caladas: voltam em `sobra`. */
export function lerLista(
  texto: string,
  status: Status,
  { limite, tamanho }: { limite: number; tamanho: number },
): { livros: LivroImportado[]; sobra: number } {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.slice(0, tamanho))
    .map(separar)
    .filter((s): s is Separado => s !== null);

  const livros = linhas.slice(0, limite).map(
    (s): LivroImportado => ({
      titulo: s.titulo.slice(0, 300),
      autor: s.autor?.slice(0, 200) ?? null,
      isbn13: s.isbn?.length === 13 ? s.isbn : null,
      isbn10: s.isbn?.length === 10 ? s.isbn : null,
      editora: null,
      anoEdicao: null,
      anoObra: null,
      paginas: null,
      formato: null,
      status,
      prateleiras: [],
      leituras: [],
      estrelas: null,
      resenha: null,
      notaPrivada: null,
      possui: false,
    }),
  );

  return { livros, sobra: Math.max(0, linhas.length - limite) };
}
