# Análise do Check-ins e proposta de agenda

Data: 14/09/2026. Escopo: código local completo, compilação de produção, metadados do Supabase e documentação oficial. Esta entrega é um diagnóstico e uma especificação; não altera funcionalidades nem o banco em produção.

## Atualização após reativação — 14/09/2026

O projeto agora está `ACTIVE_HEALTHY`. Esta seção substitui as limitações de acesso ao banco e as hipóteses correspondentes descritas na primeira inspeção abaixo. Foram inspecionados esquema, políticas, grants, funções, triggers, índices, configurações e bucket; nenhuma gravação de dados foi realizada.

### Evidências confirmadas

- Contagem SQL exata: **2 perfis, 7 categorias e 0 check-ins**. Não há evidência de lentidão causada por grande volume neste banco. Ainda falta conferir se o deploy Vercel usa o mesmo projeto e medir a navegação autenticada.
- **P0 — leitura sem login:** todas as seis tabelas públicas têm políticas SELECT para `public` com condição `true` e grant SELECT para `anon`. Um teste em transação somente leitura, executado como `anon`, confirmou acesso aos dois perfis e às sete configurações. RLS habilitado não torna essa aplicação privada com as políticas atuais. Restringir acesso às pessoas autenticadas autorizadas; limitar também campos de perfil expostos.
- **P0 — limites e ranking contornáveis:** `checkins_insert_own` só exige propriedade. Grants de INSERT/UPDATE permitem inserir diretamente ou alterar `counts_for_ranking`, data e categoria de registros próprios. Não há trigger que imponha as regras de `create_checkin`. A análise das permissões confirma o caminho; não foram criados registros para explorá-lo. Tornar campos controlados pelo servidor inacessíveis à escrita direta e definir um único caminho protegido de criação/edição.
- **P0 — administrador pelo cadastro:** `handle_new_user`, ligado ao trigger real em `auth.users`, promove os dois usernames indicados no README a ADMIN usando metadados enviados no cadastro. A unicidade do username limita o uso de nomes já ocupados, mas o mecanismo continua inadequado para conceder privilégio. Substituir por provisionamento confiável, preservando os administradores legítimos.
- **RPCs de leitura privilegiadas sem autenticação:** ranking, estatísticas e sequências usam `SECURITY DEFINER` sem verificar identidade. O advisor aponta sete funções acessíveis a `anon`. Não são sete falhas equivalentes: `create_checkin` verifica existência de perfil e os auxiliares de identidade têm escopo próprio. Restringir grants e revisar cada função; o teste anônimo confirmou que `get_ranking` pode ser chamado, retornando zero linhas neste banco sem check-ins.
- **Fotos públicas:** `checkin-images` é público, sem limite de tamanho ou lista de MIME configurados no bucket. Limites globais do serviço não foram inspecionados. Upload autenticado verifica apenas o bucket, sem impor pasta do proprietário. Definir privacidade, tipos, tamanho e caminho autorizado.
- **Limites reais:** cinco postagens/dia e uma contribuição ao ranking/dia. O valor dois do README é apenas o padrão antigo. A agenda deve considerar o limite real de cinco e separar conclusão de pontuação.
- **Fuso UTC confirmado no banco:** `create_checkin`, `get_streak`, `get_couple_streak` e o default de `checkin_date` usam UTC. Em São Paulo, o dia dessas regras muda às 21h locais. Alinhar o fuso antes de implementar cronograma e métricas diárias.
- `ranking_enabled` global não é consultado por `create_checkin` ou `get_ranking`. `likes_enabled` e `comments_enabled` não são verificadas pelas políticas das respectivas inserções. Os controles administrativos precisam ter efeito consistente no servidor e na interface.

### Desempenho e permissões

Existem índices de check-in por usuário/data, categoria e ranking, além da unicidade de curtida por check-in/usuário. Não remover índices classificados como “não usados” logo após reativação e com zero check-ins.

O advisor confirmou quatro chaves estrangeiras sem índice de cobertura: comentários por check-in, comentários por usuário, curtidas por usuário e configurações por editor. Priorizar comentários por check-in para o feed; decidir os demais conforme consultas e volume. Também apontou reavaliação de `auth.uid()` na política de atualização de perfil e políticas permissivas sobrepostas. Esses achados indicam oportunidades de escala, não comprovam a causa da lentidão percebida.

Há grants amplos, incluindo TRUNCATE/TRIGGER/REFERENCES, para `anon` e `authenticated`. Reduzir ao necessário; não se afirma que a API REST exponha essas operações. A política de perfil próprio possui verificação explícita de preservação do papel, portanto não foi confirmada promoção arbitrária por UPDATE do próprio perfil. Políticas UPDATE sem `WITH CHECK` explícito reutilizam a condição `USING` no PostgreSQL; sua ausência isolada não prova alteração indevida de proprietário.

O advisor também informa proteção contra senhas vazadas desativada. Referências de remediação: [funções privilegiadas acessíveis sem login](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [índices de chaves estrangeiras](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [otimização de identidade nas políticas](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### Impacto na implementação da agenda

A disponibilidade foi resolvida. A próxima prioridade é corrigir acesso e integridade do check-in, padronizar fuso e então acrescentar ocorrências planejadas com vínculo único. O relacionamento confirmado usa `profiles.id` como proprietário, associado a `auth.users.id` por `auth_user_id`. O lock transacional por usuário/dia já presente em `create_checkin` pode ser preservado, acrescentando consistência por ocorrência e proteção contra reenvio.

Continuam pendentes medições reais de rede/Vercel, teste funcional autenticado e teste de concorrência em ambiente de desenvolvimento. Esta atualização não aplica correções nem implementa a agenda.

## Diagnóstico principal

O aplicativo hoje é centrado em publicar registros e consultar um feed. Para apoiar a rotina, precisa conectar três momentos: planejar, realizar e acompanhar. A agenda deve alimentar o check-in e receber de volta a conclusão, com vínculo persistente no banco.

Não há evidência suficiente para atribuir a lentidão à escolha Vercel + Supabase. Há problemas concretos de acesso a dados, tratamento de falhas e fluxo de uso que devem ser corrigidos primeiro.

O projeto Supabase configurado em `.env.local` corresponde ao `checkins-app`, na região `sa-east-1`, e estava `INACTIVE` durante a análise. A tentativa de listar tabelas terminou por timeout. Isso comprova indisponibilidade nesta inspeção, mas não explica sozinho a lentidão histórica relatada. A causa da inatividade não foi determinada.

## O que foi e não foi validado

- Todas as páginas, componentes, configuração e utilitários locais foram lidos.
- `npm run build` concluiu com código de saída 0 e verificação de tipos aprovada.
- JavaScript inicial informado pelo build: feed 173 kB; perfil 172 kB; ranking 165 kB; novo check-in 158 kB; login e configurações 156 kB. São tamanhos de build, não tempos de carregamento medidos.
- Não foram encontrados testes de aplicação, migrações SQL versionadas, configuração explícita de ESLint ou configuração Vercel no repositório. O build não substitui uma auditoria de lint configurada nem testes de regras de negócio.
- Os advisors de segurança e desempenho retornaram listas vazias. Com o banco inativo e a inspeção SQL indisponível, isso não permite declarar o banco seguro ou otimizado.
- Não foram inspecionados SQL das RPCs, políticas RLS efetivas, índices, grants, triggers, volume de dados, logs da Vercel, região efetiva das funções ou tempos reais com usuário autenticado.
- A documentação local está parcialmente desatualizada: descreve comentários e exclusão como ausentes, mas ambos já têm interface.

## Achados priorizados

| Prioridade | Evidência | Impacto | Ação proposta |
| --- | --- | --- | --- |
| P0 | Supabase configurado está `INACTIVE`; consulta de tabelas falhou por timeout | Login e dados podem ficar indisponíveis | Recuperar disponibilidade e medir novamente |
| P0 a verificar | README descreve promoção automática a ADMIN por username escolhido no cadastro; login envia username em metadados do usuário | Possível obtenção indevida de privilégio se a regra real for essa | Inspecionar trigger e RLS; provisionar administradores por procedimento confiável, nunca pelo nome informado no cadastro |
| P1 | Middleware, layout e páginas chamam `getUser`; layout e páginas repetem busca de perfil | Potenciais viagens de rede redundantes | Centralizar sessão/perfil com memoização limitada à requisição; medir chamadas efetivas, preservando validação de identidade |
| P1 | Feed aguarda usuário, depois perfil, depois check-ins | Consultas sequenciais alongam caminho crítico | Paralelizar leituras independentes e separar blocos com carregamento progressivo |
| P1 | Perfil consulta check-ins sem paginação; feed limita 50 sem navegar para anteriores | Crescimento do custo e histórico inacessível/truncado | Paginar ambos por cursor estável `(created_at, id)` |
| P1 | Feed e perfil usam `*, profiles(*), categories(*)` e trazem IDs de todas as curtidas/comentários | Dados transferidos crescem com interações | Selecionar campos necessários; retornar contagens e se o usuário curtiu |
| P1 | Configurações ignoram o erro de gravação e exibem “Salvo” | Usuário acredita que uma alteração foi aplicada | Confirmar persistência, tratar erros e desfazer estado otimista em falhas |
| P1 | Curtidas ignoram erros e permitem cliques concorrentes; exclusão de comentário remove antes de confirmar | Interface diverge do banco | Bloquear operações concorrentes e reverter falhas |
| P1 | Feed, ranking e comentários convertem falhas em listas vazias; páginas usam `user!`/`profile!` | Falha parece ausência de dados ou quebra a página | Estados de erro distintos, nova tentativa e tratamento explícito de sessão/perfil ausente |
| P1 | Datas usam `toISOString().slice(0,10)` combinadas com cálculos locais | “Hoje”, semana e mês podem mudar antes da meia-noite local | Centralizar regra de data/fuso e alinhar com banco e agenda |
| P1 | Formulário envia foto original, sem limite/compressão no cliente | Upload demorado em celular; arquivos órfãos se RPC falhar | Redimensionar, validar tamanho/tipo também no servidor/storage e limpar upload sem check-in |
| P2 | Imagens com `fill` sem `sizes` em cards e banner | Navegador pode buscar imagens maiores que a área exibida | Informar tamanhos responsivos e medir transferência |
| P2 | Não há `loading.tsx`/`error.tsx` para as rotas | Espera pouco clara ao navegar e recuperação ruim de falhas | Adicionar esqueletos e limites de erro úteis |
| P2 | Ranking sempre inicia em semana; botões de curtidas/comentários aparecem sem consultar configurações | Ajustes administrativos não refletem integralmente na interface | Consumir configurações com contrato único e verificar aplicação no banco |
| P2 | Ranking não descarta respostas antigas ao mudar filtros rapidamente | Resultado pode corresponder a filtro anterior | Cancelar/ignorar respostas obsoletas |
| P2 | Cadastro ignora se `signUp` devolveu sessão e navega imediatamente | Confirmação de e-mail pode causar fluxo confuso | Mostrar confirmação pendente e implementar retorno de autenticação conforme configuração |
| P2 | API de versículo sem timeout explícito e com fallback em inglês | Bloco pode ficar carregando; idioma inconsistente | Timeout, fallback local em português e carregamento independente |
| P2 | Casal e usernames estão fixos no código | Personalização exige edição e deploy | Configurar vínculo e blocos pessoais no perfil/configurações |
| P2 | Formulários dependem de placeholders e há botões somente com ícones sem nome acessível | Uso com leitores de tela e teclado prejudicado | Rótulos associados, nomes acessíveis, foco visível e movimento reduzido |

O cliente Supabase do navegador já reutiliza uma instância por padrão na biblioteca instalada. Não há evidência de que chamar o wrapper `createClient()` em cada render crie novas conexões continuamente; essa não deve ser tratada como a causa sem medição.

## Desempenho e infraestrutura

Manter a stack durante a primeira rodada de melhorias. O Supabase está em São Paulo. Verificar no painel/deploy a região das funções Vercel e aproximar o processamento do banco, quando compatível com a configuração contratada. A ausência de `vercel.json` não prova que as funções estejam em região distante.

Registrar antes/depois: tempo de navegação para feed e agenda, TTFB, LCP, INP, tamanho das respostas, quantidade de chamadas de autenticação e dados, duração de upload e de criação de check-in, p50/p95 das consultas. Separar acesso inicial, navegação com sessão e conexão móvel. Não prometer ganhos percentuais sem essa linha de base.

Após reativação, inspecionar `pg_stat_statements` e planos das consultas reais. Verificar índices existentes antes de propor novos: ordenação de check-ins por data/id, filtro por usuário e data, chaves das interações e perfil por `auth_user_id`/username. São candidatos a investigar, não índices cuja ausência foi comprovada.

Cache de identidade deve ser por requisição; nunca compartilhar sessão/perfil entre usuários. Dados pouco mutáveis, como categorias/configurações, podem ter estratégia própria de cache e invalidação. Realtime não é necessário para a primeira agenda: atualizar os blocos afetados após a gravação é suficiente.

## Segurança e manutenção

O banco precisa de uma auditoria efetiva quando estiver acessível: RLS de todas as tabelas expostas; propriedade de registros; impossibilidade de alterar o próprio papel; restrições para configurações; acesso às RPCs; funções privilegiadas; limites diários e ranking protegidos contra inserções diretas; regras e limites do Storage.

O README declara imagens em bucket público. Se confirmado, a foto pode ser acessada pela URL sem login. Para conteúdo privado, adotar bucket privado e acesso autenticado/URLs temporárias, com avaliação da migração das imagens existentes.

Há um bom ponto de partida: credenciais locais ignoradas pelo Git, cliente público usando chave anônima e desenho declarado de regras de check-in no banco. Entretanto, README e tipos manuais não comprovam a implementação remota.

Versionar esquema, funções, políticas e índices; gerar tipos a partir do banco; configurar lint e testes de regras críticas. Planejar atualização das dependências com revisão de compatibilidade e avisos oficiais; idade de versão, sozinha, não prova vulnerabilidade.

## Agenda de planejamentos: proposta funcional

Interpretação confirmada pelo usuário: uma página para planejar a rotina, puxar o check-in do cronograma e mostrar no sistema a relação entre planejado e realizado. Não é necessário introduzir organizações empresariais ou equipes para atender a esse pedido.

Navegação sugerida: Hoje, Agenda, Feed e Perfil; ranking e administração em acessos secundários. Preservar o contexto pessoal do casal com blocos compactos. A primeira tela deve priorizar próximas atividades e progresso; hoje banner, sequência e versículo aparecem antes dos registros.

### Fluxo principal

1. Na Agenda, escolher dia e criar uma atividade: título, categoria, início/fim opcionais e observações.
2. Ver lista diária e visão semanal, com editar, reagendar e cancelar. Em celular, lista diária como padrão.
3. Tocar em “Fazer check-in” na atividade. Abrir formulário já preenchido com título, categoria e contexto do plano; foto continua opcional e secundária.
4. Confirmar horários efetivamente realizados. Horário planejado não deve ser registrado automaticamente como horário real sem confirmação.
5. Publicar em uma operação consistente: criar check-in e vinculá-lo à atividade.
6. Agenda mostra “Concluído” com acesso ao registro; feed mostra “Do planejamento”; painel Hoje atualiza o progresso.

Exemplo: “Treino — 18h às 19h” aparece pendente. O usuário faz check-in às 19h10 e informa 18h15–19h05. A agenda mantém o horário planejado e mostra a conclusão; o registro apresenta o horário realizado.

### Regras propostas

- Check-in avulso continua permitido; não entra no percentual de execução da agenda enquanto não estiver vinculado.
- Cada ocorrência planejada admite no máximo um check-in. Dois toques, duas abas ou reenvio após falha de rede retornam o mesmo resultado sem duplicação.
- Planejamento futuro pode ser editado/reagendado/cancelado. Histórico concluído não deve ser reescrito por edição de uma rotina futura.
- Situações básicas: pendente, concluída e cancelada; atraso é calculado a partir do prazo e do fuso. Atividade sem horário torna-se atrasada após o dia local acabar.
- Para a primeira versão, permitir concluir atividade atrasada com registro da data real; não criar check-in futuro. Destacar realização fora do planejamento.
- Excluir check-in vinculado deve reabrir a ocorrência, de forma transacional; cancelamento de plano concluído exige regra explícita, sem apagar histórico silenciosamente.
- Progresso = ocorrências concluídas / ocorrências previstas não canceladas no período. Exibir contagens, inclusive quando não houver planos, e marcar cancelamentos separadamente para não ocultar contexto.
- Cumprimento da agenda e pontuação do ranking são métricas diferentes. A conclusão da rotina não pode depender do limite de pontos no ranking.
- O limite global de postagens merece revisão: o padrão de duas postagens citado no README pode impedir concluir um dia com várias atividades. Proposta: permitir registros das atividades previstas, com proteção contra abuso independente, e manter limite de contribuição ao ranking. Validar configuração real antes da mudança.
- Agenda privada por usuário como padrão; o check-in segue a visibilidade do feed existente. Não expor cronograma completo só porque um registro foi publicado.

### Modelo de dados proposto, sujeito ao esquema real

| Entidade | Finalidade |
| --- | --- |
| `planning_items` | Ocorrências com proprietário, título, categoria, dia/fuso, horário planejado, observações, cancelamento e timestamps |
| `checkins.planning_item_id` | Vínculo opcional com unicidade para impedir múltiplos check-ins da mesma ocorrência |
| `planning_series` (segunda etapa) | Repetição semanal, vigência e dados padrão; gera ocorrências concretas por janela limitada |

Usar a identidade de proprietário já adotada no sistema: os tipos indicam `profiles.id` para `checkins.user_id`, diferente de `auth.users.id`. RLS precisa fazer a associação correta com `auth.uid()`.

A conclusão deve ocorrer em RPC transacional: identificar usuário, validar acesso à ocorrência e categoria, bloquear a ocorrência quando necessário, tratar repetição, aplicar regra de ranking, criar check-in e devolver o estado atualizado. Restrição única no banco fecha a proteção contra concorrência. Não marcar atividade como concluída no navegador antes de confirmar o resultado.

Preferir derivar conclusão da existência do check-in vinculado, evitando duas fontes independentes de verdade. Se o esquema exigir estado materializado, atualizá-lo na mesma transação. Gerar migrações apenas após inspecionar o banco real e testar em ambiente de desenvolvimento.

Repetição semanal deve vir depois do fluxo básico: editar “só este dia” ou “este e os próximos”, preservar ocorrências concluídas e impedir duplicação ao gerar a mesma janela novamente.

## Sequência de execução

| Etapa | Entrega | Critério de conclusão |
| --- | --- | --- |
| 1. Disponibilidade e segurança | Banco acessível, inspeção de privilégios e esquema versionado | Consultas autenticadas funcionam; privilégios e propriedade testados |
| 2. Confiabilidade e velocidade | Erros claros, consultas deduplicadas, paginação, imagens e datas corrigidas | Não há falso sucesso; histórico navegável; comparação de medições disponível |
| 3. Agenda inicial | Planejar, editar, reagendar, cancelar e fazer check-in vinculado | Fluxo completo persiste e aparece em Agenda, Hoje e Feed |
| 4. Repetição e acompanhamento | Rotina semanal, resumo por categoria, planejado versus realizado | Histórico preservado e métricas coerentes |

Testes essenciais: usuário A não acessa planos de B; reenvio/concorrência não duplica check-in; falha de publicação não conclui plano; exclusão reabre ocorrência; limites de ranking funcionam sem inviabilizar rotina; meia-noite e viradas de semana/mês no fuso escolhido; paginação sem perdas com timestamps iguais; erro de upload não deixa falso sucesso; filtros rápidos não mostram resposta antiga.

## Referências oficiais

- [Next.js 14: leituras paralelas, cache por requisição e carregamento progressivo](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns).
- [Supabase: otimização de consultas](https://supabase.com/docs/guides/database/query-optimization).
- [Supabase: inspeção de desempenho](https://supabase.com/docs/guides/observability/inspect).
- [Vercel: configuração de região das funções](https://vercel.com/docs/functions/configuring-functions/region).

As referências fundamentam as recomendações de arquitetura. Os achados específicos do projeto vêm do código e das consultas realizadas nesta análise.
