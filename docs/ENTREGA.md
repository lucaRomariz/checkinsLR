# Agenda e check-ins — entrega

O banco Supabase `checkins-app` já recebeu a migração `20260914200339_agenda_security`. Os administradores existentes foram preservados.

## O que muda

- **Hoje:** atividades do dia e progresso do planejamento.
- **Agenda:** visão diária/semanal, criar, editar, reagendar, cancelar e reativar atividades.
- **Check-in do planejamento:** preenche contexto e categoria, registra horários realizados separadamente e marca a atividade como concluída. Repetir a mesma publicação não duplica a conclusão.
- **Feed e perfil:** histórico paginado, contagens agregadas e fotos privadas com links temporários.
- **Segurança:** leitura autenticada, agenda por proprietário, criação de check-ins exclusivamente pelas funções protegidas, sem promoção automática de administrador pelo cadastro.
- **Regras:** datas de Brasília; o limite de postagens vale para check-ins avulsos. Atividades planejadas podem ser concluídas sem aumentar o limite de pontos no ranking. Há um limite de segurança de 100 registros totais por dia.
- **Uso no celular:** navegação inferior, campos e botões adaptados, áreas de toque e margem para a barra de sistema.

## Publicar na Vercel

1. Enviar a versão final do repositório para o GitHub conectado à Vercel, incluindo `app`, `components`, `lib`, `package.json`, `package-lock.json`, arquivos de configuração e `vercel.json`.
2. Manter `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` apontando para o projeto existente, tanto em Production quanto no ambiente de Preview utilizado. Nunca adicionar uma chave `service_role` ao frontend.
3. Usar o preset Next.js, instalar com o lockfile e executar `npm run build`. `vercel.json` define São Paulo (`gru1`) para aproximar as funções do banco.
4. Conferir os endereços permitidos no Auth do Supabase quando trocar domínio. Nenhuma nova chave é necessária para a agenda.
5. Não reenviar SQL manualmente: a migração já foi aplicada. Os arquivos SQL são o histórico versionado e servem para outros ambientes.
6. Validar no domínio publicado: entrar, planejar, concluir, abrir o feed e recarregar a agenda.

Subir arquivos para hospedagem estática não é suficiente: este projeto usa renderização no servidor e precisa do deploy Next.js da Vercel. Não enviar `node_modules`, `.next`, `.next-dev` ou `.env.local` ao repositório. A configuração das variáveis fica no painel Vercel.

## Validação

- Compilação e verificação TypeScript.
- Testes de datas locais, meia-noite, semana, ano e ano bissexto: `npm test`.
- `tests/database.sql`: isolamento por usuário, bloqueio de escrita direta, idempotência, reabertura após exclusão e acesso anônimo negado.
- `tests/database-rules.sql`: atividade futura/cancelada, reativação, limite avulso separado do planejamento, ranking e paginação com timestamps iguais.
- Os testes SQL incluem `BEGIN`/`ROLLBACK`, criam usuários temporários dentro da transação e não devem ser executados parcialmente.

### Resultado dos testes desta entrega

- Build de produção e TypeScript aprovados.
- Nove verificações de datas/fuso aprovadas.
- Duas suítes SQL executadas com rollback, antes/depois da migração.
- Teste pela API: seis conclusões concorrentes retornaram um único check-in; exclusão reabriu a atividade.
- Navegador em 390 e 320 pixels: criação de plano, preenchimento de horários, conclusão, atualização de progresso, foto privada carregada e navegação semanal; sem rolagem horizontal nas telas verificadas.
- Formulário de planejamento em 320 pixels coube no viewport e conservou rolagem interna. Foco inicial e campos verificados no navegador; teclado virtual e Safari em aparelho real ainda devem ser conferidos após o deploy.
- Dados descartáveis e imagem sintética removidos ao final da validação.

## Limitações e operação

- A agenda permite planejar cada ocorrência; repetição automática semanal não está incluída. Web push e lembretes de início estão configurados no Supabase. As alterações de interface precisam ser publicadas na Vercel; a entrega em aparelho físico ainda precisa de validação.
- Proteção contra senhas vazadas permanece desativada no Auth e precisa ser configurada no painel, conforme disponibilidade do plano.
- Fotos aceitas: JPG, PNG e WebP, reduzidas antes do envio; até 5 MB no bucket. Uma falha de rede ambígua preserva o upload para nova tentativa. Arquivos abandonados nesse caso podem precisar de limpeza operacional futura.
- Links de fotos expiram após uma hora: recarregar a página renova os links.
- O deploy Vercel não foi executado pelo assistente. O código local e o banco precisam estar na mesma versão: a interface antiga não implementa a agenda e sua exclusão direta de check-ins foi substituída por RPC.
- Sem medições antes/depois na Vercel, não se atribui um percentual de ganho. As melhorias verificadas reduzem volume por consulta, carregamento inicial de blocos opcionais e leituras repetidas.
