# órbita

Vitrine interna das automações do núcleo fiscal da **Hinove Fertilizantes Especiais**.

🔗 **[merolupe.github.io/orbita](https://merolupe.github.io/orbita/)**

Uma página só, sem dependências externas — nada de CDN, fontes remotas ou imagens.
Abre offline com duplo clique.

## O que tem

Uma nave montada a partir da marca Hinove decola e abre um sistema solar contido,
onde cada planeta é uma rotina fiscal automatizada. Clicar num planeta estica as
estrelas do fundo, aproxima o planeta e roda uma varredura que marca o que aquele
sistema confere.

A seção final mostra o horizonte de um planeta, com um astronauta preso por uma
corda à escotilha. Ali dá para **selecionar os sistemas** e ver a barra
*"no que é gasto o tempo de um analista?"* mudar de proporção — quanto mais
automação, menos trabalho repetitivo e mais tempo de análise.

### As seis rotinas

| Sistema | O que faz |
|---|---|
| **XMLBot** | Valida tags de XML antes da escrituração |
| **AutoReinf** | Envia eventos de serviços tomados à Receita Federal |
| **GerarPendentes** | Relatório de documentos pendentes — falhas de processo, escrituração e pagamento |
| **FiscalBot** | Auditoria de inconsistências e conformidade tributária |
| **FaturaBot** | Quatro relatórios de expedição automatizados |
| **CT-e Auto v2** | Classificação tributária de fretes tomados *(em construção)* |

## Detalhes

- Tema claro e escuro — o painel do sistema solar fica sempre escuro, por escolha de design
- Respeita `prefers-reduced-motion`: as órbitas param e os contadores vão direto ao valor final
- Responsiva de 375px a desktop

> Os números da página são **ilustrativos**, para demonstração do formato.

## Rodando local

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Serve em `http://localhost:8123`. Ou simplesmente abra o `index.html` no navegador.

## Showreel

[`showreel/`](showreel/) — 15 segundos de motion design com a órbita como assunto, renderizados
quadro a quadro a partir de um único `reel.html`, com trilha sintetizada no tempo dos cortes.

## Versões

- `index.html` — versão atual
- `v3.html`, `v2.html`, `v1.html` — iterações anteriores, mantidas para comparação
