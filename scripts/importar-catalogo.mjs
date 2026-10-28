/**
 * ════════════════════════════════════════════════════════════════════
 *  CARREGAR O CATÁLOGO PUBLICADO NUM BANCO LIMPO.
 *
 *  O par do `exportar-catalogo.mjs`. Sem ele, quem clona o Gume sobe um app com o catálogo
 *  vazio e tem que rodar a importação da Open Library inteira do zero, que leva horas. Com
 *  ele, clonar entrega um Gume com o catálogo em português dentro, e a frase "quem quiser
 *  roda o seu" deixa de ser meia verdade.
 *
 *  Ele se RECUSA a rodar sobre um catálogo que já tem linha. Carregar por cima duplicaria
 *  obra, e o jeito de desduplicar um catálogo é não sujar ele.
 *
 *  Uso: pnpm db:catalogo              (baixa a última versão publicada)
 *       pnpm db:catalogo --arquivo=<caminho do .tar.gz>
 * ════════════════════════════════════════════════════════════════════
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_DO_BANCO = process.env.DATABASE_URL;
if (!URL_DO_BANCO) {
  console.error("Falta DATABASE_URL no ambiente.");
  process.exit(1);
}

const DE_ONDE = "https://github.com/olegas4real/gume-club/releases/latest/download/gume-catalogo.tar.gz";

const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.split("=").slice(1).join("=");

/** Nome do arquivo → tabela. A ordem é a das chaves estrangeiras: quem é apontado primeiro. */
const ORDEM = [
  ["autores", "authors"],
  ["series", "series"],
  ["obras", "works"],
  ["edicoes", "editions"],
  ["identificadores", "identifiers"],
];

const psql = (...args) => execFileSync("psql", [URL_DO_BANCO, "-v", "ON_ERROR_STOP=1", ...args]).toString().trim();
const contar = (tabela) => Number(psql("-At", "-c", `select count(*) from ${tabela}`));

// 1. O catálogo tem que estar vazio. Carregar por cima é criar duplicata, não atualizar.
const sujas = ORDEM.map(([, tabela]) => [tabela, contar(tabela)]).filter(([, n]) => n > 0);
if (sujas.length > 0) {
  console.error("O catálogo deste banco já tem dado dentro:");
  for (const [tabela, n] of sujas) console.error(`  ${tabela}: ${n.toLocaleString("pt-BR")} linhas`);
  console.error("\nCarregar por cima duplicaria tudo. Rode num banco limpo (`pnpm db:migrate` num banco novo).");
  process.exit(1);
}

// 2. O arquivo: o que você já tem, ou a última versão publicada.
const temporaria = mkdtempSync(join(tmpdir(), "gume-catalogo-"));
let tarball = arg("arquivo");

if (!tarball) {
  console.log(`Baixando ${DE_ONDE}`);
  const resposta = await fetch(DE_ONDE, { redirect: "follow" });
  // Rede que falha é rede que falha, e nunca "o catálogo está vazio".
  if (!resposta.ok) throw new Error(`o download falhou: HTTP ${resposta.status}`);
  tarball = join(temporaria, "gume-catalogo.tar.gz");
  writeFileSync(tarball, Buffer.from(await resposta.arrayBuffer()));
}

execFileSync("tar", ["-xzf", tarball, "-C", temporaria]);
const pasta = readdirSync(temporaria, { withFileTypes: true }).find((e) => e.isDirectory())?.name;
if (!pasta) throw new Error("o arquivo não tem a pasta do catálogo dentro");
const raiz = join(temporaria, pasta);

// 3. Carregar, na ordem das chaves estrangeiras.
console.log("");
for (const [arquivo, tabela] of ORDEM) {
  const csv = join(raiz, `${arquivo}.csv`);
  // As colunas saem do cabeçalho do próprio CSV: uma lista a mais aqui seria uma segunda
  // verdade sobre o formato, e as duas divergem no dia em que alguém mexe numa só.
  const colunas = readFileSync(csv, "utf8").slice(0, 4096).split("\n")[0].trim();
  psql("-c", `\\copy ${tabela} (${colunas}) from '${csv}' with (format csv, header)`);
  console.log(`  ${tabela.padEnd(14)} ${contar(tabela).toLocaleString("pt-BR").padStart(9)} linhas`);
}

console.log("\nCatálogo carregado.");
