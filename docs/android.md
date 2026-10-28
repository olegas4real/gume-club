# O Gume na Play Store (Android)

> **Parado (outubro de 2026).** O app Android é o site embrulhado, e o site saiu do ar. Sem
> instância hospedada não existe o que embrulhar, e nada daqui vai acontecer. O que o repo já
> garante (manifesto, ícones, assetlinks por variável de ambiente) continua de pé para quem
> subir a própria instância, e este roteiro fica para esse dia.

O app Android do Gume é o próprio site, embrulhado num TWA (Trusted Web Activity) com o
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). Não existe uma segunda base
de código: cada deploy do site atualiza o app sozinho. Este documento é o roteiro do que
roda **fora** do repo, na máquina e nas contas do dono. Nada daqui entra no controle de
versão (ver o bloco Android do `.gitignore`): o keystore é segredo, e os `.aab`/`.apk`
são artefatos de build.

O que o repo já garante (não refaça à mão):

- `app/manifest.ts`: identidade (`id`, `scope`), ícones com o maskable de 512.
- `app/.well-known/assetlinks.json/route.ts`: o vínculo site ↔ app, ligado pelas duas
  variáveis de ambiente (ver `.env.example`, bloco "O APP ANDROID").
- `/privacidade` e o apagar conta em `/perfil`: exigências da Play que já existem.
- O apoio via Stripe some dentro do app (fatia própria, a 2 da seção Play Store do
  ai/PLAN.md; a decisão está no ai/DECISIONS.md). A Play exige o billing do Google para benefício digital,
  e a moldura/etiqueta de apoiador conta como benefício.

## 1. Empacotar

```sh
npm i -g @bubblewrap/cli
mkdir ~/gume-android && cd ~/gume-android     # FORA do repo
bubblewrap init --manifest https://gume.club/manifest.webmanifest
```

Respostas que importam no questionário:

- **Package ID:** `club.gume.app` (sugestão). **É permanente depois de publicado**:
  confira antes de subir a primeira vez.
- **Start URL:** `/?origem=android` (e não `/`). É esse parâmetro que marca "estou
  dentro do app" e esconde o apoio. O manifesto web continua com `start_url: "/"`.
- **Orientação:** `default` (o site é responsivo; tablet deitado é legítimo).
- **Cores:** `#17151d` para tema e splash.
- **Ícones:** o init puxa do manifesto; o maskable já está lá.
- **Signing key:** deixe o Bubblewrap criar. O keystore e as senhas vão para o
  gerenciador de senhas, e NUNCA para o repo. Perder o keystore de upload tem conserto
  (a Play troca); vazar não tem.

Depois: `bubblewrap build` gera o `.aab` (para a loja) e um `.apk` assinado (para
instalar direto num aparelho e testar).

## 2. Play Console

1. Conta de desenvolvedor: US$ 25, uma vez (play.google.com/console).
2. Conta pessoal nova tem um pedágio: **teste fechado com pelo menos 12 testadores por
   14 dias** antes de poder publicar. O Discord do Gume serve para recrutar. Planeje
   isso no calendário do lançamento.
3. Ao criar o app, aceite o **Play App Signing** (a Play passa a assinar a versão da
   loja com uma chave dela).

## 3. Ligar o vínculo (o passo que tira a barra de endereço)

1. No Play Console: Configurações do app → Assinatura de apps → copie o **SHA-256 do
   certificado da chave de assinatura do app** (e, se quiser que o apk de teste também
   abra sem barra, o da chave de upload).
2. No Railway (serviço gume-club), configure:
   - `ANDROID_PACKAGE_NAME` = o package ID escolhido;
   - `ANDROID_CERT_SHA256` = os fingerprints, separados por vírgula.
3. Confira, depois do deploy:

   ```sh
   curl -sI https://gume.club/.well-known/assetlinks.json
   ```

   Tem que ser **200 direto**, sem `location:` no meio: o verificador do Android não
   segue redirect. O corpo deve listar o pacote e os fingerprints.

Se o app abrir **com** a barra de endereço em cima, é este passo que falhou: fingerprint
errado (o da upload key em vez do da App signing key é o erro clássico) ou a URL
respondendo redirect.

## 4. A ficha da loja

- **Ícone 512** e **feature graphic 1024×500**: derive de
  `public/logo/icone-grafite-1024.png` sobre o fundo `#17151d`.
- **Capturas de tela:** pelo menos duas de telefone (a home logada e uma ficha de livro
  ficam bem).
- **Política de privacidade:** `https://gume.club/privacidade`.
- **Exclusão de conta** (exigência da Play): o app tem o botão em `/perfil`, e
  `https://gume.club/privacidade` serve como a URL pública do pedido (ela documenta o
  caminho por e-mail para quem não consegue entrar).
- **Data Safety:** declare o que `/privacidade` já declara (nome, e-mail, livros da
  estante; medição se estiver ligada). Pagamento NÃO: dentro do app não há compra.
- **Pagamentos:** declare que o app não vende nada. O apoio existe só no site, fora do
  app, sem link a partir dele.

## 5. Quando a arte da marca mudar

`pnpm brand` regenera todos os ícones, inclusive o maskable. O app na loja só troca de
ícone num **novo build** do Bubblewrap (`bubblewrap update && bubblewrap build`), porque
o ícone do launcher é empacotado no apk, não lido do site.

## Risco conhecido e aceito

Um link de gume.club aberto pelo app (deep link) **antes do primeiro launch pelo ícone**
ainda não tem o cookie `gume_app`, e mostraria o apoio. O revisor da Play testa pelo
launcher, que passa pelo start URL e grava o cookie na primeira navegação. Conviver com
isso é mais honesto do que fingir que um cookie resolve tudo.
