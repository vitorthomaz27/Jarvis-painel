# Painel Jarvis

Painel de contatos para os clientes da Jarvis Tecnologia. O site do cliente manda cada formulário preenchido para o painel e conta os cliques no WhatsApp. O dono do negócio acompanha tudo num funil simples: novo, conversando, agendou, cliente, perdido.

Este é o primeiro módulo do Painel Jarvis. Os próximos (relatório mensal, avaliações no Google, cobrança com Pix Automático) entram no mesmo sistema.

## O que já faz

- **Captura pelo site:** um script de uma linha transforma formulários em contatos e conta os cliques em links de WhatsApp, com UTM e página de origem.
- **Funil:** contatos por etapa, histórico de notas, mudança de etapa registrada, botão "Chamar no WhatsApp" com mensagem pronta.
- **Sem resposta:** contato novo esperando há mais de 2 horas aparece em destaque.
- **Lembrete de retorno:** data para retomar a conversa; aparece em "Retornar hoje".
- **Reativar clientes:** clientes sem contato há mais de 60 dias, com mensagem pronta.
- **Contato repetido:** mesmo telefone ou e-mail vira nota no contato que já existe, sem duplicar.
- **Várias empresas:** cada negócio só vê os próprios dados. A equipe tem dois papéis: responsável (configura) e equipe (atende).
- **Área da Jarvis:** cadastro de clientes já com o responsável e lista de todos os negócios.
- **Proteções:** sessão em cookie httpOnly, limite de envios por minuto, campo armadilha contra robôs, lista de sites autorizados por chave e troca de chave.

As regras (2 horas, 60 dias, 30 dias) ficam em `apps/api/src/common/rules.ts`.

## Estrutura

```
apps/
  api/   NestJS 11 + Prisma 6 + PostgreSQL (porta 3333)
  web/   Next.js 15 + TanStack Query + Zustand (porta 3000)
```

O painel chama a API pelo próprio domínio (`/api/*`, repassado pelo Next), então o cookie de sessão é de primeira parte. As rotas públicas (`/public/*`) aceitam chamadas de qualquer site e usam `text/plain` para evitar preflight de CORS.

O Prisma usa `engineType = "client"` com o adaptador `@prisma/adapter-pg`, sem o binário Rust do query engine.

## Rodar no seu computador

Requisitos: Node 22, pnpm 10 e Docker (ou um PostgreSQL 16 instalado).

```bash
pnpm install
docker compose up -d                       # Postgres com os bancos painel e painel_test

cp apps/api/.env.example apps/api/.env      # ajuste DATABASE_URL e JWT_SECRET se precisar
cp apps/web/.env.example apps/web/.env.local

pnpm --filter api prisma:deploy             # cria as tabelas
pnpm db:seed                                # cria seu acesso e um negócio de exemplo

pnpm dev                                    # API em :3333 e painel em :3000
```

Sem `SEED_ADMIN_PASSWORD` no `.env`, o seed gera uma senha e mostra no terminal. Troque em **Minha conta** no primeiro acesso.

Para definir ou recuperar a senha a qualquer momento (com a API parada ou rodando):

```bash
pnpm --filter api admin:password jarvistecnologia01@gmail.com 'SuaSenhaForte123'
```

## Testes

```bash
pnpm test
```

São 24 testes de ponta a ponta contra um Postgres real (`DATABASE_URL_TEST`, que é apagado a cada rodada). Cobrem login, isolamento entre negócios, captura pública, funil, listas de sem resposta, retorno e reativação, visão geral e área de administração.

## Instalar no site de um cliente

1. Em **Clientes Jarvis → Novo cliente**, cadastre o negócio e o responsável.
2. Abra **Instalação no site** e copie o script:

```html
<script src="https://SUA-API/public/embed.js" data-key="pj_..." defer></script>
```

3. Marque o formulário com `data-jarvis-form` (campos `nome`, `telefone` ou `whatsapp`, `email`, `tipo`, `mensagem`). Se o site já tiver código próprio de envio, chame `window.JarvisPainel.lead({...})`.
4. Para saber de qual botão veio cada clique no WhatsApp, use `data-jarvis-location="topo"` no link. O site da Jarvis já usa `data-ga-location`, que também é lido.

No site da Jarvis, o formulário de contato usa `f-nome`, `f-contato` e `f-negocio`, e a API já entende esses nomes. Basta chamar `window.JarvisPainel.lead(...)` junto do envio atual.

## Colocar no ar (Vercel + Neon)

São dois projetos na Vercel apontando para este mesmo repositório e um banco Postgres no Neon.

**1. API**: Add New → Project → este repositório.
- Root Directory: `apps/api` (o resto vem do `apps/api/vercel.json`)
- Storage → Neon (Postgres): cria o banco e preenche `DATABASE_URL` e `DATABASE_URL_UNPOOLED`
- Environment Variables: `JWT_SECRET` (frase longa e aleatória) e `PUBLIC_API_URL` (o endereço desta API, por exemplo `https://api.jarvistecnologia.com`)
- Cada deploy roda `prisma migrate deploy` antes do build. A API inteira roda numa função (`api/index.js` → `dist/serverless.js`).

**2. Painel**: Add New → Project → o mesmo repositório.
- Root Directory: `apps/web` (Next.js é detectado sozinho)
- Environment Variables: `API_URL` e `NEXT_PUBLIC_API_PUBLIC_URL`, os dois com o endereço da API

**3. Primeiro acesso**: do seu computador, apontando para o banco do Neon:

```bash
DATABASE_URL="<DATABASE_URL_UNPOOLED do Neon>" pnpm --filter api admin:password voce@email.com 'SenhaForte123'
```

**4. Domínios (opcional)**: em cada projeto, Settings → Domains (`painel.` e `api.jarvistecnologia.com`). No DNS da Hostinger, crie os CNAME que a Vercel mostrar.

Observações:
- O cliente Prisma é gerado em `apps/api/prisma/generated` (não versionado) para entrar no pacote da função.
- O limite de tentativas de login fica na memória de cada instância da função, então numa função serverless é só uma proteção básica.

## Próximos passos

- Relatório mensal automático por WhatsApp (GA4 + Perfil da Empresa no Google)
- Pedido de avaliação no Google depois do atendimento
- Cobrança de mensalidade com Pix Automático (via gateway)
- Integração oficial com o WhatsApp Business (API da Meta) para ler conversas
