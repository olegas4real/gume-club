/**
 * ════════════════════════════════════════════════════════════════════
 *  O VÍNCULO ENTRE O SITE E O APP ANDROID (Digital Asset Links).
 *
 *  O app da Play Store é o próprio site, embrulhado (TWA, ver docs/android.md). Para o
 *  Android abrir o site em tela cheia, sem barra de endereço, ele confere este arquivo:
 *  "o dono de gume.club confia no app de pacote X, assinado com a chave Y". Sem ele, o
 *  app abre com a barra do navegador em cima, parecendo um atalho pobre.
 *
 *  ═══ POR QUE UMA ROTA COM VARIÁVEL, E NUNCA UM ARQUIVO EM public/ ═══
 *
 *  O pacote e o fingerprint da chave são dados DA INSTÂNCIA, não do código: um arquivo
 *  estático commitado publicaria o vínculo do gume.club para toda instância
 *  auto-hospedada, que não tem app nenhum. É a mesma regra do Stripe (lib/stripe.ts):
 *  sem as variáveis, a rota não existe (404), e o app inteiro roda igual.
 *
 *  O fingerprint NÃO é segredo (este arquivo é servido publicamente por desenho), mas o
 *  certo é o da chave do Play App Signing, tirado do Play Console. Ver .env.example.
 *
 *  ═══ DUAS ARMADILHAS QUE ESTE ARQUIVO EVITA ═══
 *
 *  1. O verificador do Android NÃO SEGUE REDIRECT: a resposta tem que ser 200, direta.
 *     O middleware deixa /.well-known/* passar (só acrescenta cabeçalhos, inofensivo).
 *  2. O JSON é um ARRAY na raiz, e o campo é "sha256_cert_fingerprints", no plural.
 * ════════════════════════════════════════════════════════════════════
 */

export function GET(): Response {
  const pacote = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  // Instância sem app Android: o arquivo não existe, e nada mais muda.
  if (!pacote || fingerprints.length === 0) {
    return new Response("não encontrado", { status: 404 });
  }

  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: pacote,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
