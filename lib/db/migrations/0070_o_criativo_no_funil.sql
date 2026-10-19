-- ════════════════════════════════════════════════════════════════════
--  O CRIATIVO NO FUNIL. A migration 0069 montou o funil e resolveu "de que
--  REDE vêm os cadastros". Com anúncio pago no ar isso não basta mais: três
--  criativos diferentes rodando no mesmo lugar caem todos no balde
--  "instagram", e o relatório volta a ser o número inútil que a 0069 existe
--  para matar — agora um degrau acima.
--
--  A pergunta que faltava é "qual PEÇA traz quem vira gente", e ela não dá
--  para responder sem saber qual peça era.
--
--  ═══ POR QUE ESTAS DUAS COLUNAS PODEM EXISTIR, E `referrer` NÃO ═══
--
--  A 0069 recusa a URL crua de referrer com um motivo específico: ela mesma
--  pode identificar (um link mandado numa DM é um link só). Por isso só o
--  BALDE entra.
--
--  `utm_campaign` e `utm_content` são de outra natureza: são rótulos que NÓS
--  escrevemos, no nosso próprio gerenciador de anúncios, iguais para todo
--  mundo que clica naquela peça. "angulos-out2026" e "estante" não apontam
--  para ninguém — são o nome do cartaz, não quem passou na frente dele.
--
--  Ainda assim eles chegam pela URL, e URL é texto de fora. Então passam por
--  `normalizarRotulo()` (lib/funil.ts) antes de tocar o banco: minúsculas,
--  só `a-z 0-9 - _`, no máximo 40 caracteres, e qualquer outra coisa vira
--  nulo. Um `utm_content` forjado com um e-mail dentro não vira linha.
--
--  A tabela continua SEM coluna que aponte para uma pessoa, e continua fora
--  de lib/db/schema.ts. A lei da 0069 não afrouxou: ela ganhou uma dimensão
--  que é nossa, e não de quem visita.
-- ════════════════════════════════════════════════════════════════════

alter table eventos_funil add column if not exists campanha text;
alter table eventos_funil add column if not exists criativo text;

-- O relatório sempre pergunta "nesta campanha, qual criativo converteu", e
-- sempre dentro de uma janela de tempo. O índice cobre as três colunas na
-- ordem em que a consulta filtra.
create index if not exists eventos_funil_campanha_idx
  on eventos_funil (campanha, criativo, criado_em)
  where campanha is not null;
