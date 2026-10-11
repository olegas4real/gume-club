/**
 * ════════════════════════════════════════════════════════════════════
 *  A LETRA QUE CHEGA ANTES DO FOCO.
 *
 *  A auditoria de 2026-10-10 mediu: ⌘K e digitar em seguida, e o texto não entrava; ⌘K,
 *  esperar, digitar, e funcionava. O foco do campo vinha num `setTimeout`, depois de a
 *  paleta montar, e o que a pessoa digitava nesse intervalo caía na página. Quem digita
 *  rápido perdia o começo da palavra, na ação mais repetida do app.
 *
 *  O foco agora vem na montagem (components/command.tsx). E, para a letra que ainda
 *  assim chegar antes dele, a paleta aberta pega a tecla e a põe no campo. Esta função
 *  decide quais teclas são TEXTO: um caractere só, sem ⌘, Ctrl ou Alt (que são atalhos).
 * ════════════════════════════════════════════════════════════════════
 */
export function teclaPerdida(
  e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean },
  focoNoCampo: boolean,
): string | null {
  if (focoNoCampo) return null;
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  return e.key.length === 1 ? e.key : null;
}
