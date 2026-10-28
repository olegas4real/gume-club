/**
 * ════════════════════════════════════════════════════════════════════
 *  MANDAR A ESTANTE DE VOLTA PARA QUEM LEU, ANTES DE O GUME SAIR DO AR.
 *
 *  O produto inteiro foi vendido com uma promessa: a saída é fácil, e ela é um clique. No
 *  desligamento essa promessa cobra juros, porque quem não entrar no app a tempo perde
 *  tudo. Então a saída vai até a pessoa, em vez de esperar por ela: o MESMO zip do botão
 *  "baixar a minha estante", anexado num e-mail.
 *
 *  ═══ O MESMO EXPORT, E NÃO UM PARECIDO ═══
 *
 *  Este script importa `lib/exportar.ts` e `lib/zip.ts`, que é o que a rota
 *  `app/api/exportar` usa. Um segundo export escrito em SQL cru aqui seria um export que
 *  diverge do produto, com um campo a menos, e ninguém descobriria: o arquivo chega, abre,
 *  e só a pessoa que perdeu a resenha saberia. Ver `scripts/alias.mjs`, que é o que faz o
 *  `@/` funcionar fora do Next.
 *
 *  ═══ ELE GRAVA À MEDIDA QUE MANDA ═══
 *
 *  Regra do AGENTS.md, e aqui ela é mais dura que num backfill: a cada envio, uma linha no
 *  `enviados.jsonl`. Se o script morrer no meio do centésimo e-mail, rodar de novo continua
 *  do centésimo, e ninguém recebe duas vezes a própria estante.
 *
 *  ═══ 429 É "ESPERE", E NÃO "NÃO DEU" ═══
 *
 *  O Resend limita a cadência. Uma recusa por excesso de velocidade não é um e-mail
 *  inentregável: é para tentar de novo daqui a pouco. Só vira falha depois de cinco
 *  tentativas, e falha fica ANOTADA como falha, nunca como enviada.
 *
 *  ═══ ENSAIO POR PADRÃO ═══
 *
 *  Sem `--enviar`, ele não manda nada: monta os zips, escreve na pasta de saída e mostra a
 *  lista de quem receberia. Um script que manda e-mail para gente de verdade não tem o
 *  direito de ser fácil de disparar sem querer.
 *
 *  ═══ USO ═══
 *
 *    # ensaio: monta tudo, não manda nada
 *    node --experimental-strip-types --import ./scripts/alias.mjs --env-file=.env \
 *      scripts/exportar-e-enviar.mjs
 *
 *    # um só, para você mesmo, de verdade
 *    ... scripts/exportar-e-enviar.mjs --so=olegas --enviar
 *
 *    # todo mundo com mais de 10 livros
 *    ... scripts/exportar-e-enviar.mjs --enviar
 *
 *  ⚠️  A pasta de saída fica cheia de DADO PESSOAL DE OUTRAS PESSOAS. Ela está no
 *      .gitignore, e o lugar dela depois do envio é a lixeira.
 * ════════════════════════════════════════════════════════════════════
 */

import { mkdirSync, appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  COLUNAS,
  estanteEmLotes,
  linhaCsv,
  oResto,
  paraCsv,
  leiaMe,
} from "@/lib/exportar";
import { zip } from "@/lib/zip";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// ─────────────────────────────── os argumentos ───────────────────────────────

const args = process.argv.slice(2);
const valor = (nome, padrao = null) => {
  const achado = args.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
};
const tem = (nome) => args.includes(`--${nome}`);

const MINIMO = Number(valor("minimo", "10"));
const SO = valor("so")?.replace(/^@/, "") ?? null;
const LIMITE = valor("limite") ? Number(valor("limite")) : Infinity;
const SAIDA = valor("saida", "saida-export");
const ENVIAR = tem("enviar");
const INCLUIR_BANIDOS = tem("incluir-banidos");

/**
 * O teto do Resend para a mensagem inteira é 40 MB, e o base64 engorda o anexo em um terço.
 * Acima disto o e-mail não sai, e o script RECLAMA em vez de mandar uma carta sem o arquivo:
 * o app sai do ar hoje, então "entre e baixe" seria um conselho para uma porta fechada.
 */
const TETO_DO_ANEXO = 25 * 1024 * 1024;

if (ENVIAR && !process.env.RESEND_API_KEY) {
  console.error("Falta RESEND_API_KEY no ambiente. Sem ela não se manda nada.");
  process.exit(1);
}

mkdirSync(SAIDA, { recursive: true });
const LIVRO_DE_BORDO = join(SAIDA, "enviados.jsonl");

// ─────────────────────────────── quem recebe ───────────────────────────────

/**
 * O e-mail NÃO VERIFICADO fica de fora, e esta é a única regra de privacidade do script.
 *
 * A estante de alguém, com as resenhas privadas dentro, vai para o endereço que a conta
 * usa. Para um endereço verificado isso não expõe nada de novo: quem tem aquela caixa já
 * podia entrar na conta pelo "esqueci a senha" e baixar o mesmo arquivo. Para um endereço
 * NÃO verificado, ninguém nunca provou que a caixa é da pessoa, e aí o anexo seria o
 * primeiro vazamento da história deste projeto.
 */
async function quemRecebe() {
  const linhas = await db.execute(sql`
    select u.id, u.handle, u.email, u.display_name as nome, count(le.id)::int as livros
      from users u
      join library_entries le on le.user_id = u.id
     where u.email_verified = true
       and u.deleted_at is null
       ${INCLUIR_BANIDOS ? sql`` : sql`and u.banned_at is null`}
       ${SO ? sql`and u.handle = ${SO}` : sql``}
     group by u.id, u.handle, u.email, u.display_name
    having count(le.id) > ${MINIMO}
     order by count(le.id) desc`);

  return Array.from(linhas);
}

// ─────────────────────────────── o arquivo ───────────────────────────────

async function montarZip(userId) {
  const enc = new TextEncoder();
  const agora = new Date();
  const dia = hoje();

  const resto = await oResto(userId);
  const handle = resto.voce?.handle ?? "voce";

  async function* csv() {
    yield enc.encode(linhaCsv([...COLUNAS]));
    for await (const lote of estanteEmLotes(userId)) {
      let bloco = "";
      for (const linha of lote) bloco += linhaCsv(paraCsv(linha));
      yield enc.encode(bloco);
    }
  }

  async function* json() {
    yield enc.encode('{\n  "gume": "a sua estante, sem perdas",\n  "exportado_em": ');
    yield enc.encode(JSON.stringify(agora.toISOString()));
    yield enc.encode(',\n  "estante": [\n');
    let primeiro = true;
    for await (const lote of estanteEmLotes(userId)) {
      let bloco = "";
      for (const l of lote) {
        bloco += (primeiro ? "    " : ",\n    ") + JSON.stringify(l);
        primeiro = false;
      }
      yield enc.encode(bloco);
    }
    yield enc.encode("\n  ],\n");
    const cauda = JSON.stringify(resto, null, 2).slice(1);
    yield enc.encode(cauda.replace(/^\n?/, "  "));
    yield enc.encode("\n");
  }

  const stream = zip([
    { nome: "LEIA-ME.txt", pedacos: [enc.encode(leiaMe(handle, dia))] },
    { nome: "estante.csv", pedacos: csv() },
    { nome: "tudo.json", pedacos: json() },
  ]);

  const pedacos = [];
  for await (const p of stream) pedacos.push(Buffer.from(p));

  return { bytes: Buffer.concat(pedacos), nome: `gume-${handle}-${dia}.zip` };
}

// ─────────────────────────────── o texto ───────────────────────────────

function corpo({ livros }) {
  return `Oi.

Hoje o Gume sai do ar, e eu queria te contar isso direito, antes de qualquer outra coisa. Ele sempre foi um projeto de fim de semana, tocado por uma pessoa só, e manter o site no ar custa todo mês. Ficou caro demais para um hobby, e eu preferi desligar de uma vez a deixar o site apodrecer devagar.

Mas eu não ia desligar sem te devolver a sua estante. Ela está aqui em anexo, inteirinha, com ${livros} livros do jeito que você deixou. Tudo que estava no app sai junto, então vale guardar esse arquivo num lugar de que você lembre depois.

São dois arquivos com o mesmo conteúdo dentro. O estante.csv é a planilha que o Goodreads, o StoryGraph e o Oku sabem importar, e é por ela que você leva a sua estante para onde quiser. O tudo.json é o retrato completo, com o que a planilha não carrega: as suas resenhas, inclusive as privadas, quem você seguia, as indicações que você fez e as correções que você mandou para o catálogo.

Obrigado de verdade por ter usado. Um projeto pequeno assim só tem graça com gente lendo do outro lado, e você foi essa gente.

O Gume continua no GitHub, aberto, e quem quiser baixar e rodar o seu pode: github.com/olegas4real/gume-club

Abraço, e boas leituras.
`;
}

// ─────────────────────────────── o envio ───────────────────────────────

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function mandar({ para, assunto, texto, anexo }) {
  const corpoDaRequisicao = {
    from: process.env.EMAIL_FROM ?? "Gume <ola@gume.club>",
    to: para,
    subject: assunto,
    text: texto,
    ...(anexo
      ? { attachments: [{ filename: anexo.nome, content: anexo.bytes.toString("base64") }] }
      : {}),
  };

  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    let resposta;
    try {
      resposta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(corpoDaRequisicao),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (erro) {
      // Rede caiu ou estourou o prazo: é "tente de novo", e nunca "este e-mail não existe".
      if (tentativa === 5) throw erro;
      await dorme(2000 * tentativa);
      continue;
    }

    if (resposta.ok) return await resposta.json();

    const ehTemporario = resposta.status === 429 || resposta.status >= 500;
    const detalhe = await resposta.text().catch(() => "");

    if (!ehTemporario || tentativa === 5) {
      throw new Error(`Resend ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }

    await dorme(2000 * tentativa);
  }

  throw new Error("inalcançável");
}

// ─────────────────────────────── o laço ───────────────────────────────

const jaForam = new Set();
if (existsSync(LIVRO_DE_BORDO)) {
  for (const linha of readFileSync(LIVRO_DE_BORDO, "utf8").split("\n")) {
    if (!linha.trim()) continue;
    try {
      const registro = JSON.parse(linha);
      if (registro.ok) jaForam.add(registro.id);
    } catch {
      // Linha truncada por uma morte no meio da escrita. Ignora, e no pior caso reenvia.
    }
  }
}

const pessoas = (await quemRecebe()).filter((p) => !jaForam.has(p.id)).slice(0, LIMITE);

console.log(
  `\n${pessoas.length} pessoa(s) com mais de ${MINIMO} livros na estante, e-mail verificado` +
    `${INCLUIR_BANIDOS ? "" : ", conta ativa"}.` +
    (jaForam.size ? ` ${jaForam.size} já receberam antes e ficaram de fora.` : "") +
    `\nModo: ${ENVIAR ? "ENVIO DE VERDADE" : "ensaio (nada sai daqui)"}\n`,
);

for (const p of pessoas) {
  console.log(`  @${p.handle.padEnd(20)} ${String(p.livros).padStart(5)} livros   ${p.email}`);
}

if (!pessoas.length) process.exit(0);

if (ENVIAR) {
  console.log(
    `\n⚠️  Vou mandar ${pessoas.length} e-mail(s) de verdade, com a estante de cada um em anexo.` +
      `\n    Ctrl-C agora, se não for isso. Começo em 10 segundos.\n`,
  );
  await dorme(10_000);
}

let enviados = 0;
let falhas = 0;

for (const p of pessoas) {
  const t0 = Date.now();
  try {
    const { bytes, nome } = await montarZip(p.id);

    if (bytes.length > TETO_DO_ANEXO) {
      // Alto, e nunca um e-mail mandando entrar num app que acabou de sair do ar.
      throw new Error(
        `estante de ${(bytes.length / 1024 / 1024).toFixed(1)} MB, acima do teto do e-mail. ` +
          `Mande o arquivo desta pessoa à mão: ele está em ${SAIDA}.`,
      );
    }

    const assunto = "O Gume sai do ar hoje, e a sua estante está em anexo";
    const texto = corpo({ livros: p.livros });

    if (!ENVIAR) {
      writeFileSync(join(SAIDA, nome), bytes);
      writeFileSync(join(SAIDA, `${p.handle}.txt`), `assunto: ${assunto}\n\n${texto}`);
      console.log(`  ensaio  @${p.handle}  ${(bytes.length / 1024).toFixed(0)} KB`);
      continue;
    }

    const resposta = await mandar({
      para: p.email,
      assunto,
      texto,
      anexo: { nome, bytes },
    });

    appendFileSync(
      LIVRO_DE_BORDO,
      JSON.stringify({
        ok: true,
        id: p.id,
        handle: p.handle,
        livros: p.livros,
        bytes: bytes.length,
        resend: resposta?.id ?? null,
        quando: new Date().toISOString(),
      }) + "\n",
    );

    enviados++;
    console.log(`  enviado @${p.handle}  ${(bytes.length / 1024).toFixed(0)} KB  ${Date.now() - t0}ms`);

    /** A cadência padrão do Resend é 2 por segundo. Fica folgado de propósito. */
    await dorme(700);
  } catch (erro) {
    falhas++;
    appendFileSync(
      LIVRO_DE_BORDO,
      JSON.stringify({
        ok: false,
        id: p.id,
        handle: p.handle,
        erro: String(erro?.message ?? erro),
        quando: new Date().toISOString(),
      }) + "\n",
    );
    console.error(`  FALHOU  @${p.handle}: ${erro?.message ?? erro}`);
  }
}

console.log(
  `\n${ENVIAR ? `${enviados} enviado(s)` : `${pessoas.length} ensaiado(s)`}` +
    `${falhas ? `, ${falhas} falha(s): rode de novo e ele retoma só as que faltam` : ""}.` +
    `\nPasta: ${SAIDA}${ENVIAR ? "" : "  (dado pessoal: apague quando terminar de conferir)"}\n`,
);

process.exit(0);
