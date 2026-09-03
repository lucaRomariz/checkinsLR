# Check-ins — Rede social de rotina e produtividade

Rede social privada de check-ins de rotina/produtividade (feed cronológico, categorias,
ranking por consistência, perfil, configurações administrativas). Sem XP, sem níveis.

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind · Supabase (Postgres, Auth, Storage, RLS)

## Backend (já provisionado)
Um projeto Supabase (`checkins-app`, região `sa-east-1`) já foi criado e configurado com:
- Tabelas: `profiles`, `categories`, `checkins`, `checkin_likes`, `checkin_comments`, `system_settings`
- RLS em todas as tabelas
- Trigger `on_auth_user_created`: cria o `profile` automaticamente no cadastro. Os usernames
  `luca.romariz` e `roberta.araujo` são promovidos a `ADMIN` automaticamente.
- RPC `create_checkin`: valida limite diário de postagens, limite por categoria e decide
  server-side (com lock transacional) se aquele check-in conta para o ranking
  (`counts_for_ranking`). Nunca confie nessa lógica no frontend.
- RPC `get_ranking`, `get_streak`, `get_category_stats`: leitura agregada para ranking/perfil.
- Bucket de Storage `checkin-images` (público para leitura, upload autenticado).
- 7 categorias iniciais e as configurações padrão (`daily_post_limit=2`,
  `daily_ranking_limit=1`, etc.) já semeadas em `system_settings`.

As chaves do projeto já estão em `.env.local`.

## Rodando localmente
```bash
npm install
npm run dev
```
Abra http://localhost:3000 — a primeira tela é o cadastro/login. Ao criar uma conta com
username `luca.romariz` ou `roberta.araujo`, o usuário já nasce ADMIN e ganha acesso à
aba **Configurações**.

## Deploy na Vercel
1. Suba este repositório no GitHub.
2. Importe o repo na Vercel.
3. Configure as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valores em `.env.local`) no painel do projeto.
4. Deploy.

## Regra central: Feed ≠ Ranking
Todo check-in aparece no feed. Mas apenas o primeiro check-in "válido" do dia (respeitando o
limite configurado em Configurações) conta para o ranking — isso é decidido e gravado
(`counts_for_ranking`) inteiramente dentro da função `create_checkin` no Postgres, então não
pode ser manipulado pelo cliente.

## Próximos passos sugeridos
- Comentários: já existe a tabela/policies; falta a UI de listagem/criação (a página de
  check-in individual não foi implementada — hoje comentários só têm contagem no feed).
- Edição/exclusão de check-ins pelo próprio autor ou admin (policies já permitem).
- Notificações e paginação infinita no feed (hoje limitado a 50 itens mais recentes).
