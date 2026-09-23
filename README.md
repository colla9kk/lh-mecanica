# LH Mecânica Automotiva

Site institucional e painel interno para clientes, veículos, histórico por placa e ordens de serviço.

## Incluído

- Landing page responsiva e triagem pelo WhatsApp.
- Login administrativo.
- Clientes e veículos, com placa única.
- Consulta do histórico pela placa.
- Várias ordens para o mesmo veículo.
- Peças, serviços, mão de obra, desconto e totais.
- Reabertura de OS concluída e bloqueio depois da entrega.
- PDF profissional, resumo pelo WhatsApp e backup JSON.
- Banco protegido por RLS.

## Custos

O projeto foi planejado para usar os planos gratuitos do Cloudflare e do Supabase. O único custo previsto é o domínio. Os limites e regras dos planos gratuitos podem mudar; confira-os antes da publicação. Não ative atualização automática para plano pago.

## 1. Requisitos

- Node.js 22 ou superior.
- Contas gratuitas no Supabase e Cloudflare.
- Um domínio próprio.

## 2. Dados da oficina

Edite `lib/config.ts` e troque nome, telefone, WhatsApp, endereço, horário e e-mail.

## 3. Banco gratuito

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Execute todo o conteúdo de `supabase/schema.sql`.
4. Em **Authentication > Providers > Email**, desative o cadastro público.
5. Em **Authentication > Users**, crie manualmente o usuário da oficina.
6. Em **Project Settings > API**, copie a URL e a chave pública `anon`.

### Atualizar um banco já existente (correção das exclusões)

No **SQL Editor** do Supabase, execute o conteúdo de
`supabase/migrations/20260923_fix_deletions.sql` e aguarde **Success**.
Depois publique a versão atualizada do site. Publicar o site sozinho não aplica
a atualização do banco. Esse SQL não apaga dados e pode ser executado novamente.

- **OS:** pode ser excluída após confirmação, inclusive quando entregue.
  Os itens da OS também são apagados; cliente e veículo permanecem.
- **Veículo:** pode ser excluído quando não possui OS vinculadas.
  Não é necessário excluir o cliente.
- **Cliente:** exclui o cliente e seus veículos sem histórico numa única
  transação. Se houver uma OS ligada ao cliente ou aos veículos dele,
  exclua as ordens primeiro. Uma falha desfaz toda a operação.
- Ordens entregues continuam bloqueadas para edição.
- A mensagem de sucesso só aparece quando o banco confirma a exclusão.
  Os erros de exclusão de OS aparecem dentro da própria janela.

## 4. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON
```

A chave `anon` é pública por definição. A proteção real está nas políticas RLS e no login. Nunca coloque a chave `service_role` no projeto.

## 5. Executar

```bash
pnpm install
pnpm dev
```

A página pública fica em `/` e o painel em `/admin/login`.

## 6. Testar

```bash
pnpm build
```

Confira login, clientes, veículos, placa duplicada, nova OS, pesquisa por placa, nova OS para o mesmo carro, PDF, reabertura, bloqueio após entrega e backup.

## 7. Publicar gratuitamente

O projeto gera uma aplicação compatível com Cloudflare Workers.

1. Cadastre as variáveis públicas do Supabase no projeto Cloudflare.
2. Execute o build e publique.
3. Vincule o domínio personalizado.
4. Confirme o HTTPS.

```bash
pnpm build
npx wrangler deploy --config dist/server/wrangler.json
```

## 8. Backup

No painel, abra **Backup** e baixe o JSON pelo menos uma vez por semana. Guarde cópias em dois locais. Os PDFs são gerados no navegador e não ocupam armazenamento.

## Segurança e privacidade

- Use senha forte e não compartilhe o login.
- Colete somente dados necessários.
- Não publique informações de clientes.
- Proteja os backups.
- Revise a política de privacidade da oficina.


<!-- deploy-trigger: 2026-09-23-185x -->
