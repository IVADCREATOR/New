# SORASAKI — Manutenção 2026-09-09

## Alterações desta versão
- Corrigida a interpretação de valores JSONB no endpoint de estado do site, evitando que `maintenance_mode=false` seja tratado como verdadeiro.
- Reforçada a proteção do preview de grupos contra SSRF em URLs de imagens e redirecionamentos para hosts privados.
- Adicionado limite básico de tentativas no início de pagamentos.
- Padronizada a estrutura de avaliações para suportar moderação (`pending`, `visible`, `hidden`) e metadados opcionais.
- Painel administrativo ganhou moderação de avaliações de grupos.
- Corrigido o botão de atualização da tela de estatísticas.
- Produtos agora preservam/permitem alterar o estado ativo/inativo pelo painel.
- Salvamento das configurações administrativas agora detecta falha parcial antes de informar sucesso.
- Auditoria administrativa ficou mais tolerante a registros sem `admin_id`.
- Adicionados headers de segurança no Vercel.
- Atualizado o cache-busting do `app.js` para esta manutenção.

## Validação local
- Sintaxe de todos os arquivos JavaScript verificada com `node --check`.
- Scripts inline de todas as páginas HTML verificados com `node --check`.
- Estrutura do ZIP preserva os arquivos do projeto na raiz, sem pasta interna desnecessária.

## Limitações
Os fluxos que dependem do Supabase, autenticação real, Storage, Mercado Pago e variáveis de ambiente não podem ser considerados teste de produção dentro deste ambiente. Depois do deploy, é necessário validar esses fluxos com a configuração real.

As variáveis sensíveis continuam fora do código: `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`.
