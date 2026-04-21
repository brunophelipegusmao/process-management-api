siga # Checklist de Conformidade do CLAUDE.md

Data da auditoria: 2026-04-20
Escopo auditado: backend em process-management-api
Critério de status:

- Implementado: requisito atendido no código atual
- Parcial: existe implementação relevante, mas faltam partes do contrato
- Ausente: requisito não foi encontrado
- Divergente: existe solução funcional, mas diferente do contrato declarado

## 1. Stack

| Item                        | Status       | Evidência                                                         | Observação                                                                                                    |
| --------------------------- | ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Node.js + TypeScript strict | Parcial      | package.json, tsconfig.json                                       | Projeto em TypeScript; não foi validado aqui se todas as flags de strict estão no nível esperado do contrato. |
| NestJS com Fastify          | Implementado | src/main.ts#L12-L15                                               | Bootstrap usa NestFactory com FastifyAdapter.                                                                 |
| Drizzle ORM                 | Implementado | src/infra/database/client.ts, src/schema/index.ts                 | Acesso ao banco é via drizzle com postgres.js.                                                                |
| PostgreSQL                  | Implementado | src/infra/database/client.ts                                      | Cliente postgres.js configurado com DATABASE_URL.                                                             |
| Zod como validação          | Implementado | src/common/pipes/zod-validation.pipe.ts, src/schema/zod/index.ts  | Schemas Zod centralizados e pipe global.                                                                      |
| BetterAuth                  | Implementado | src/modules/auth/auth.ts                                          | Auth funcional com BetterAuth.                                                                                |
| REST JSON                   | Implementado | controllers em src/modules                                        | Endpoints HTTP REST presentes, sem GraphQL ou tRPC.                                                           |
| Jobs com @nestjs/schedule   | Implementado | src/jobs/deadlines.job.ts, src/jobs/holiday-sync.job.ts           | Cron jobs implementados com decorators Cron.                                                                  |
| E-mail em infra/email       | Implementado | src/infra/email/email.module.ts, src/infra/email/email.service.ts | Serviço e templates presentes.                                                                                |

## 2. Estrutura do Projeto

| Item                                                    | Status       | Evidência                     | Observação                                                                       |
| ------------------------------------------------------- | ------------ | ----------------------------- | -------------------------------------------------------------------------------- |
| modules/processes                                       | Implementado | src/modules/processes         | Módulo completo.                                                                 |
| modules/hearings                                        | Implementado | src/modules/hearings          | Módulo completo.                                                                 |
| modules/witnesses                                       | Implementado | src/modules/witnesses         | Módulo completo.                                                                 |
| modules/deadlines                                       | Implementado | src/modules/deadlines         | Módulo completo.                                                                 |
| modules/clients                                         | Implementado | src/modules/clients           | Módulo completo.                                                                 |
| modules/users                                           | Implementado | src/modules/users             | Módulo completo.                                                                 |
| modules/reports                                         | Implementado | src/modules/reports           | Módulo completo.                                                                 |
| infra/email                                             | Implementado | src/infra/email               | Implementação presente.                                                          |
| infra/feriados                                          | Ausente      | src/infra/feriados está vazio | A lógica de feriados ficou em src/modules/holydays.                              |
| common/guards, decorators, pipes, filters, interceptors | Implementado | src/common                    | Estrutura presente e ativa.                                                      |
| jobs com JOB-PRAZOS e JOB-FERIADOS                      | Implementado | src/jobs                      | Ambos presentes.                                                                 |
| nomenclatura feriados                                   | Divergente   | src/modules/holydays          | O contrato define feriados; o código usa holydays.                               |
| auth como módulo Nest dedicado                          | Divergente   | src/modules/auth/auth.ts      | Existe apenas um arquivo funcional, não um módulo Nest com a estrutura esperada. |

## 3. Gates Absolutos

| Gate                                      | Status       | Evidência                                                                                 | Observação                                                                                                                                        |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GATE-1 CPF e documentos banidos           | Implementado | src/schema/index.ts, src/schema/zod/index.ts                                              | Schema de witnesses não contém cpf/rg/cnh e o Zod rejeita campos banidos.                                                                         |
| GATE-2 limite de testemunhas no service   | Implementado | src/modules/witnesses/witnesses.service.ts, src/modules/witnesses/witnesses.repository.ts | Validação hard antes do insert com 10 para vara e 4 para jec.                                                                                     |
| GATE-3 audit append-only                  | Implementado | src/common/interceptors/audit.interceptor.ts, src/jobs/jobs.repository.ts                 | Só há inserção em audit_logs; não foram encontrados update/delete.                                                                                |
| GATE-4 witness replaced sem novo deadline | Implementado | src/modules/deadlines/deadlines.service.ts                                                | DeadlinesService bloqueia replaced=true.                                                                                                          |
| GATE-4 status substituida terminal        | Implementado | src/modules/witnesses/witnesses.service.ts                                                | Update e remove bloqueiam testemunha substituída.                                                                                                 |
| GATE-5 superadmin indeletável via API     | Implementado | src/modules/users/users.service.ts                                                        | Remove rejeita superadmin.                                                                                                                        |
| GATE-5 active=false só fora da API        | Parcial      | src/modules/users/users.service.ts                                                        | A API bloqueia desativar superadmin, mas permite atualizar active de outros usuários. O contrato tratava apenas a conta superadmin como especial. |
| GATE-6 schema fonte única                 | Parcial      | src/schema/index.ts, src/schema/zod/index.ts, src/common/pipes/create-zod-dto.ts          | O padrão principal existe, mas há tipos auxiliares de repositório e auth fora de schema.                                                          |

## 4. Arquitetura e Camadas

| Item                                                   | Status       | Evidência                                                             | Observação                                                                                                                                                             |
| ------------------------------------------------------ | ------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fluxo Guard → Pipe → Controller → Service → Repository | Implementado | src/app.module.ts, controllers e services                             | Arquitetura principal respeitada.                                                                                                                                      |
| Controllers sem lógica de negócio relevante            | Implementado | controllers em src/modules                                            | Controllers delegam para services.                                                                                                                                     |
| Services sem acesso direto ao Drizzle                  | Parcial      | services em geral, exceto auth/audit                                  | Services de domínio usam repositories; auth e audit usam db diretamente fora do padrão de módulo de domínio.                                                           |
| Repositories só com acesso a dados                     | Implementado | repositories em src/modules                                           | Padrão predominante correto.                                                                                                                                           |
| Schemas Zod compartilhados em src/schema/zod           | Implementado | src/schema/zod/index.ts                                               | Centralização presente.                                                                                                                                                |
| Response envelope sempre padronizado                   | Parcial      | src/common/interceptors/response-envelope.interceptor.ts, controllers | O interceptor envelopa raw data, mas vários controllers já retornam data/meta manualmente; o contrato está atendido no resultado, com duplicidade de responsabilidade. |

## 5. Padrões Obrigatórios

| Item                                        | Status       | Evidência                                                              | Observação                                                       |
| ------------------------------------------- | ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| FastifyAdapter no bootstrap                 | Implementado | src/main.ts#L12-L15                                                    | Conforme contrato.                                               |
| CORS configurado via FastifyAdapter options | Ausente      | src/main.ts                                                            | Não foi encontrada configuração explícita de CORS.               |
| ZodValidationPipe global                    | Implementado | src/app.module.ts                                                      | Pipe global registrado via APP_PIPE.                             |
| AuthGuard global                            | Implementado | src/app.module.ts                                                      | Guard global registrado.                                         |
| Exceção pública para health                 | Parcial      | src/app.controller.ts                                                  | Rota pública existe em barra raiz, não em /health.               |
| Exceção pública para auth/login             | Divergente   | src/modules/auth/auth.ts, test/app.e2e-spec.ts                         | Auth pública existe em /auth com BetterAuth, não em /auth/login. |
| RolesGuard e @Roles                         | Implementado | src/app.module.ts, controllers                                         | Regras por perfil aplicadas.                                     |
| @CurrentUser                                | Implementado | src/common/decorators/current-user.decorator.ts, src/app.controller.ts | Decorator em uso.                                                |
| AuditInterceptor grava após sucesso         | Implementado | src/common/interceptors/audit.interceptor.ts                           | Persistência acontece no fluxo após handle com mergeMap.         |
| Audit captura previous_data e new_data      | Parcial      | src/common/interceptors/audit.interceptor.ts                           | Só grava newData; previousData não é capturado.                  |
| postgres.js pool                            | Implementado | src/infra/database/client.ts                                           | Uso de postgres.js com pool.                                     |
| Migrations com drizzle-kit                  | Implementado | package.json, migrations                                               | Scripts e migrations presentes.                                  |
| Formatação de erros Zod                     | Implementado | src/common/pipes/zod-validation.pipe.ts                                | Retorna lista de field e message.                                |
| GlobalExceptionFilter                       | Implementado | src/common/filters/global-exception.filter.ts                          | Mapeia erro para payload padronizado.                            |

## 6. Regras de Negócio

### 6.1 Testemunha Cadastro

| Item                                           | Status       | Evidência                                  | Observação                                                                                             |
| ---------------------------------------------- | ------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Dados completos geram status adequado          | Implementado | src/modules/witnesses/witnesses.service.ts | Resolve status como dados_completos quando address preenchido.                                         |
| Dados incompletos geram prazo dados_testemunha | Implementado | src/modules/witnesses/witnesses.service.ts | Cria deadline ao ficar pendente_dados.                                                                 |
| Dados incompletos disparam E1                  | Implementado | src/modules/witnesses/witnesses.service.ts | Chama emailService com template E1.                                                                    |
| mentions_witness=false não aciona módulo       | Parcial      | src/modules/witnesses/witnesses.service.ts | Não há bloqueio explícito de create por mentionsWitness=false; hearings só sinaliza ativação de fluxo. |

### 6.2 Testemunha Substituição

| Item                                               | Status       | Evidência                                     | Observação                                                                                                       |
| -------------------------------------------------- | ------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Substituição permitida a qualquer tempo            | Implementado | src/modules/witnesses/witnesses.service.ts    | Não verifica status anterior além de já substituída.                                                             |
| Original recebe replaced=true e status substituida | Implementado | src/modules/witnesses/witnesses.repository.ts | markAsReplaced aplica os campos esperados.                                                                       |
| Cancela deadlines ativos da original               | Implementado | src/modules/witnesses/witnesses.service.ts    | Usa cancelActiveByWitnessId em transação.                                                                        |
| Cria substituta sem contar no limite               | Implementado | src/modules/witnesses/witnesses.service.ts    | Limite é checado antes do insert e count exclui replaced/desistida; memória de repo confirma decisão do projeto. |
| Operação inteira em transação                      | Implementado | src/modules/witnesses/witnesses.service.ts    | runInTransaction envolve o fluxo.                                                                                |

### 6.3 Testemunha Desistência

| Item                              | Status       | Evidência                                     | Observação                                                           |
| --------------------------------- | ------------ | --------------------------------------------- | -------------------------------------------------------------------- |
| Status muda para desistida        | Implementado | src/modules/witnesses/witnesses.repository.ts | markAsRetired define desistida.                                      |
| Cancela deadlines ativos          | Implementado | src/modules/witnesses/witnesses.service.ts    | remove cancela deadlines da witness.                                 |
| Lembrete futuro se exigir petição | Ausente      | não encontrado                                | O próprio CLAUDE.md deixa isso pendente; não há lembrete específico. |

### 6.4 Intimação

| Item                                            | Status  | Evidência                                  | Observação                                                                                 |
| ----------------------------------------------- | ------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Métodos de intimação modelados                  | Implementado | src/modules/witnesses/witnesses.controller.ts, src/modules/witnesses/witnesses.service.ts, src/schema/zod/index.ts | Há endpoints, schemas e orquestração explícita para carta_simples, carta_precatoria, sala_passiva, mandado e whatsapp. |
| CUSTAS_PRECATORIA gerado quando aplicável       | Implementado | src/modules/witnesses/witnesses.service.ts | requestIntimation gera CUSTAS_PRECATORIA quando o método é carta_precatoria. |
| JUNTADA_INTIMACAO gerado por resultado positivo | Implementado | src/modules/witnesses/witnesses.service.ts | registerIntimationOutcome cria JUNTADA_INTIMACAO no resultado positivo e evita duplicação. |
| PROVIDENCIA_CLIENTE + E3 por resultado negativo | Implementado | src/modules/witnesses/witnesses.service.ts | O resultado negativo passou a ser modelado por endpoint dedicado e reaproveita a orquestração já existente de PROVIDENCIA_CLIENTE + E3. |
| Registro de data e hora no caso whatsapp        | Parcial | src/modules/witnesses/witnesses.service.ts | O envio é registrado com timestamp em notes e audit log; ainda não há campos dedicados no schema da witness. |

### 6.5 Audiência Cancelamento

| Item                                      | Status       | Evidência                                | Observação                         |
| ----------------------------------------- | ------------ | ---------------------------------------- | ---------------------------------- |
| hearing.status cancelada                  | Implementado | src/modules/hearings/hearings.service.ts | cancel atualiza status.            |
| Todos os deadlines do processo cancelados | Implementado | src/modules/hearings/hearings.service.ts | cancelActiveByProcessId é chamado. |
| Dispara E4                                | Implementado | src/modules/hearings/hearings.service.ts | emailService com template E4.      |

### 6.6 Audiência Redesignação

| Item                                                              | Status       | Evidência                                | Observação                                                               |
| ----------------------------------------------------------------- | ------------ | ---------------------------------------- | ------------------------------------------------------------------------ |
| hearing.status redesignada e rescheduled_to                       | Implementado | src/modules/hearings/hearings.service.ts | status e rescheduledTo atualizados.                                      |
| Todos os deadlines vinculados cancelados                          | Implementado | src/modules/hearings/hearings.service.ts | cancelActiveByProcessId é chamado.                                       |
| Dispara E5                                                        | Implementado | src/modules/hearings/hearings.service.ts | emailService com template E5.                                            |
| Gera novos deadlines pela nova data                               | Parcial      | src/modules/hearings/hearings.service.ts | Recria apenas os deadlines baseados em audiência já existentes.          |
| Notificação interna se delta maior que 30 e testemunhas intimadas | Implementado | src/modules/hearings/hearings.service.ts, src/infra/email/internal-notification.service.ts | Além do marcador interno no retorno, agora há envio efetivo de E6 para usuários internos ativos. |

### 6.7 Prazos e Dias Úteis

| Item                                       | Status       | Evidência                                            | Observação                   |
| ------------------------------------------ | ------------ | ---------------------------------------------------- | ---------------------------- |
| DADOS_TESTEMUNHA 5 dias úteis              | Implementado | src/modules/deadlines/deadline-calculator.service.ts | Regra presente.              |
| CUSTAS_PRECATORIA 5 dias corridos          | Implementado | src/modules/deadlines/deadline-calculator.service.ts | Regra presente.              |
| JUNTADA_INTIMACAO audiência - 5 úteis      | Implementado | src/modules/deadlines/deadline-calculator.service.ts | Regra presente.              |
| DESISTENCIA_TESTEMUNHA audiência - 5 úteis | Implementado | src/modules/deadlines/deadline-calculator.service.ts | Regra presente.              |
| PROVIDENCIA_CLIENTE 3 dias úteis           | Implementado | src/modules/deadlines/deadline-calculator.service.ts | Regra presente.              |
| Feriados nacional/estadual/municipal       | Implementado | src/modules/holydays/holidays.service.ts             | Seleção por escopo presente. |
| source=manual sobrepõe auto                | Implementado | src/modules/holydays/holidays.service.ts             | Upsert respeita precedência. |

## 7. Jobs

| Item                                  | Status       | Evidência                                | Observação                                                                    |
| ------------------------------------- | ------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| JOB-PRAZOS agenda 07h diário          | Implementado | src/jobs/deadlines.job.ts                | Cron correto.                                                                 |
| Passo 1 marca aberto e vencido        | Implementado | src/jobs/deadlines.job.ts                | Implementado.                                                                 |
| Passo 1 gera notificação interna      | Implementado | src/jobs/deadlines.job.ts, src/infra/email/internal-notification.service.ts | O job agora agrupa por processo e envia E6 para os destinatários internos ativos. |
| Passo 2 alerta preventivo para amanhã | Implementado | src/jobs/deadlines.job.ts, src/infra/email/internal-notification.service.ts | O job continua marcando notificationSent e agora também envia alerta interno efetivo. |
| Passo 3 notifica JUNTADA_INTIMACAO    | Implementado | src/jobs/deadlines.job.ts, src/infra/email/internal-notification.service.ts | O job envia a notificação operacional e persiste o envio via email E6. |
| Passo 4 insere audit log JOB_PRAZOS   | Implementado | src/jobs/deadlines.job.ts                | createAuditLog é chamado.                                                     |
| Passos isolados por transação         | Implementado | src/jobs/deadlines.job.ts                | runStep usa transação própria.                                                |
| JOB-FERIADOS mensal 06h dia 1         | Implementado | src/jobs/holiday-sync.job.ts             | Cron correto.                                                                 |
| BrasilAPI ano atual e seguinte        | Implementado | src/jobs/holiday-sync.job.ts             | Busca dois anos.                                                              |
| source=auto não sobrescreve manual    | Implementado | src/modules/holydays/holidays.service.ts | Regra respeitada no create.                                                   |

## 8. Módulos

| Módulo          | Status       | Evidência             | Observação                                                                      |
| --------------- | ------------ | --------------------- | ------------------------------------------------------------------------------- |
| ProcessesModule | Implementado | src/modules/processes | CNJ único no service/repository.                                                |
| HearingsModule  | Implementado | src/modules/hearings  | Regras principais presentes.                                                    |
| WitnessesModule | Implementado | src/modules/witnesses | Gates, substituição, desistência, fluxo explícito de intimação e resultado agora estão modelados. |
| DeadlinesModule | Implementado | src/modules/deadlines | Motor de prazo funcional.                                                       |
| ClientsModule   | Implementado | src/modules/clients   | E-mail único tratado no service.                                                |
| UsersModule     | Implementado | src/modules/users     | Perfis e bloqueio de superadmin presentes.                                      |
| ReportsModule   | Implementado | src/modules/reports   | Acesso restrito a advogado e superadmin.                                        |

## 9. Entidades e Schema

| Item                              | Status       | Evidência                                                                    | Observação                                                               |
| --------------------------------- | ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Enums do domínio                  | Implementado | src/schema/index.ts                                                          | Enums principais presentes.                                              |
| users com perfil único superadmin | Implementado | src/schema/index.ts                                                          | Índice parcial único presente.                                           |
| users com password_hash           | Divergente   | migrations/0000_smooth_talisman.sql, migrations/0001_spicy_the_professor.sql | Existiu na migration inicial, mas foi removido para acomodar BetterAuth. |
| clients com email único           | Implementado | src/schema/index.ts                                                          | Campo email unique.                                                      |
| processes conforme contrato       | Implementado | src/schema/index.ts                                                          | Colunas principais presentes.                                            |
| hearings conforme contrato        | Implementado | src/schema/index.ts                                                          | Colunas principais presentes.                                            |
| witnesses sem docs pessoais       | Implementado | src/schema/index.ts                                                          | Colunas proibidas ausentes.                                              |
| deadlines conforme contrato       | Implementado | src/schema/index.ts                                                          | Estrutura presente.                                                      |
| holidays conforme contrato        | Implementado | src/schema/index.ts                                                          | Estrutura presente.                                                      |
| emails conforme contrato          | Implementado | src/schema/index.ts                                                          | Estrutura presente.                                                      |
| audit_logs append-only            | Implementado | src/schema/index.ts, src/common/interceptors/audit.interceptor.ts            | Estrutura e uso coerentes.                                               |

## 10. Workflow Recomendado por Fase

| Fase           | Status       | Evidência                                                            | Observação                                                                        |
| -------------- | ------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Fundação       | Implementado | app.module, main, schema, migrations, auth, guards, pipes            | Base funcional presente.                                                          |
| Domínio        | Implementado | modules de clients, users, processes, deadlines, witnesses, hearings | Ordem histórica não auditada; resultado existe.                                   |
| Infraestrutura | Parcial      | infra/email, jobs, feriados                                          | Email e jobs existem; FeriadosService não está em infra/feriados como contratado. |
| Relatórios     | Implementado | src/modules/reports                                                  | Overview agregado disponível.                                                     |

## 11. Validação Executada na Auditoria

- Build: aprovado com pnpm build
- Testes unitários: aprovados com pnpm test --runInBand
- Teste e2e: aprovado com pnpm test:e2e --runInBand
- Observação: há aviso de configuração em tsconfig.json sobre baseUrl depreciado

## 12. Resumo Executivo

### Implementado com boa aderência

- stack principal com NestJS + Fastify + Drizzle + postgres.js + Zod + BetterAuth
- módulos centrais de clientes, usuários, processos, prazos, testemunhas, audiências e relatórios
- gates críticos de testemunhas, prazos, auditoria append-only e superadmin
- cron jobs principais e cálculo de dias úteis

### Parcial ou divergente

- estrutura de feriados ficou fora de infra/feriados e com nome holydays
- auth funciona, mas não segue a estrutura declarada como módulo Nest
- audit interceptor não preenche previous_data
- health público existe em barra raiz, não em /health
- response envelope está correto no resultado, mas duplicado entre controllers e interceptor
- registro de envio/resultado de intimação usa notes/audit em vez de colunas dedicadas no schema de testemunhas

### Ausente

- configuração explícita de CORS no bootstrap
