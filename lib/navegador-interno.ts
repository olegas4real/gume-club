/**
 * ════════════════════════════════════════════════════════════════════
 *  O NAVEGADOR DE DENTRO DO INSTAGRAM.
 *
 *  Quem clica num link de post abre a página no navegador embutido do app (Instagram,
 *  Facebook, TikTok, Threads, LinkedIn). O Google RECUSA login nesses navegadores
 *  ("403: disallowed_useragent"), por política dele. Então o botão "Criar conta com o
 *  Google", ali dentro, leva a uma tela de erro do Google, justo no dia em que a pessoa
 *  veio de um post.
 *
 *  A gente não consegue tirar a pessoa do app à força. Consegue não oferecer a porta que
 *  não abre, e dizer como sair: os três pontinhos, "Abrir no navegador". E e-mail e senha
 *  funcionam ali dentro, então o cadastro não para.
 * ════════════════════════════════════════════════════════════════════
 */
const APPS: [RegExp, string][] = [
  [/Instagram/i, "Instagram"],
  [/\bBarcelona\b/, "Threads"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/musical_ly|BytedanceWebview|TikTok/i, "TikTok"],
  [/LinkedInApp/i, "LinkedIn"],
];

export function navegadorInterno(ua: string | null | undefined): string | null {
  if (!ua) return null;
  for (const [re, nome] of APPS) if (re.test(ua)) return nome;
  return null;
}
