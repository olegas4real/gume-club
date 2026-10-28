# Desligar a instância hospedada

O `gume.club` saiu do ar em outubro de 2026. Este é o roteiro do que foi (ou tem que ser)
feito **fora** do repo, nas contas do dono, e na ordem em que importa.

A ordem não é burocracia. **Cobrança em aberto é o único item que custa dinheiro de outra
pessoa**, então ele vem antes de tudo. Dado de leitor é o único item que não se recupera
depois, então ele vem antes de apagar qualquer coisa.

---

## 0. Parar de cobrar (antes de qualquer outra coisa)

Enquanto o Stripe estiver ligado, as assinaturas renovam sozinhas. Um apoiador cobrado no
mês seguinte ao desligamento é a pior coisa que este projeto poderia fazer com a confiança
que ele diz ser o seu único ativo.

1. Painel do Stripe (modo **live**, não teste) → **Assinaturas** → filtrar por ativas.
2. Cancelar cada uma. Na hora do cancelamento, escolher **cancelar imediatamente**, e não
   "ao fim do período": o serviço acaba agora, então o período que resta não vai ser
   entregue.
3. Quem foi cobrado nos últimos dias: **reembolse**. Em Pagamentos, o reembolso é um botão.
   É pouco dinheiro e evita a única reclamação que faria sentido.
4. **Webhooks** → desativar o endpoint que aponta para `gume.club`. Depois que o app cair,
   cada evento vira uma tentativa que falha e um e-mail de erro do Stripe.
5. Guardar `STRIPE_WEBHOOK_SECRET` e as chaves fora do painel não é preciso: **revogue** a
   chave secreta em Desenvolvedores → Chaves de API. Chave viva de um app morto é só
   superfície de ataque.

## 1. Devolver a estante, no mesmo dia

**Não há prazo, e o desligamento é hoje**, por decisão do dono (2026-10-28). Isso muda o que
o e-mail é: ele não avisa que a saída existe, **ele é a saída**. Sem janela, quem não receber
o arquivo não tem como buscá-lo depois.

Duas consequências, e elas mandam na ordem do resto deste roteiro:

- **O envio acontece ANTES de apagar qualquer coisa.** O script lê o banco de produção para
  montar os arquivos: banco apagado é estante perdida, de todo mundo, sem volta.
- **Só quem tem mais de 10 livros recebe, e é decisão do dono.** Abaixo disso não sai nada.
  Quem tem meia dúzia de livros registrados não perde uma vida de leitura, e um disparo para a
  base inteira custa entrega e reputação de domínio que não se pagam por isso.

### A estante vai junto, em anexo

Quem tem uma vida de leitura ali dentro não devia depender de lembrar de entrar. O
`scripts/exportar-e-enviar.mjs` monta, para cada pessoa, **o mesmo zip do botão** (LEIA-ME,
`estante.csv` e `tudo.json`, vindos de `lib/exportar.ts`, e não de uma segunda versão
escrita à mão) e manda anexado pelo Resend.

Quem entra na lista: e-mail **verificado**, conta ativa, e mais de 10 livros na estante. A
verificação é a regra que importa: para um endereço verificado o anexo não expõe nada de
novo, porque quem tem aquela caixa já podia entrar pelo "esqueci a senha" e baixar o mesmo
arquivo. Para um endereço nunca verificado, exporia.

```bash
# 1. ENSAIO contra a PRODUÇÃO: não manda nada, e mostra a lista de quem receberia.
DATABASE_URL="<a do Railway>" pnpm devolver-estantes

# 2. De verdade, só para você. Confira o que chegou na sua caixa, e em que pasta.
DATABASE_URL="<a do Railway>" RESEND_API_KEY="<a de produção>" EMAIL_FROM="Gume <ola@gume.club>" \
  pnpm devolver-estantes --so=olegas4real --enviar

# 3. Todo mundo. Ele espera 10 segundos antes de começar, e dá para desistir no Ctrl-C.
DATABASE_URL="<a do Railway>" RESEND_API_KEY="<a de produção>" EMAIL_FROM="Gume <ola@gume.club>" \
  pnpm devolver-estantes --enviar
```

- **Passe o `DATABASE_URL` na mão**, sem `--env-file`: assim não existe a chance de o `.env`
  local apontar para o `localhost` e você achar que mandou.
- Ele **grava à medida que manda** (`saida-export/enviados.jsonl`). Se morrer no meio,
  rodar de novo retoma de onde parou e ninguém recebe duas vezes.
- Estante grande demais para caber num e-mail (mais de 15 MB) vai sem anexo, com o texto
  pedindo para entrar e baixar. O script diz quando isso acontece.
- `saida-export/` tem dado pessoal de leitores. Está no `.gitignore`, e o lugar dela depois
  é a lixeira.
- **Quem tem 10 livros ou menos não recebe nada**, por decisão do dono. O `--minimo` existe
  no script para quem um dia discordar, e o padrão é 10.
- Estante acima de 25 MB não cabe num e-mail: o script **falha alto** nessa pessoa, em vez de
  mandar uma carta pedindo para entrar num app que acabou de sair do ar. O zip dela fica na
  pasta de saída, para ir à mão.

O texto do e-mail mora dentro do script (`corpo()`), e não aqui: duas cópias da mesma carta
viram duas cartas diferentes no dia em que alguém mexe numa delas. O ensaio escreve o texto
renderizado em `saida-export/<handle>.txt`, que é onde se confere antes de mandar.

## 2. Guardar o banco antes de apagar o banco

Feito em 2026-10-28, e em duas partes, porque o banco tem duas naturezas e elas não merecem
o mesmo destino.

### O catálogo foi publicado, e é o que sobrevive ao projeto

O README prometia desde o primeiro dia "publicá-los de volta como um dataset aberto, para
que, se este projeto um dia acabar, os dados sobrevivam a ele". O projeto acabou, então era
agora ou nunca:

<https://github.com/olegas4real/gume-club/releases/tag/catalogo-2026-10-28>

265 mil obras, 302 mil edições, 124 mil autores e 473 mil identificadores, em CC0, num
tarball de 66 MB. Vai como **release**, e não commitado: o hook de pre-commit barra arquivo
acima de 10 MB, o GitHub recusa acima de 100 MB, e o git guarda toda versão para sempre, de
modo que um arquivo desses no histórico puniria todo mundo que clonasse, para sempre.

- `pnpm catalogo:exportar` gera o arquivo. O filtro de licença mora **dentro do script**, e
  não na cabeça de quem roda: `created_by` fica fora (é ponta de volta para uma pessoa), e
  todo texto cuja fonte é a Wikipédia sai, porque CC BY-SA dentro de um dataset CC0 é uma
  licença que ninguém consegue cumprir. Open Library e Wikidata são CC0 e ficam.
- `pnpm db:catalogo` baixa a última versão publicada e carrega num banco limpo. É o que faz
  "quem quiser roda o seu" deixar de ser meia verdade: antes, clonar entregava um app com o
  catálogo vazio e horas de importação pela frente.
- Testado de ponta a ponta antes de publicar: banco novo, `pnpm db:migrate`, `pnpm
  db:catalogo`, e as cinco contagens bateram com as da produção.

### A parte das pessoas não foi publicada, e não vai ser

Contas, estantes, leituras, resenhas, coleções, indicações, correções, honras e apoios
saíram em CSV para `~/Documents/gume-arquivo/gume-pessoas-2026-10-28.tar.gz`, 525 KB. Fora
do repositório, fora do GitHub, fora de qualquer release. Não é questão de ser sensível ou
não: **o que os leitores escreveram é deles**, e cada um já recebeu a própria estante por
e-mail no dia do desligamento. Este arquivo só existe para o caso de alguém escrever depois.

Senha, sessão, token de login e verificação ficaram **de fora de propósito**. Ninguém vai
logar de novo, e hash de senha de site morto é risco parado sem contrapartida.

Apague quando não fizer mais falta. Dado pessoal guardado sem motivo não é zelo, é passivo.

### A pedra no caminho, para quem repetir isso

O `pg_dump` 16 do Homebrew **se recusa** a falar com o Postgres 18 do Railway: *aborting
because of server version mismatch*. Por isso as duas saídas são CSV via `\copy` do psql,
que não liga para versão de servidor, em vez de um `-Fc`. Não se perde nada: as migrations
do repositório recriam o schema, e o CSV ainda abre em qualquer ferramenta, o que um dump
binário não faz.

## 3. Desligar, na ordem

| Onde | O que fazer |
|---|---|
| **Railway** | Apagar o serviço do app e o do Postgres, e depois o projeto. **Apagar o serviço não apaga o volume:** em 2026-10-28 os dois serviços sumiram e o `postgres-volume` ficou para trás, "detached", com 1 GB ocupado e ainda na conta. Volume órfão é o que continua cobrando depois que você acha que desligou tudo. O `railway status` lista em "All resources". |
| **Vercel Blob** | Apagar a store. São as imagens que os leitores subiram, e elas também são dado pessoal. |
| **Resend** | Revogar a `RESEND_API_KEY`. O domínio pode ficar verificado se você for usar `gume.club` para e-mail; se não, remova o domínio. |
| **Google Cloud** | Nas credenciais do OAuth, apagar o client (ou ao menos tirar `gume.club` das origens e dos redirects). Revogar a chave do Google Books. |
| **GitHub** | Revogar o `GITHUB_TOKEN` usado pela página de contribuidores e o OAuth app, se houver. |
| **Sentry** | Apagar o projeto, ou ao menos desativar o DSN. |
| **PostHog, Clarity, Google Analytics, Pixel da Meta, Cloudflare Analytics** | Apagar as propriedades. Elas guardam comportamento de gente que não existe mais como usuário, e dado que ninguém vai olhar é só risco parado. |

## 4. O domínio, que simplesmente acaba

`gume.club` **não vai redirecionar para lugar nenhum**, por decisão do dono no dia do
desligamento. A ideia era um 301 para o repositório, e ela morreu na prática: o DNS do
domínio está na Vercel, o registrador é a Name.com, e montar o redirecionamento exigia
trocar nameserver num painel e configurar encaminhamento em outro, para um domínio que
serviria só de placa. Trabalho demais para um projeto cujo ponto era parar de dar trabalho.

O que isso significa, escrito para não virar surpresa depois:

- O domínio está pago até **12 de julho de 2027**, e a partir dali expira sozinho se
  ninguém renovar. Até lá ele continua sem responder nada, que é o estado de hoje.
- **Link antigo de `gume.club` não leva mais ao projeto.** Quem procurar acha pelo GitHub,
  e é por isso que a descrição e os READMEs do repositório são agora a única porta de
  entrada: eles têm que se explicar sozinhos, sem contar com o domínio.
- Sobrou um registro A no apex apontando para `69.46.46.29`, que é o que faz o domínio
  pendurar em vez de dar erro limpo. Não vale mexer, já que o destino é expirar.
- Se um dia o nome voltar a importar (a checagem do INPI ficou em aberto), renovar antes de
  julho de 2027 é a única coisa que preserva a opção.

## 5. O repositório, que é o que sobra

- **About:** trocar a descrição e **tirar o site** do campo de website, ou apontá-lo para o
  próprio README.
- README, AGENTS.md, CLAUDE.md, CONTRIBUTING.md e os docs já dizem que não há instância
  hospedada (foi a mesma leva de mudanças que trouxe este arquivo).
- A página de patrocínio do GitHub foi removida junto com o `.github/FUNDING.yml`: não há
  mais conta de servidor para ajudar a pagar.

## 6. Depois

O que continua verdade, e é o que o README promete: o código roda numa máquina limpa com
dois comandos, a licença continua AGPL-3.0, e quem quiser subir a própria instância tem o
roteiro do que configurar no `.env.example` e em `docs/apoio.md`.

E agora com o catálogo junto. Quem clonar roda `pnpm db:catalogo` e sobe um Gume com 265 mil
livros em português dentro, em vez de um app vazio. O dado que levou anos para ser podado e
deduplicado é a única coisa deste projeto que não dependia de alguém pagar um servidor, e é a
que fica.
