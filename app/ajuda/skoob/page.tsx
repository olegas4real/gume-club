import Link from "next/link";

export const metadata = {
  title: "Trazer a estante do Skoob",
  description:
    "O Skoob não tem exportação. Os caminhos que funcionam hoje para trazer seus livros de lá para o Gume.",
};

/**
 * ════════════════════════════════════════════════════════════════════
 *  QUEM VEM DO SKOOB. A página que diz a verdade antes de dar o caminho.
 *
 *  O Skoob não tem exportação oficial (a central de ajuda deles, abril de 2026), e a
 *  API pública morreu em setembro de 2025. O Gume prometia "o arquivo que você baixou
 *  do Skoob", e esse arquivo não existe. Esta página é o "veja como" do importador.
 *
 *  ═══ CADA CAMINHO AQUI FOI MEDIDO ═══
 *
 *  As colunas e as estantes listadas são as que o importador lê, com teste
 *  (lib/import/skoob.test.ts). Se o parser mudar, esta página muda junto.
 *
 *  ═══ O GUME NUNCA PEDE O ACESSO DO SKOOB ═══
 *
 *  Nem senha, nem sessão, nem chave. Credencial de outro site não entra no Gume. O
 *  programa de terceiro citado abaixo roda no computador da pessoa; o Gume só lê o
 *  arquivo que ele gera, como leria qualquer outro.
 * ════════════════════════════════════════════════════════════════════
 */

const LINK = "underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)]";

const COLUNAS: [string, string][] = [
  ["Título", "obrigatória"],
  ["Autor", "ajuda muito a achar o livro certo"],
  ["ISBN", "se tiver; sem ele, o livro é achado pelo título e pelo autor"],
  ["Estante", "lido, lendo, quero ler, vou ler, relendo ou abandonei"],
  ["Nota", "de 1 a 5; 4,5 também serve"],
  ["Data de leitura", "no jeito brasileiro, 07/03/2024"],
  ["Resenha", "o texto que você escreveu"],
];

export default function AjudaSkoob() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 sm:px-10">
      <section className="pt-20 sm:pt-28">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">ajuda</p>
        <h1 className="voice mt-6 text-[36px] leading-[1.08] tracking-[-0.02em] sm:text-[48px]">
          Trazer a sua estante do Skoob
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--color-ink-soft)]">
          O Skoob não tem botão de exportar. A própria ajuda deles diz que não oferece exportar
          nem importar a estante, por enquanto. Então não existe um arquivo pronto para baixar
          de lá. Mas existem caminhos, e o primeiro funciona até no celular.
        </p>
      </section>

      <Passo n="1" titulo="Colar a lista de títulos">
        <p>
          Abra a sua estante no Skoob, copie os títulos (um por linha, com o autor do lado se
          der) e cole no Gume. O Gume mostra o que achou antes de pôr qualquer coisa na sua
          estante, e você desmarca o que ele errou.
        </p>
        <p>
          <Link href="/importar#colar" className={LINK}>
            Colar uma lista
          </Link>
          . É o caminho mais rápido, e você escolhe se eles entram como lidos, lendo ou
          esperando. O que ele não traz: nota, data e resenha. Linha que o Gume não achar
          fica de fora, e nunca entra no chute.
        </p>
      </Passo>

      <Passo n="2" titulo="Montar uma planilha">
        <p>
          Para trazer também a nota, a data e a resenha: monte uma planilha com as colunas
          abaixo, salve como CSV (no Excel ou no Google Planilhas, &ldquo;salvar como&rdquo; ou
          &ldquo;fazer download&rdquo;) e mande no{" "}
          <Link href="/importar" className={LINK}>
            importador
          </Link>
          . Os nomes das colunas podem estar em português, e a ordem não importa.
        </p>
        <ul className="flex flex-col gap-2">
          {COLUNAS.map(([coluna, oQue]) => (
            <li key={coluna}>
              <strong className="font-medium text-[var(--color-ink)]">{coluna}</strong>: {oQue}
            </li>
          ))}
        </ul>
        <p>
          Quem estava relendo entra como &ldquo;lendo&rdquo;. A leitura anterior não vem no arquivo,
          e você marca depois, no livro, se quiser.
        </p>
      </Passo>

      <Passo n="3" titulo="Um programa feito por um leitor">
        <p>
          Existe um programa gratuito, feito por um leitor e não pelo Skoob, que baixa a sua
          estante num arquivo que o Gume sabe ler:{" "}
          <a href="https://github.com/vinyluis/skoob_downloader" className={LINK} rel="noreferrer">
            skoob_downloader
          </a>
          . Ele roda no seu computador e pede que você copie, do seu navegador, uma chave da
          sua sessão do Skoob. Não sabemos se ele ainda funciona, e quem o usa, usa por conta
          própria.
        </p>
        <p>
          O Gume nunca pede a sua senha, a sua sessão ou qualquer chave do Skoob, e nunca vai
          pedir. Se o programa gerar o arquivo, é só mandar no importador, como qualquer outro.
        </p>
      </Passo>
    </main>
  );
}

function Passo({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="flex items-baseline gap-3">
        <span className="voice tabular text-[28px] text-[var(--color-ink-faint)]">{n}</span>
        <span className="voice text-[24px] leading-snug">{titulo}</span>
      </h2>
      <div className="mt-4 flex max-w-xl flex-col gap-4 text-[16px] leading-relaxed text-[var(--color-ink-soft)]">
        {children}
      </div>
    </section>
  );
}
