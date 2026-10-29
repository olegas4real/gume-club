# Como contribuir

> **Antes de tudo: ninguém está de plantão.** O Gume saiu do ar em outubro de 2026, e o
> repositório ficou sem mantenedor. Seu PR pode ficar aberto para sempre, e a sua pergunta
> pode não ser respondida. Isto aqui continua escrito porque é um bom mapa do código, e
> porque a trava que ele descreve é automática e continua funcionando: o CI é o porteiro,
> e ele não dormiu.
>
> **Se o que você quer é levar o Gume adiante, faça um fork.** A AGPL-3.0 existe para
> isso, e não há ninguém para pedir licença. Mantenha o código aberto, e pronto.

Sem CLA. Sem checklist de dez itens. Sem pedir permissão pra começar.

O caminho do primeiro PR tem quatro passos, e eles estão logo abaixo.

As [Discussões](https://github.com/olegas4real/gume-club/discussions) continuam de pé, e o
histórico delas é útil: é onde se decidiu boa parte do que está no código, e dá para
descobrir que uma ideia já foi discutida. Só não espere resposta nova.

Fica no mesmo lugar do código, e isso é de propósito: a conversa que decide uma coisa tem que
poder ser encontrada por quem chegar depois, e não sumir na rolagem de um chat.

---

## O primeiro PR, em quatro passos

### 1. Rode

```bash
git clone https://github.com/olegas4real/gume-club.git
cd gume-club
cp .env.example .env
docker compose up -d      # sobe o Postgres
pnpm install
pnpm db:migrate
pnpm dev                  # http://localhost:3000
```

Quer uma estante de exemplo para não começar com o app vazio? `pnpm db:seed` planta
vinte livros conhecidos (`seed/exemplo.csv`).

No Mac, sem Docker, `bash scripts/setup-mac.sh` faz tudo isso sozinho.

Confira que está de pé antes de mexer em qualquer coisa:

```bash
pnpm typecheck && pnpm test
```

**Se qualquer um desses dois comandos falhar na sua máquina, pare aqui e fale com a gente.**
Isso é um bug, é nosso, e é o mais importante que existe: código aberto que você não consegue
rodar é decoração. Atrito no setup é o motivo de projetos como esse nunca conseguirem
contribuidores, e a gente prefere gastar um sábado consertando isso do que qualquer outra coisa
nessa página.

### 2. Escolha uma issue

As issues marcadas **`good first issue`** são de verdade. Cada uma diz o que é, por que importa,
**qual arquivo mexer**, e como testar que funcionou. Nenhuma delas exige que você entenda o app
inteiro: se exigisse, não seria um primeiro PR.

Não precisa pedir a issue pra ninguém, nem esperar resposta. **Comenta "peguei essa" e vai.**

Se você não sabe por onde começar:

- **A menor:** ISBN-10 vira ISBN-13. Uma função pura, num arquivo novo, com teste. Sem banco,
  sem tela. E ela conserta um buraco real: hoje todo livro publicado antes de 2007 passa reto
  pelo catálogo de quase 300 mil edições e vira duplicata.
- **A mais valiosa:** o importador do Goodreads. Sem perdas: datas, notas, texto de resenha,
  prateleiras, ISBN. É a razão de a maioria das pessoas nunca terminar de migrar de uma
  plataforma que já superou.
- **A lista inteira do trabalho aberto:** [docs/O-QUE-FALTA-NO-CODIGO.md](./docs/O-QUE-FALTA-NO-CODIGO.md),
  agrupada por uma tarde, um fim de semana, e grande.

**Quer trabalhar em algo que não é uma issue?** Abre uma discussão ou uma issue antes. Não é
burocracia: é que o [plano](./ai/PLAN.md) constrói em fatias verticais, numa ordem que existe
por um motivo, e um PR que pertence a uma fase distante fica parado sem merge. Isso desperdiça
a sua noite, e a gente não quer.

### 3. Trabalhe num ramo

```bash
git switch -c o-que-voce-esta-fazendo
# … commits …
git push -u origin o-que-voce-esta-fazendo
gh pr create --fill
```

**Ninguém commita direto no `main`, nem o mantenedor.**

### 4. O CI é quem aprova

**Zero aprovações humanas.** Se o CI ficar verde, entra.

Isso não é confiança cega, é o contrário: o mantenedor é publicitário, e não programador. Ele
não vai pegar um bug lendo o seu diff, e fingir que vai seria teatro. Então **o repositório foi
feito pra se defender sozinho**, e a revisão que importa é automática.

---

## Os testes são o revisor, e vale saber quem eles são

São mais de 800, e **os mais importantes não testam funções: eles varrem o próprio código.**

- Um quebra o build se uma tela sua falar como desenvolvedor (`schema`, `endpoint`, "Fase 4").
  **O Gume fala com leitores.**
- Um quebra se uma rota nascer pública sem ninguém ter decidido isso.
- Um quebra se um número de contribuição vazar pra fora da página de contribuidores.
- Um quebra se uma insígnia puder ser ganha por **ler**, ou se uma brilhar mais que as outras.
- E um *red team* ataca o próprio sistema, trocando UUIDs pra tentar ler e escrever nas linhas
  de outra pessoa.

**Se o seu PR quebrar um desses, leia a mensagem do teste: ela explica por que a regra existe.**
Não é obstáculo. É a decisão, escrita em código, no lugar onde ela não pode ser esquecida.

Três coisas que valem pra qualquer PR, e que são as únicas em que somos rígidos além da conta:

- **Se toca em quem-pode-ver-o-quê, tem teste provando que o usuário errado não consegue.**
  Ver [SECURITY.md](./SECURITY.md). A autorização mora em `lib/authz.ts`, e só ali.
- **Cópia voltada ao usuário: sentence case, sem em-dash, sem jargão de dev.** O Gume fala com
  leitores. Tem teste.
- **Diga se você usou um agente de IA.** Sem julgamento, a gente também usa. Isso só diz ao
  revisor onde olhar com mais atenção: as checagens de dono e os casos de borda.

---

## Você pode contribuir sem escrever uma linha de código

E esta é, hoje, a ajuda mais valiosa que existe.

O catálogo veio de um acervo aberto e chegou incompleto: **quase 266 mil edições sem capa**, milhares
sem ano e sem editora. Isso não se conserta sozinho, e não precisa de programador: precisa de
**quem tem o livro na mão**.

> **Desde outubro de 2026 não há instância hospedada**, então a correção que você faz fica no
> **seu** Gume: não existe mais um catálogo comum de pé para recebê-la. O caminho continua
> inteiro no código, para quem roda o seu, e para o dia em que um catálogo comum voltar a existir.

Rode o Gume, abra a página **o que falta**, e comece pelos livros que
estão **na sua própria estante**. Você é a única pessoa no mundo que pode arrumar aqueles agora,
porque basta virar o livro e olhar a lombada.

Toda correção fica gravada **com o seu nome**, na página do livro, para sempre. É por isso que
não é preciso pedir permissão para arrumar nada: a assinatura é a garantia. E o seu nome entra
na página de **contribuidores**, na mesma lista, com o mesmo tamanho, de quem escreve o código.

**Apontar um erro também conta.** Abriu uma issue e ela virou um conserto? Isso é a insígnia de
**caçador**, e ela existe justamente para honrar quem **viu** o problema, não quem o consertou.
Ver um erro e dizer onde ele está é trabalho, e é o mais barato de desprezar.

Nenhuma insígnia do Gume é sobre ler muito, e nenhuma tem nível ou pontuação: você é, ou não é.
Todas têm o mesmo peso visual, e isso é garantido por teste.

---

## Onde a ajuda é mais necessária

**Importadores.** Cada um é autocontido e imensamente valioso. A régua: **sem perdas**. A própria
exportação do Goodreads perde datas de leitura e notas quando outros apps a importam, e esse é o
maior motivo isolado de as pessoas nunca terminarem de migrar. Parseie tudo.

**Dados de livros.** Casamento (matching), deduplicação, capas, catálogos fora do inglês. É sem
glamour, é o fosso, e é o que decide se a primeira busca que um estranho faz funciona.

**i18n.** Português primeiro, primeira classe. Leitores brasileiros ficaram presos a um Skoob em
decadência por quinze anos e não têm para onde ir.

**Design.** A régua está no [docs/design.md](./docs/design.md) e é alta. Se você conseguir
superá-la, a gente prefere que supere.

---

## O que a gente não vai construir

PRs que adicionam **curtidas, contador de seguidores, ofensivas (streaks), feed algorítmico ou
IA generativa** vão ser fechados com agradecimento e sem debate.

Isso não é feature faltando, é recusa, e ela está no [README](./README.md) com o porquê de cada
uma. Ler não é competição, e um número do lado do seu nome transforma leitura em competição sem
você perceber.

Se algum desses pontos é um impedimento pra você, tudo bem, e existem bons apps que fazem a
escolha oposta.

---

## Governança, sem rodeios

Quem mantém o Gume tem a palavra final sobre as promessas de produto e o rumo. Todo o resto
é conversa.

O código é AGPL-3.0. Se esse arranjo não funciona pra você, **faça um fork**: a licença é
escrita pra que você possa, e pra que quem fizer um fork do seu mantenha os mesmos direitos que
você tinha. A saída é o ponto. É ela que torna as promessas reais, em vez de só bonitas.

Antes de abrir o primeiro PR, leia o [Código de Conduta](./CODE_OF_CONDUCT.md). É curto.
