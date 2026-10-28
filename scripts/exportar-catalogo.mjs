/**
 * ════════════════════════════════════════════════════════════════════
 *  O CATÁLOGO, EM ARQUIVO, PARA PUBLICAR.
 *
 *  O README promete um dataset aberto desde o primeiro dia: "para que, se este projeto um
 *  dia acabar, os dados sobrevivam a ele". Este script é o cumprimento dessa frase.
 *
 *  O que sai: obras, edições, autores, identificadores e séries. Fato bibliográfico, que
 *  não é de ninguém.
 *
 *  O que NÃO sai, e a regra não se afrouxa:
 *
 *  - Nada de pessoa. Conta, estante, leitura, resenha, quem segue quem, correção com
 *    crédito, e-mail, nada. Dado de leitor não é do projeto para publicar.
 *  - Nenhum texto de terceiro com licença incompatível. Open Library e Wikidata são CC0 e
 *    entram; o que veio da Wikipédia é CC BY-SA e sai, porque misturar share-alike num
 *    dataset CC0 é publicar uma licença que não se pode cumprir. A coluna da fonte vai
 *    junto, então dá para auditar de onde cada frase veio.
 *  - `created_by` fica de fora: é o id da conta de quem cadastrou a obra, e é uma ponta
 *    de volta para uma pessoa dentro de um arquivo que não deveria ter nenhuma.
 *
 *  Uso: DATABASE_URL="..." node scripts/exportar-catalogo.mjs [--saida=<pasta>]
 * ════════════════════════════════════════════════════════════════════
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const URL_DO_BANCO = process.env.DATABASE_URL;
if (!URL_DO_BANCO) {
  console.error("Falta DATABASE_URL no ambiente.");
  process.exit(1);
}

const arg = (nome, padrao) =>
  process.argv.find((a) => a.startsWith(`--${nome}=`))?.split("=").slice(1).join("=") ?? padrao;

const HOJE = new Date().toISOString().slice(0, 10);
const SAIDA = arg("saida", `saida-catalogo/gume-catalogo-${HOJE}`);

/**
 * Uma consulta por tabela, escrita à mão e sem interpolação de nada: o que está aqui é o
 * contrato público do dataset, e uma coluna a mais entra por decisão, nunca por `select *`.
 * A ordem é a de carregar: quem é apontado vem antes de quem aponta.
 */
const TABELAS = [
  [
    "autores",
    "authors",
    `select id, name, nationality, openlibrary_key, wikidata_id, slug, alt_names,
            case when bio_source = 'wikipedia' then null else bio end as bio,
            case when bio_source = 'wikipedia' then null else bio_source end as bio_source,
            image_url, image_source, created_at
       from authors order by id`,
  ],
  [
    "series",
    "series",
    `select id, title, kind, status, anilist_id, total_volumes, slug, cover_url,
            author_id, illustrator_id, first_published, alt_titles
       from series order by id`,
  ],
  [
    "obras",
    "works",
    `select id, title, author_id, series_id, volume, first_published, genre, subject, slug,
            openlibrary_key, needs_review, author_source, forma,
            case when description_source = 'wikipedia' then null else description end as description,
            case when description_source = 'wikipedia' then null else description_source end as description_source,
            created_at
       from works order by id`,
  ],
  [
    "edicoes",
    "editions",
    `select id, work_id, isbn13, publisher, published_year, language, page_count, format,
            cover_url, translator, created_at
       from editions order by id`,
  ],
  ["identificadores", "identifiers", `select edition_id, kind, value from identifiers order by edition_id, kind, value`],
];

mkdirSync(SAIDA, { recursive: true });

/**
 * Contar no banco, e não com `wc -l` no CSV: sinopse e biografia têm quebra de linha
 * dentro do campo, então linha de arquivo não é linha de tabela, e erra para mais.
 */
const contar = (tabela) =>
  Number(execFileSync("psql", [URL_DO_BANCO, "-At", "-c", `select count(*) from ${tabela}`]).toString().trim());

console.log(`Exportando para ${SAIDA}\n`);

const resumo = [];
for (const [nome, tabela, consulta] of TABELAS) {
  const destino = join(SAIDA, `${nome}.csv`);
  execFileSync("psql", [URL_DO_BANCO, "-v", "ON_ERROR_STOP=1", "-c", `\\copy (${consulta}) to '${destino}' with (format csv, header)`]);
  const linhas = contar(tabela);
  const mb = (statSync(destino).size / 1024 / 1024).toFixed(1);
  resumo.push({ nome, linhas, mb });
  console.log(`  ${nome.padEnd(16)} ${String(linhas).padStart(7)} linhas   ${mb} MB`);
}

writeFileSync(join(SAIDA, "LEIA-ME.md"), leiaMe(resumo));
console.log(`\nPronto. ${readdirSync(SAIDA).length} arquivos em ${SAIDA}`);

function leiaMe(resumo) {
  const tabela = resumo.map((r) => `| ${r.nome} | ${r.linhas.toLocaleString("pt-BR")} | ${r.mb} MB |`).join("\n");
  return `# Catálogo do Gume

Catálogo de livros em português, montado a partir do dump oficial da Open Library, podado,
deduplicado e corrigido à mão por quem usou o Gume. Exportado em ${HOJE}.

| arquivo | linhas | tamanho |
|---|---|---|
${tabela}

## Licença

**CC0 1.0** (domínio público). Use para o que quiser, sem pedir e sem creditar.

Fato bibliográfico não é obra autoral e não tem dono. O pouco de texto corrido que vai
junto (sinopse e biografia) vem só de fontes CC0, Open Library e Wikidata, ou foi escrito
dentro do Gume. A coluna \`description_source\` e a \`bio_source\` dizem de onde veio cada
um, e o que tinha licença incompatível foi removido antes de publicar.

As colunas \`cover_url\` e \`image_url\` são endereços de imagens hospedadas por terceiros.
São referências, não as imagens: nenhuma capa é redistribuída aqui.

## O que não está aqui

Nada de pessoa. Nenhuma conta, estante, leitura, resenha, lista de quem segue quem ou
e-mail. O Gume foi um registro de leitura, e o que os leitores escreveram é deles: na hora
do desligamento cada um recebeu a própria estante por e-mail, e nada disso entrou neste
arquivo.

## Como carregar

Num clone do Gume, com o banco já criado:

\`\`\`bash
pnpm db:migrate
pnpm db:catalogo
\`\`\`

Em qualquer outro lugar, os CSVs têm cabeçalho e abrem em qualquer ferramenta.
`;
}
