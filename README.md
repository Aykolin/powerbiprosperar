# Indicadores comerciais · Prosperar Imóveis

Aplicação independente e estática, sem login, Supabase ou conexão com o portal. Os dados ficam no navegador usado para cadastrar as informações. Começa vazia, sem importar os dados do portal.

## Como abrir

Abra o arquivo `index.html` em um navegador atualizado. Se o navegador restringir o armazenamento de arquivos locais, abra o terminal nesta pasta e execute `python -m http.server 8080`, depois acesse `http://localhost:8080`. Não há instalação de pacotes ou servidor de dados; esse comando serve somente os arquivos locais.

## Backup e privacidade

Use **Exportar backup** regularmente e guarde o arquivo em local seguro. **Importar backup** restaura uma cópia e substitui todos os registros deste navegador, após confirmação. Limpar dados do navegador, trocar de computador ou usar outro navegador pode deixar os registros indisponíveis. Sem login, qualquer pessoa que tenha acesso ao perfil do navegador pode ler e alterar os dados. Cada navegador tem seus próprios registros; não há sincronização automática.

## Indicadores

- Captações, valor bruto captado (VGV), com e sem exclusividade, e origem da captação.
- Carteira atual por tipo, descontando vendas vinculadas.
- Leads por canal, visitas, propostas e vendas do mês.
- Negociações em andamento na data de referência do mês.

Cadastre e edite imóveis e atividades em **Novo registro**. O painel é calculado automaticamente. No histórico de registros, imóveis aparecem em todos os meses; atividades seguem o mês selecionado. Ao excluir um imóvel, os registros das atividades são mantidos sem o vínculo.

## Para subir ao seu próprio Git

Na pasta deste projeto, após criar um repositório vazio no GitHub:

```
git init
git add .
git commit -m "feat: cria painel independente de indicadores"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Não coloque seus backups JSON no repositório, pois podem conter informações comerciais. O arquivo `.gitignore` já ignora backups com o nome gerado pela aplicação.
