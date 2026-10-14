/**
 * ════════════════════════════════════════════════════════════════════
 *  O CÓDIGO DE BARRAS É UM LIVRO?
 *
 *  O código de barras da contracapa É o ISBN-13: os números embaixo das barras são os
 *  mesmos que você digitaria. Mas livro brasileiro às vezes traz um SEGUNDO código, o do
 *  preço ou do controle da loja, e a câmera lê o que estiver na frente. Ler esse e buscar
 *  é procurar um livro que não existe.
 *
 *  Então só passa o que tem cara de ISBN: treze dígitos, começando com 978 ou 979 (o
 *  "país" dos livros no padrão EAN), e com o dígito verificador certo. O verificador
 *  pega leitura torta da câmera, que troca um número e mantém o tamanho.
 * ════════════════════════════════════════════════════════════════════
 */
export function isbnDoCodigo(lido: string): string | null {
  const d = lido.replace(/\D/g, "");
  if (d.length !== 13 || !/^97[89]/.test(d)) return null;
  const soma = [...d.slice(0, 12)].reduce((s, c, i) => s + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
  const verificador = (10 - (soma % 10)) % 10;
  return verificador === Number(d[12]) ? d : null;
}
