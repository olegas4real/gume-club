import { procurarNoCatalogo } from "@/lib/import/casar";
import { aplicar } from "@/lib/import/aplicar";
import { searchLocal } from "@/lib/catalog";
import type { Achado, LivroImportado, Relatorio } from "@/lib/import/tipos";

/**
 * ════════════════════════════════════════════════════════════════════
 *  A LISTA COLADA, NO ACERVO. Servidor só.
 *
 *  Texto colado é mais solto que arquivo: "dom casmurro machado" não casa pelo título
 *  exato de `procurarNoCatalogo`. Então, quando a cascata do arquivo não acha, a linha
 *  tenta a busca do acervo (só a NOSSA base: nada de fora entra por aqui). Se achar,
 *  ela vira PALPITE ("confira"), e o candidato é REESCRITO com o título, o autor e o
 *  ISBN da ficha achada.
 *
 *  ═══ POR QUE REESCREVER, E POR QUE CASAR DE NOVO ═══
 *
 *  A gravação (`aplicar`) refaz a cascata a partir do candidato. Se o candidato
 *  continuasse com o texto da linha, a prévia mostraria uma ficha e a gravação
 *  criaria outra. Reescrito com a identidade da ficha, ele é casado DE NOVO pela mesma
 *  cascata da gravação, e só fica se ela achar. Prévia e gravação não divergem.
 *
 *  ═══ O QUE NÃO CASA NÃO ENTRA, NEM QUE O NAVEGADOR MANDE ═══
 *
 *  No arquivo, linha sem casamento cria ficha nova (ela veio de uma estante de
 *  verdade). Na lista colada, não: uma linha de texto livre que não bate com nada é
 *  um chute, e chute não vira livro na estante de ninguém. `aplicarDoAcervo` casa
 *  cada linha de novo no servidor e recusa a que cairia em ficha nova.
 * ════════════════════════════════════════════════════════════════════
 */

export async function procurarDaLista(
  livros: LivroImportado[],
): Promise<{ livros: LivroImportado[]; achados: Achado[] }> {
  const saida: LivroImportado[] = [];
  const achados: Achado[] = [];

  for (const livro of livros) {
    const [direto] = await procurarNoCatalogo([livro]);
    if (direto && direto.como !== "novo") {
      saida.push(livro);
      achados.push(direto);
      continue;
    }

    const consulta = livro.autor ? `${livro.titulo} ${livro.autor}` : livro.titulo;
    const hit = (await searchLocal(consulta)).find((h) => h.source === "gume");
    if (hit) {
      const candidato: LivroImportado = {
        ...livro,
        titulo: hit.title,
        autor: hit.author,
        isbn13: hit.isbn13,
        isbn10: hit.isbn10,
      };
      const [deNovo] = await procurarNoCatalogo([candidato]);
      if (deNovo && deNovo.como !== "novo") {
        saida.push(candidato);
        // A linha como a pessoa escreveu, e a ficha achada: a prévia mostra os dois.
        achados.push({ ...deNovo, titulo: livro.titulo, autor: livro.autor, como: "titulo" });
        continue;
      }
    }

    saida.push(livro);
    achados.push(direto ?? {
      titulo: livro.titulo, autor: livro.autor, como: "novo",
      slug: null, tituloNoCatalogo: null, autorNoCatalogo: null, coverUrl: null,
    });
  }

  return { livros: saida, achados };
}

/** Grava só o que tem ficha no acervo. O resto volta em `perdidos`, com o motivo. */
export async function aplicarDoAcervo(actor: { id: string }, livros: LivroImportado[]): Promise<Relatorio> {
  const casados: LivroImportado[] = [];
  const perdidos: Relatorio["perdidos"] = [];

  for (const livro of livros) {
    const [a] = await procurarNoCatalogo([livro]);
    if (a && a.como !== "novo") casados.push(livro);
    else perdidos.push({ linha: livro.titulo, porque: "não achamos esse livro no acervo" });
  }

  const relatorio = await aplicar(actor, casados);
  return { ...relatorio, linhas: livros.length, perdidos: [...relatorio.perdidos, ...perdidos] };
}
