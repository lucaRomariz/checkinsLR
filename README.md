# Check-ins — Planejar, realizar e acompanhar

Aplicativo de rotina com foco no celular: agenda pessoal diária/semanal, check-ins vinculados ao planejamento, feed, comentários, curtidas, ranking e configurações administrativas.

## Rodar

```sh
npm ci
npm run dev
```

Configure `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nunca coloque uma chave secreta ou `service_role` em variável pública. Acesse [a aplicação local](http://localhost:3000).

## Fluxo principal

1. Abra Hoje ou Agenda e toque em **Planejar**.
2. Escolha atividade, categoria, data e horários previstos.
3. Toque em **Fazer check-in**, confirme o que realizou e adicione uma foto opcional.
4. A atividade passa a concluída e o feed identifica o registro como **Do planejamento**.

Atividades concluídas preservam seu planejamento; excluir o check-in pela interface reabre a atividade. A agenda é privada por usuário. Check-ins são compartilhados entre as contas autenticadas do aplicativo. A repetição automática de rotinas não está incluída nesta versão.

## Banco

Supabase com Postgres, Auth, Storage e RLS. O histórico completo está em `supabase/migrations`. A migração `20260914200339_agenda_security` já foi aplicada ao projeto existente.

- `planning_items`: ocorrências privadas, com data, horários previstos e cancelamento.
- `record_checkin`: criação transacional, idempotente e vinculada à atividade; impede conclusão duplicada.
- `save_plan`: cria/edita/reagenda/cancela ocorrências próprias ainda não concluídas.
- `delete_checkin`: exclusão autorizada e reabertura da atividade.
- `get_feed`: paginação de 20 registros com cursor e contagens agregadas.
- `get_ranking`, `get_streak`, `get_category_stats`, `get_couple_streak`: leituras autenticadas.
- `checkin-images`: bucket privado, JPEG/PNG/WebP, até 5 MB. As fotos são reduzidas no navegador e exibidas por links temporários.

Novos cadastros sempre recebem papel USER. Os administradores já existentes foram preservados. A concessão de ADMIN exige operação confiável no banco; o nome de usuário não concede privilégios.

O dia de referência usa `America/Sao_Paulo`. Limite de registros avulsos e pontuação do ranking são independentes da conclusão de planejamentos. O servidor aplica limite adicional de segurança de 100 registros diários por pessoa.

## Verificar

```sh
npm test
npm run typecheck
npm run build
```

Os testes SQL em `tests/database.sql` e `tests/database-rules.sql` devem ser executados inteiros: possuem `BEGIN`/`ROLLBACK` e desfazem as próprias fixtures. Para teste de concorrência pela API, `tests/integration.cjs` requer uma conta descartável explícita e cria dados nela; consulte os comentários do arquivo antes de executar.

## Publicar

Vercel, preset **Next.js**, variáveis públicas do mesmo projeto Supabase e build `npm run build`. `vercel.json` define São Paulo para as funções. Não é exportação estática e não precisa reaplicar a migração já executada.

Consulte [entrega e publicação](docs/ENTREGA.md) para configuração, validação, limitações e estado da entrega. O [diagnóstico](docs/analise-e-plano-de-evolucao.md) registra a análise anterior às correções.

## Aparência, fotos e avisos

- Seletor de aparência na navegação: claro, escuro ou tema do aparelho, salvo neste navegador.
- Animações de entrada e interação respeitam a preferência de movimento reduzido.
- Check-ins aceitam foto da galeria ou câmera compatível, com prévia e remoção antes do envio.
- Em Avisos, ative notificações por aparelho. O botão de teste verifica a apresentação local, não o trajeto pelo servidor.
- O envio remoto depende da migração `20260915130802_web_push.sql`, da Edge Function `web-push` publicada e dos segredos no Vault: `web_push_public_key`, `web_push_private_key`, `web_push_subject`, `web_push_function_url` e `web_push_worker_secret`. Não exponha as chaves privadas no frontend.
- Para validar a entrega completa, ative em uma conta e publique um check-in com outra. No iPhone, abra o app instalado na tela inicial.

O backend de push foi ativado no Supabase em 15/09/2026. A entrega em aparelho físico ainda precisa ser validada.

## Lembretes da agenda

Com as notificações do aparelho ativadas, atividades com horário de início geram um lembrete privado para seu proprietário. A verificação roda a cada minuto, no fuso `America/Sao_Paulo`. Não há aviso para atividades sem horário, canceladas ou concluídas. Reagendamentos invalidam os envios pendentes do horário anterior. Um aviso já entregue não pode ser recolhido do aparelho.

Os lembretes são válidos até 15 minutos após o início; o TTL enviado ao provedor respeita o tempo restante. Há deduplicação por atividade, aparelho e horário. O aviso usa texto genérico para não expor o título privado na tela bloqueada e abre `/agenda?date=AAAA-MM-DD`.

### Ativar no ambiente publicado

1. No projeto existente, as migrações de push já foram aplicadas; não reaplicá-las. Em outro ambiente, seguir a ordem do histórico.
2. Publicar a versão atualizada de `supabase/functions/web-push/index.ts`, mantendo a autenticação pelo segredo do worker e os segredos de Vault documentados acima.
3. Publicar o frontend e o service worker atualizados. Abrir Avisos no aparelho para registrar/atualizar o worker e ativar notificações.
4. Criar uma atividade própria alguns minutos à frente e verificar entrega e abertura do dia correto; repetir com uma atividade cancelada e outra concluída antes do horário.

Validação desta implementação: testes de payload/navegação e datas, TypeScript e suíte SQL `tests/agenda-push.sql` executada em transação com rollback. Essa suíte deve ser envolvida em `BEGIN`/`ROLLBACK` e executada inteira em ambiente com as duas migrações; não executá-la parcialmente. As duas migrações foram aplicadas ao banco conectado, a função `web-push` foi publicada e os cinco segredos configurados no Vault. A chamada autenticada do worker retornou HTTP 200 e a chave pública está acessível às contas autenticadas. A fila estava vazia no teste; isso não comprova entrega em aparelho físico.
