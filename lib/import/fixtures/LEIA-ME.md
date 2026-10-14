# Fixtures de importação

Arquivos de teste, com livros e autores **fictícios**. Nenhum dado de pessoa real.

- `goodreads.csv`, `storygraph.csv`: o formato dos exports oficiais.
- `skoob-downloader.csv`: o formato que o `vinyluis/skoob_downloader` escreve, copiado do
  código dele (`converters.py`, fevereiro de 2026): colunas do Goodreads sem `Book Id`,
  ISBN no formato `="..."`, abandonado como `to-read` + `abandoned`, relendo como
  `currently-reading` + `rereading`.
- `skoob-extensao.csv`: HIPOTÉTICO. O que uma extensão que lê a estante do Skoob na
  tela produziria: cabeçalho em português, separado por ponto e vírgula (Excel em
  português), estantes do Skoob, nota com vírgula, data dd/mm/aaaa, sem ISBN.

- `openreads.csv`: o formato documentado em `doc/csv.md` do Openreads: status em inglês,
  leituras com começo e fim, etiquetas separadas por `|||||`, e a lixeira junto (`deleted`).
- `bookwyrm.csv`: as colunas que `views/preferences/export.py` do BookWyrm escreve: uma
  estante por livro (`shelf` e `shelf_name`), datas de começar, terminar e parar.

O Skoob não tem exportação oficial. Ver lib/import/skoob.test.ts, lib/import/openreads-bookwyrm.test.ts e ai/DECISIONS.md.
