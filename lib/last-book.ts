"use client";

/**
 * Onde você parou.
 *
 * O app lembra o último livro que você abriu, e oferece a volta. É a coisa mais
 * barata que existe e é a que mais some: você fecha o navegador no meio de uma
 * anotação e, no dia seguinte, gasta uma busca inteira para achar de novo o livro
 * que estava na sua mão.
 *
 * Mora no navegador, e só. Não vale uma coluna no banco, e o Gume não precisa
 * guardar num servidor que livro você abriu por último para ser útil.
 *
 * ═══ A CHAVE SABE DE QUEM É ═══
 *
 * Era uma chave só, `gume.ultimo-livro`, por NAVEGADOR. Num computador dividido, a
 * segunda conta via o último livro da primeira, e título de livro diz religião,
 * saúde, sexualidade, política. Uma conta recém-criada abria a home e lia "o último
 * livro que você abriu" sobre um livro que nunca abriu. Agora a chave leva o id da
 * conta, e sair da conta apaga todas (`lastBook.esquecer`).
 */
const PREFIXO = "gume.ultimo-livro";
const chave = (userId: string) => `${PREFIXO}.${userId}`;

export type LastBook = { slug: string; title: string };

/** Apaga a chave antiga, sem dono: não há como saber de quem ela era. */
function apagarAntiga() {
  try {
    localStorage.removeItem(PREFIXO);
  } catch {
    /* sem armazenamento: nada a apagar */
  }
}

export const lastBook = {
  write(userId: string, book: LastBook): void {
    try {
      apagarAntiga();
      localStorage.setItem(chave(userId), JSON.stringify(book));
    } catch {
      /* modo anônimo, cota cheia: esquecer é aceitável, quebrar não */
    }
  },

  read(userId: string): LastBook | null {
    if (typeof window === "undefined") return null;
    try {
      apagarAntiga();
      const raw = localStorage.getItem(chave(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LastBook;
      return parsed?.slug && parsed?.title ? parsed : null;
    } catch {
      return null;
    }
  },

  /** Ao sair da conta: o navegador não guarda nada de quem saiu. */
  esquecer(): void {
    try {
      const minhas: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k === PREFIXO || k?.startsWith(`${PREFIXO}.`)) minhas.push(k);
      }
      for (const k of minhas) localStorage.removeItem(k);
    } catch {
      /* sem armazenamento: nada a esquecer */
    }
  },
};
