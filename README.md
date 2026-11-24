
# Painel de Projetos GEREB

Dashboard React/Vite. A entrada é `src/main.jsx`; `src/App.jsx` mantém os
filtros e calcula o recorte compartilhado pelos indicadores, gráficos e tabela.
`src/data/projectCsv.js` importa o CSV raiz e normaliza os registros. Edições
locais, quando existentes, são carregadas do localStorage e também normalizadas.
`src/data/projects.js` é uma base legada e não alimenta o painel atual.

## Revisão: carteira e filtros

Branch: `fix/carteira-projetos-gereb`.

- Filtros permanentemente visíveis, sem estado, botões ou estilos de recolhimento.
- Título único: **Carteira de Projetos da GEREB**.
- Campos e botões Aplicar/Limpar preservados. Os filtros continuam atualizando o
  painel imediatamente; Aplicar submete o formulário sem navegar ou recolhê-lo.
- Normalização compartilhada de instrumentos no carregamento do CSV, das edições
  e dos dados salvos: espaços, caracteres invisíveis, caixa, acentos dos tipos
  conhecidos, `EMENDAS` e `AEP`. Categorias novas continuam aceitas e as opções
  continuam sendo geradas a partir dos registros, sem lista de exclusão.
- Cálculos financeiros e componentes de gráficos, tabela e exportação preservados.

### Inconsistência da base

O CSV local de 20/10/2026 contém 189 projetos e **nenhum registro com tipo
ACORDO DE EXECUÇÃO DE PROJETOS ou AEP**. Há 12 identificadores contendo `-AEP-`,
todos explicitamente classificados como `EMENDA PARLAMENTAR` na coluna
`tipo_instrumento_contratual`. A ausência da opção decorre desse conteúdo da base,
e não de uma lista fixa no seletor ou de dependência dos demais filtros.

Não se deduz o tipo pelo identificador: é necessário confirmar e corrigir a
classificação na origem. Quando houver registros classificados como AEP ou pelo
nome completo, a opção aparecerá automaticamente e filtrará os registros reais.
Nenhum registro ou valor financeiro foi criado ou alterado nesta revisão.

SHA-256 do CSV preservado:
`5F72F16DB32ABE65FBA7C92DE72B071D12BD54710C3987E5CD53125BCE5301E3`.

### Validação

```powershell
npm run lint
npm test
npm run build
python -m http.server 5183 --bind 127.0.0.1
# Em outro terminal, com Playwright e Edge disponíveis:
node scripts/browser-test.mjs
```

O teste do navegador aceita `PLAYWRIGHT_MODULE` (caminho de uma instalação
existente), `BROWSER_CHANNEL` e `BASE_URL`. O endereço padrão é
`http://127.0.0.1:5183/docs/`.

Validados: carregamento da produção em subdiretório, título, ausência de controles
de recolhimento, todas as categorias reais, combinação de filtros, recorte vazio,
Aplicar/Limpar, oito indicadores, totais financeiros, gráficos, tabela e conteúdo
do XLSX filtrado. AEP foi validado com fixtures isoladas no navegador, sem modificar
o CSV. Resoluções: 320, 390, 768, 1024 e 1440 px, sem cortes nos controles,
rolagem horizontal da página ou erros de console. Capturas em `tmp/filtros-*.png`.

Lint, smoke test, teste do navegador e build passaram na branch baseada em origin/main.

### Publicação e escopo

O build gera `dist/` e sincroniza `docs/` e `index.html` pelo script existente,
preservando os caminhos relativos e a configuração do GitHub Pages. Artefatos
regenerados estão preparados para revisão; nenhuma publicação foi executada.

Arquivos desta revisão: `src/App.jsx`, `src/data/projectCsv.js`,
`src/styles/dashboard.css`, `src/styles/layout-preview.css`, `scripts/smoke-test.mjs`, `scripts/browser-test.mjs`,
este README e os artefatos gerados em `docs/` e `index.html`.
A branch de envio parte de origin/main e preserva os componentes, estilos e a base ja presentes no GitHub.
