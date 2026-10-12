/**
 * ════════════════════════════════════════════════════════════════════
 *  PARA ONDE VOLTAR DEPOIS DE ENTRAR.
 *
 *  Quem clicava em "Crie sua conta para guardar este livro" criava a conta e caía na
 *  home: o livro que motivou o cadastro sumia. O mesmo em /apoiar e no perfil de
 *  alguém. Agora a chamada leva `?volta=/livro/...`, e /entrar devolve a pessoa lá.
 *
 *  ═══ SÓ CAMINHO DE DENTRO ═══
 *
 *  Um `volta` aceito sem conferir é um redirecionamento aberto: um link
 *  `gume.club/entrar?volta=https://golpe.com` usaria o nosso domínio para mandar
 *  alguém, recém-logado e confiante, para outro site. Então só passa caminho que
 *  começa com UMA barra, sem barra invertida e sem esquema. O resto vira "/".
 * ════════════════════════════════════════════════════════════════════
 */
export function destinoSeguro(volta: string | null | undefined): string {
  const v = (volta ?? "").trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return "/";
  if (/^\/(entrar|api)(\/|\?|$)/.test(v)) return "/";
  if (/[\u0000-\u001f]/.test(v)) return "/";
  return v.slice(0, 300);
}

/** O link de criar conta (ou de entrar) que traz a pessoa de volta para `aqui`. */
export function comVolta(base: string, aqui: string | null | undefined): string {
  const destino = destinoSeguro(aqui);
  if (destino === "/") return base;
  return `${base}${base.includes("?") ? "&" : "?"}volta=${encodeURIComponent(destino)}`;
}
