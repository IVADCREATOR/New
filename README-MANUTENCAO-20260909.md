# Sorasaki — manutenção 2026-09-09

## Importante antes do deploy

O código desta versão adiciona estatísticas reais de visitantes e um catálogo público de produtos. Para essas duas partes funcionarem no Supabase existente, execute **uma vez** o arquivo `sql-manutencao-20260909.sql` no SQL Editor do projeto.

Esse SQL cria/garante:
- `site_visits` para visitantes e visualizações;
- funções `record_site_visit` e `get_site_analytics`;
- políticas de segurança do registro de visitas;
- estrutura/políticas de `products` caso a instalação ainda não tenha a tabela;
- correção de valores legados de `maintenance_mode` como `"false"`.

O site não armazena IP para as estatísticas de visitantes. O identificador é aleatório e fica no navegador do visitante.

Depois do SQL, publique o projeto no Vercel normalmente e teste:
1. abrir `/` em uma janela normal;
2. abrir `/estatisticas`;
3. entrar no painel administrativo e abrir `Estatísticas`;
4. cadastrar/editar um produto e conferir o catálogo público;
5. ativar o modo de manutenção e abrir o site em uma janela anônima;
6. confirmar que `/controle-8f4c2e91` continua acessível para o administrador.
