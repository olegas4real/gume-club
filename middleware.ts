import { NextResponse, type NextRequest } from "next/server";
import { imgSrc } from "@/lib/imagens";

/**
 * ════════════════════════════════════════════════════════════════════
 *  A porta. Toda requisição passa aqui, e ela faz UMA coisa:
 *  CABEÇALHOS DE SEGURANÇA, em toda resposta.
 *
 *  ═══ O RATE LIMIT MORAVA AQUI, E ELE SAIU. É O CONSERTO, E NÃO UMA PERDA ═══
 *
 *  Ele era chamado daqui, e era uma coisa linda:
 *
 *      "Uma ação de servidor do Next é um POST para a própria página, então limitar
 *       POST cobre todas elas de uma vez, inclusive as que ainda não foram escritas.
 *       Uma ação nova nasce protegida sem ninguém lembrar."
 *
 *  Só que o balde vivia na MEMÓRIA DO PROCESSO, e memória de processo só conta enquanto
 *  existe UM processo. Assim que há réplicas, mil tentativas de senha se espalham entre
 *  elas, cada uma conta o seu punhado, nenhuma passa do teto de dez, e **as mil passam**.
 *
 *  O limite não afrouxava. Ele deixava de existir, e continuava parecendo que existia —
 *  que é a pior das duas coisas, porque ninguém vai conferir o que já está escrito.
 *
 *  E não dava para só trocar o Map pelo Postgres AQUI: o middleware do Next roda no
 *  runtime **Edge**, que não abre conexão com banco. O limite não podia ficar.
 *
 *  ═══ PARA ONDE ELE FOI ═══
 *
 *      /api/auth/*   → app/api/auth/[...all]/route.ts   (Node, e conta no Postgres)
 *      /api/buscar   → app/api/buscar/route.ts          (Node, e conta no Postgres)
 *      toda escrita  → lib/actor.ts, dentro de getActor()
 *
 *  E a propriedade que valia ouro está de pé: `getActor()` é o portão por onde toda
 *  mutação já passava ("who is writing", diz o arquivo desde sempre), então **uma ação
 *  nova continua nascendo contada sem ninguém lembrar** — e `lib/acoes.test.ts` quebra o
 *  build se alguma escapar. Ver lib/rate-limit.ts e lib/escrita.ts.
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * ════════════════════════════════════════════════════════════════════
 *  O PONTO E A BARRA CODIFICADOS NÃO ENTRAM.
 *
 *  `GET /robots%2etxt` devolvia **erro 500**, e não 404: em algum ponto do
 *  caminho o Next desfaz o `%2e` e passa a enxergar `/robots.txt`, mas quem já
 *  tinha sido escolhido para atender era a rota dinâmica de perfil. As duas
 *  discordam sobre o que a resposta é, e o Next aborta com "Invariant app-page
 *  handler received invalid cache entry APP_ROUTE" (Sentry 7789689274).
 *
 *  É um defeito do Next, e não dá para consertar daqui. Dá para a requisição
 *  nunca chegar lá.
 *
 *  ═══ POR QUE ISTO NÃO ATRAPALHA NINGUÉM DE VERDADE ═══
 *
 *  Handle é `^[a-z][a-z0-9-]{1,29}$` (ver lib/handles.ts) e slug é da mesma
 *  família: nenhum endereço do Gume tem ponto ou barra dentro de um pedaço do
 *  caminho, então nenhum precisa codificar os dois. Um `%C3%A3` de acento
 *  continua passando — a regra mira SÓ nas duas codificações que fazem
 *  normalizador de rota discordar de si mesmo, que é a sondagem clássica de
 *  travessia de caminho.
 *
 *  404 e não redirecionamento: `/robots%2etxt` não é um endereço com erro de
 *  digitação de alguém, é um robô procurando buraco. Mandar ele para o lugar
 *  certo é dar a resposta que ele veio buscar.
 * ════════════════════════════════════════════════════════════════════
 */
const PONTO_OU_BARRA_CODIFICADOS = /%2[ef]/i;

export function middleware(req: NextRequest) {
  const res = PONTO_OU_BARRA_CODIFICADOS.test(req.nextUrl.pathname)
    ? new NextResponse("Não encontrado.", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    : NextResponse.next();

  /**
   * ═══ A MARCA DE "ESTOU DENTRO DO APP ANDROID" ═══
   *
   * O app da Play Store é o site embrulhado (TWA, ver docs/android.md), e ele abre
   * sempre em `/?origem=android`. A Play exige o sistema de pagamento dela para
   * benefício digital, e a moldura/etiqueta de apoiador conta como benefício: dentro
   * do app, o apoio via Stripe tem que sumir. Este cookie é como as telas e as rotas
   * sabem disso (ver lib/apoio-visivel.ts).
   *
   * Renovado sempre que já existe, porque quem instala o app navega semanas sem voltar
   * ao start URL. Esconder o botão é a cortesia; a defesa é a rota de checkout recusar.
   * E forjar o cookie no navegador só esconde o apoio de si mesmo: inofensivo.
   */
  if (req.nextUrl.searchParams.get("origem") === "android" || req.cookies.has("gume_app")) {
    res.cookies.set("gume_app", "android", {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }


  /**
   * Os cabeçalhos.
   *
   * A CSP é a peça que importa: sem ela, um XSS em qualquer campo de texto vira
   * roubo de sessão. `unsafe-inline` no script é o preço do Next (ele injeta o
   * bootstrap inline), e ele está anotado no SECURITY-AUDIT.md como a próxima
   * coisa a apertar, com nonce.
   *
   * ═══ `img-src` VEM DE `lib/imagens.ts`, E NÃO DAQUI ═══
   *
   * A lista de origens de imagem viva em DOIS lugares — aqui, e no formulário que
   * valida o endereço colado — é uma lista que diverge. Alguém acrescenta uma origem
   * de um lado, esquece do outro, e o formulário passa a recusar uma imagem que
   * funcionaria (ou, pior, a aceitar uma que o navegador vai bloquear em silêncio).
   *
   * É uma lista só, e ela mora em `lib/imagens.ts`, junto do motivo de cada origem
   * estar nela.
   *
   * `connect-src 'self'` porque o app não fala com ninguém de fora do navegador: quem
   * busca no Open Library é o servidor, e não o cliente.
   */
  /**
   * ═══ NENHUM HOST DE MEDIÇÃO ABRE ESTA POLÍTICA, PORQUE NÃO HÁ MEDIÇÃO ═══
   *
   * Aqui moravam três listas (o script que entrava na página, o host com quem ele
   * podia falar, e o pixel que ele mandava como imagem) para Cloudflare Analytics,
   * Clarity, Google Analytics, PostHog, pixel da Meta e Sentry. Elas ligavam e
   * desligavam junto com as variáveis, e sem as variáveis não abriam nada.
   *
   * Saíram inteiras quando a medição saiu. A política voltou a ser o que a frase
   * acima diz: o app não fala com ninguém de fora do navegador. Se um dia alguém
   * quiser medir a própria instância, a lista volta junto com o script, pela mesma
   * variável, e nunca uma sem a outra: porta aberta sem script é buraco, e script
   * sem porta é medidor morto em silêncio.
   */

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    /**
     * A CSP vale para a CADEIA do redirect, e não só para o primeiro host.
     * covers.openlibrary.org responde 302 para archive.org, então liberar apenas
     * o primeiro fazia a capa chegar até a porta e morrer nela: a parede da home
     * aparecia com metade dos livros quebrados. Sintoma de CSP quase sempre é
     * isto, e nunca o host que você digitou.
     */
    imgSrc(),
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");

  res.headers.set("content-security-policy", csp);
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // HSTS só quando existir HTTPS de verdade. Ligado em desenvolvimento, ele
  // prenderia o localhost de todo mundo em https por um ano.
  if (process.env.NODE_ENV === "production") {
    res.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }

  return res;
}

export const config = {
  // Tudo, menos o que o Next serve de estático. As capas e os avatares enviados
  // passam por aqui de propósito: eles também levam os cabeçalhos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
