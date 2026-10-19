import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O FUNIL DE ENTRADA. Ver a migration 0069 para o porquê da tabela.
 *
 *  Este módulo é a ÚNICA porta de escrita em `eventos_funil`, e ela nunca
 *  aceita texto livre: `tipo` é uma lista fechada, e `origem` sempre passa
 *  por `normalizarOrigem()` antes de tocar o banco. A URL de referrer ou o
 *  utm_source crus NUNCA chegam ao SQL — só o balde em que caem, ou nada.
 * ════════════════════════════════════════════════════════════════════
 */

export const SESSAO_ANON_COOKIE = "gume_sessao_anon";

/** 30 minutos: o "expira" do pedido. Ajustável, não é sagrado. */
export const SESSAO_ANON_MAX_AGE = 60 * 30;

export const TIPOS_DE_EVENTO = ["visita_home", "clique_criar", "viu_entrar", "cadastro_ok"] as const;
export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

const MODOS = ["entrar", "criar"] as const;
export type ModoInicial = (typeof MODOS)[number];

/**
 * Os buckets conhecidos. Um nome fora desta lista vira "outro": a URL de
 * referrer (que pode identificar — um link mandado numa DM é um link só)
 * nunca é gravada, só o balde.
 */
// "threads" vem antes de "instagram": o app do Threads é da mesma casa, e um link dele é
// do Threads. TikTok, LinkedIn e Threads entraram para os posts de lançamento (2026-10-12).
const BUCKETS = ["reddit", "facebook", "threads", "instagram", "tiktok", "linkedin", "twitter", "whatsapp", "google", "direto"] as const;
type Bucket = (typeof BUCKETS)[number] | "outro";

/**
 * Normaliza um referrer ou um utm_source num balde conhecido. Aceita
 * qualquer coisa (o corpo da requisição não é confiável) e nunca lança.
 */
export function normalizarOrigem(bruto: unknown): Bucket | null {
  if (typeof bruto !== "string") return null;
  const limpo = bruto.trim().toLowerCase();
  if (!limpo) return null;

  for (const nome of BUCKETS) {
    if (limpo.includes(nome)) return nome;
  }
  // Hostname de referrer bate por domínio, para pegar "l.facebook.com",
  // "old.reddit.com" etc. sem precisar listar cada subdomínio.
  if (/facebook\.|fb\.com/.test(limpo)) return "facebook";
  if (/reddit\./.test(limpo)) return "reddit";
  if (/instagram\./.test(limpo)) return "instagram";
  if (/(twitter\.|x\.com)/.test(limpo)) return "twitter";
  if (/whatsapp\./.test(limpo)) return "whatsapp";
  if (/google\./.test(limpo)) return "google";
  if (/threads\.(net|com)/.test(limpo)) return "threads";
  if (/tiktok\.|vm\.tiktok/.test(limpo)) return "tiktok";
  if (/linkedin\.|lnkd\.in/.test(limpo)) return "linkedin";
  // As abreviações que os próprios apps põem no utm_source.
  if (limpo === "ig") return "instagram";
  if (limpo === "fb") return "facebook";
  if (limpo === "tt") return "tiktok";

  return "outro";
}

/**
 * ════════════════════════════════════════════════════════════════════
 *  O RÓTULO DA PEÇA: `utm_campaign` e `utm_content`. Ver a migration 0070.
 *
 *  Por que estes podem ser gravados e o referrer não: eles são rótulos que
 *  NÓS escrevemos, no nosso próprio gerenciador de anúncios, iguais para
 *  todo mundo que clica naquela peça. "angulos-out2026" e "estante" são o
 *  nome do cartaz, e não quem passou na frente dele.
 *
 *  Não dá para ser lista fechada como os baldes de `origem`: campanha nova
 *  nasce toda semana, e uma lista no código obrigaria um deploy para medir
 *  um anúncio. Então o limite é de FORMA, e não de conteúdo — minúsculas,
 *  só `a-z 0-9 - _`, no máximo 40. O que não couber vira nulo, inteiro: um
 *  `utm_content` forjado com um e-mail dentro não é "limpo e gravado pela
 *  metade", ele simplesmente não vira linha.
 * ════════════════════════════════════════════════════════════════════
 */
const ROTULO_MAXIMO = 40;

export function normalizarRotulo(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const limpo = bruto.trim().toLowerCase();
  if (!limpo || limpo.length > ROTULO_MAXIMO) return null;
  // Tudo ou nada: sanear o que sobra depois de tirar o que não era para estar
  // ali grava um rótulo que ninguém escreveu, e que não casa com nenhum anúncio.
  return /^[a-z0-9_-]+$/.test(limpo) ? limpo : null;
}

export function ehTipoDeEvento(v: unknown): v is TipoDeEvento {
  return typeof v === "string" && (TIPOS_DE_EVENTO as readonly string[]).includes(v);
}

export function ehModoInicial(v: unknown): v is ModoInicial {
  return typeof v === "string" && (MODOS as readonly string[]).includes(v);
}

/**
 * Grava uma linha. Nunca lança: quem visita a home ou está tentando criar
 * conta não pode ver a própria página cair porque o caderninho de medição
 * falhou. Mesma filosofia de `registrarBuscaVazia` (lib/torneira.ts).
 */
export async function registrarEventoFunil(dados: {
  tipo: TipoDeEvento;
  origem: Bucket | null;
  modoInicial: ModoInicial | null;
  sessaoAnon: string;
  campanha?: string | null;
  criativo?: string | null;
}): Promise<void> {
  try {
    await db.execute(sql`
      insert into eventos_funil (tipo, origem, modo_inicial, sessao_anon, campanha, criativo)
      values (
        ${dados.tipo}, ${dados.origem}, ${dados.modoInicial}, ${dados.sessaoAnon}::uuid,
        ${dados.campanha ?? null}, ${dados.criativo ?? null}
      )
    `);
  } catch {
    // Ver o cabeçalho: o caderninho é problema nosso, nunca da pessoa navegando.
  }
}
