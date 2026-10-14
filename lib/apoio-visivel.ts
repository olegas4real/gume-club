import { cookies } from "next/headers";
import { apoioLigado } from "@/lib/stripe";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O APOIO APARECE PARA ESTA REQUISIÇÃO? A pergunta única, para toda tela.
 *
 *  `apoioLigado()` (lib/stripe.ts) diz se a INSTÂNCIA tem apoio: é uma chave de
 *  ambiente, e não sabe nada de quem pediu a página. Esta aqui sabe: dentro do app
 *  Android da Play Store, o apoio via Stripe SOME, porque a Play exige o sistema de
 *  pagamento dela para benefício digital, e a moldura/etiqueta de apoiador conta como
 *  benefício. No site, nada muda. O app se anuncia pelo cookie `gume_app`, gravado no
 *  middleware quando o app abre (`/?origem=android`).
 *
 *  ═══ POR QUE NÃO MORA EM lib/stripe.ts ═══
 *
 *  `cookies()` só existe dentro de uma requisição, e lib/stripe.ts é importado por
 *  app/robots.ts e app/sitemap.ts, que podem rodar fora de uma. Arrastar next/headers
 *  para lá quebraria exatamente onde ninguém testa.
 *
 *  ═══ A REGRA É UMA SÓ, E TODA TELA PASSA POR AQUI ═══
 *
 *  lib/apoio-no-android.test.ts proíbe `apoioLigado(` fora de lib/: uma tela nova que
 *  chame a pergunta da instância direto esquece o app Android, e o esquecimento é
 *  exatamente o que derruba o app na revisão da Play.
 * ════════════════════════════════════════════════════════════════════
 */

/** A decisão, pura: visível quando a instância tem apoio E a requisição não vem do app. */
export function apoioVisivelCom(ligado: boolean, noAppAndroid: boolean): boolean {
  return ligado && !noAppAndroid;
}

/** Esta requisição veio do app Android? */
export async function noAppAndroid(): Promise<boolean> {
  return (await cookies()).has("gume_app");
}

/** A pergunta que as telas e as rotas fazem. */
export async function apoioVisivel(): Promise<boolean> {
  return apoioVisivelCom(apoioLigado(), await noAppAndroid());
}
