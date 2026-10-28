/**
 * ════════════════════════════════════════════════════════════════════
 *  O `@/` DO TSCONFIG, PARA UM SCRIPT QUE RODA NO NODE PURO.
 *
 *  Os scripts deste repo falam SQL cru com o `postgres` e não tocam em `lib/`. Isso é bom
 *  quase sempre, e é ruim numa hora só: quando o script precisa produzir EXATAMENTE a
 *  mesma coisa que o app produz. Foi o caso do `exportar-e-enviar.mjs`: um segundo export
 *  escrito à mão é um export que diverge do botão "baixar a minha estante", e aí a saída
 *  que o produto promete passa a ter duas versões, uma delas sem ninguém olhando.
 *
 *  O Node 22 já roda TypeScript (`--experimental-strip-types`). O que falta é o resolver:
 *  o `@/lib/db` do tsconfig ele não conhece, e os imports internos do repo não escrevem a
 *  extensão (`./schema`), que o ESM exige. Este gancho resolve os dois, procurando o
 *  arquivo no disco na ordem das extensões.
 *
 *  Uso: `node --experimental-strip-types --import ./scripts/alias.mjs scripts/<script>.mjs`
 * ════════════════════════════════════════════════════════════════════
 */

import { registerHooks } from "node:module";
import { statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const RAIZ = pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "..")).href + "/";

/** Na ordem: o caminho como veio, depois as formas que o tsconfig deixa omitir. */
const EXTENSOES = ["", ".ts", ".tsx", "/index.ts", ".mjs", ".js", "/index.js"];

function achar(base) {
  for (const ext of EXTENSOES) {
    const url = base + ext;
    try {
      // Tem que ser ARQUIVO: `@/lib/db` existe como PASTA, e o ESM não importa pasta.
      if (statSync(fileURLToPath(url)).isFile()) return url;
    } catch {
      // Não existe, ou não é um file: URL. Tenta a próxima extensão.
    }
  }
  return null;
}

registerHooks({
  resolve(especificador, contexto, proximo) {
    let base = null;

    if (especificador.startsWith("@/")) base = RAIZ + especificador.slice(2);
    else if (especificador.startsWith("./") || especificador.startsWith("../")) {
      if (contexto.parentURL?.startsWith("file:")) {
        base = new URL(especificador, contexto.parentURL).href;
      }
    }

    const achado = base && achar(base);
    return proximo(achado ?? especificador, contexto);
  },
});
