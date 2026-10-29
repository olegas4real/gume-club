import Link from "next/link";
import { Mark } from "@/components/mark";

export const metadata = {
  title: "Privacidade",
  description: "O que o Gume guarda sobre você, para quê, e como levar embora ou apagar.",
};

/**
 * ════════════════════════════════════════════════════════════════════
 *  A POLÍTICA DE PRIVACIDADE. Curta, e só com o que é verdade.
 *
 *  `/privacidade` respondia 404, e o cadastro coletava nome, e-mail e senha sem uma
 *  linha de texto legal. O Gume guarda histórico de leitura, e título de livro diz
 *  religião, saúde, sexualidade e política. LGPD se aplica, e a página tinha que existir
 *  antes de qualquer tráfego de rede social.
 *
 *  ═══ CADA LINHA AQUI É UMA AFIRMAÇÃO SOBRE O CÓDIGO ═══
 *
 *  A lista de serviços é tudo que o CÓDIGO sabe ligar (as variáveis de lib/email.ts,
 *  lib/guardar.ts, lib/stripe.ts e lib/auth.ts). Ligar um serviço novo sem acrescentá-lo aqui transforma
 *  esta página numa mentira educada. O mesmo vale para o que se apaga: ver lib/conta.ts.
 *
 *  ═══ ELA NÃO FALA MAIS POR UMA INSTÂNCIA HOSPEDADA, PORQUE NÃO HÁ UMA ═══
 *
 *  Até outubro de 2026 esta página descrevia o gume.club, e podia afirmar no presente o
 *  que estava ligado lá. O site saiu do ar, e quem roda o Gume agora é outra pessoa, na
 *  máquina dela. Afirmar "usamos o Clarity" para a cópia de um estranho seria falso, e o
 *  texto passa a dizer que o que está ligado depende de quem hospeda.
 *
 *  No mesmo dia a questão ficou mais simples do que isso: os medidores saíram do código
 *  inteiro (Clarity, Google Analytics, PostHog, pixel da Meta, Cloudflare Analytics e
 *  Sentry). O que sobrou nesta lista é só o que o Gume precisa para FUNCIONAR, e nenhum
 *  deles mede ninguém.
 *
 *  O CONTATO vem de NEXT_PUBLIC_CONTATO pelo mesmo motivo: um endereço cravado aqui
 *  mandaria o pedido de LGPD de quem usa a cópia de outra pessoa para uma caixa que não
 *  é dela. Sem a variável, a página diz para procurar quem hospeda, em vez de oferecer
 *  um endereço que não responde.
 *
 *  `ATUALIZADA` muda junto com qualquer mudança de conteúdo.
 * ════════════════════════════════════════════════════════════════════
 */

const ATUALIZADA = "28 de outubro de 2026";
const CONTATO = process.env.NEXT_PUBLIC_CONTATO ?? null;

const SERVICOS: { quem: string; para: string }[] = [
  {
    quem: "Railway",
    para:
      "o servidor onde o Gume roda e onde os dados ficam guardados. O site oficial rodava lá, nos Estados Unidos, e saiu do ar em outubro de 2026.",
  },
  { quem: "Resend", para: "manda os e-mails do Gume, como o código para entrar e o de trocar a senha." },
  { quem: "Vercel", para: "guarda a foto de perfil, se você puser uma." },
  { quem: "Google", para: "só se você entrar com a conta do Google: recebemos o seu nome, e-mail e foto." },
  { quem: "Stripe", para: "só se você apoiar: o pagamento acontece lá, e o número do cartão nunca passa pelo Gume." },
];

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 sm:px-10">
      <section className="pt-20 sm:pt-28">
        <Mark size={30} className="text-[var(--color-ink-soft)]" />
        <h1 className="voice mt-10 text-[40px] leading-[1.06] tracking-[-0.02em] sm:text-[52px]">
          Privacidade
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--color-ink-soft)]">
          O que você lê diz muito sobre você. O Gume guarda só o que precisa para funcionar, não
          vende nada para ninguém, não mostra anúncio, e você pode levar tudo embora ou apagar
          quando quiser.
        </p>
        <p className="mt-3 text-[13px] text-[var(--color-ink-faint)]">Atualizada em {ATUALIZADA}.</p>
      </section>

      <Bloco titulo="O que guardamos">
        <p>
          <strong className="font-medium text-[var(--color-ink)]">Da sua conta:</strong> nome, @,
          e-mail e senha (guardada embaralhada, ninguém consegue lê-la). Se você quiser, também uma
          foto, uma frase sobre você e links.
        </p>
        <p>
          <strong className="font-medium text-[var(--color-ink)]">Da sua leitura:</strong> os livros
          da estante, as datas, as palavras que você deu, as resenhas, as coleções, quem você segue
          e as correções que você fez em fichas de livros.
        </p>
        <p>
          <strong className="font-medium text-[var(--color-ink)]">Do uso:</strong> o dia em que você
          apareceu pela última vez (só a data, não a hora nem o que fez), e, enquanto você está
          dentro, o navegador e o endereço de internet da sessão, para que ninguém use a sua conta
          sem você.
        </p>
      </Bloco>

      <Bloco titulo="Para quê">
        <p>
          Para o Gume funcionar: mostrar a sua estante, contar as suas leituras, deixar seus amigos
          verem o que você escolheu mostrar. Nada disso é vendido, cedido para anúncio ou usado para
          treinar inteligência artificial.
        </p>
      </Bloco>

      <Bloco titulo="Quem vê o quê">
        <p>
          Cada livro tem a sua escolha: público, só para quem segue você, ou só você. O que é
          privado não aparece para mais ninguém, nem no seu perfil, nem nas contagens dos outros.
        </p>
      </Bloco>

      <Bloco titulo="Quem mais toca nos dados">
        <p>
          O Gume sabe usar alguns serviços de fora, e cada um recebe só a parte que precisa.
          Quais estão ligados depende de quem hospeda a cópia que você está usando:
        </p>
        <ul className="flex flex-col gap-3">
          {SERVICOS.map((s) => (
            <li key={s.quem}>
              <strong className="font-medium text-[var(--color-ink)]">{s.quem}</strong>: {s.para}
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco titulo="Levar embora">
        <p>
          No seu{" "}
          <Link href="/perfil" className="underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)]">
            perfil
          </Link>
          , &ldquo;Baixar a minha estante&rdquo; entrega um arquivo com tudo: estante, datas, notas e
          resenhas, inclusive as privadas. Na hora, sem pedido e sem espera, num formato que outros
          apps sabem ler.
        </p>
      </Bloco>

      <Bloco titulo="Apagar">
        <p>
          No seu perfil, &ldquo;Apagar a minha conta&rdquo; apaga de vez a conta, a estante, as notas, as
          resenhas, as coleções e quem você segue. Se você apoia todo mês, o apoio é cancelado
          junto. As correções que você fez em fichas de livros ficam, sem o seu nome, porque a ficha
          certa é de todo mundo.
        </p>
        {CONTATO ? (
          <p>
            Se preferir, ou se não conseguir entrar, escreva para{" "}
            <a href={`mailto:${CONTATO}`} className="underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)]">
              {CONTATO}
            </a>{" "}
            a partir do e-mail da conta, e a gente apaga por você.
          </p>
        ) : (
          <p>
            Se preferir, ou se não conseguir entrar, fale com quem hospeda esta cópia do Gume, a
            partir do e-mail da conta.
          </p>
        )}
      </Bloco>

      <Bloco titulo="Seus direitos">
        <p>
          Pela Lei Geral de Proteção de Dados, você pode saber o que guardamos, corrigir, levar
          embora e pedir para apagar. A maior parte disso você faz sozinho, no perfil.
          {CONTATO ? (
            <>
              {" "}
              Para o resto, ou para qualquer dúvida, o endereço é{" "}
              <a href={`mailto:${CONTATO}`} className="underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)]">
                {CONTATO}
              </a>
              .
            </>
          ) : (
            <> Para o resto, ou para qualquer dúvida, fale com quem hospeda esta cópia do Gume.</>
          )}
        </p>
      </Bloco>
    </main>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">{titulo}</h2>
      <div className="mt-4 flex max-w-xl flex-col gap-4 text-[16px] leading-relaxed text-[var(--color-ink-soft)]">
        {children}
      </div>
    </section>
  );
}
