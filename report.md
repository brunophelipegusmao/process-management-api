# Relatório de Status — Gestão Processual API

**Data de geração:** 22/04/2026  
**Escopo:** Backend `process-management-api` — análise completa do código-fonte, testes, migrations e documentação Swagger.

---

## Sumário Executivo

O projeto está em estágio avançado de desenvolvimento. A espinha dorsal da aplicação está concluída: stack completa configurada, todos os módulos de domínio implementados, regras de negócio críticas aplicadas e testes unitários passando. A documentação Swagger está acessível em `/docs`, porém com cobertura parcial. Existem divergências de nomenclatura e desvios estruturais pontuais em relação ao contrato do `CLAUDE.md`, além de funcionalidades ausentes classificadas como pendentes de decisão de negócio.

---

## 1. O que está implementado e funcionando

### 1.1 Stack e Infraestrutura

| Item | Status | Observação |
|------|--------|------------|
| NestJS com FastifyAdapter | ✅ Completo | Bootstrap correto em `src/main.ts` |
| Drizzle ORM + PostgreSQL | ✅ Completo | `postgres.js` com pool configurável via `DATABASE_POOL_MAX` |
| BetterAuth (email+senha) | ✅ Completo | Rotas em `/auth/*` montadas diretamente no Fastify |
| Zod — validação global | ✅ Completo | `ZodValidationPipe` registrado via `APP_PIPE`; erros formatados como `{field, message}[]` |
| `@nestjs/schedule` | ✅ Completo | Dois cron jobs funcionais |
| CORS | ✅ Completo | Origens configuráveis via `CORS_ORIGINS` |
| Migrations | ✅ Completo | 2 migrations geradas; enums e tabelas conforme contrato |
| TypeScript (modo strict parcial) | ⚠️ Parcial | `strictNullChecks: true`, `noImplicitAny: false` — modo strict não está totalmente habilitado |

### 1.2 Schema do Banco de Dados

O schema em `src/schema/index.ts` é a única fonte de verdade e cobre **todos** os enums e tabelas definidos no contrato:

- **Enums (15):** `court_type`, `client_type`, `client_side`, `process_status`, `hearing_type`, `hearing_status`, `witness_status`, `witness_side`, `deadline_type`, `deadline_status`, `holiday_type`, `holiday_source`, `email_template`, `user_profile`, `action_type`
- **Tabelas (12):** `users`, `sessions`, `accounts`, `verifications`, `clients`, `processes`, `hearings`, `witnesses`, `deadlines`, `holidays`, `emails`, `audit_logs`
- Tipos TypeScript derivados via `InferSelectModel` / `InferInsertModel` para todas as tabelas

### 1.3 Módulos de Domínio

Todos os 7 módulos de domínio estão implementados com a arquitetura Controller → Service → Repository:

| Módulo | Endpoints | CRUD | Lógica específica |
|--------|-----------|------|-------------------|
| `ClientsModule` | `GET /clients`, `GET /clients/:id`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id` | ✅ | Unicidade de e-mail; normalização lowercase |
| `UsersModule` | `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id` | ✅ | GATE-5: superadmin indeletável e intransferível |
| `ProcessesModule` | `GET /processes`, `GET /processes/:id`, `POST /processes`, `PATCH /processes/:id`, `DELETE /processes/:id` | ✅ | Unicidade CNJ; validação de `client_id` |
| `HearingsModule` | `GET /hearings`, `GET /hearings/:id`, `POST /hearings`, `PATCH /hearings/:id`, `POST /hearings/:id/reschedule`, `DELETE /hearings/:id` | ✅ | Cancelamento e redesignação com cascata de prazos; notificações E4/E5 |
| `WitnessesModule` | `GET /witnesses`, `GET /witnesses/:id`, `POST /witnesses`, `PATCH /witnesses/:id`, `POST /witnesses/:id/replace`, `POST /witnesses/:id/intimation`, `POST /witnesses/:id/intimation/outcome`, `DELETE /witnesses/:id` | ✅ | Fluxos completos (ver 1.5) |
| `DeadlinesModule` + Holidays | `GET /deadlines`, `GET /deadlines/:id`, `POST /deadlines`, `PATCH /deadlines/:id`, `DELETE /deadlines/:id`; `GET /holidays`, `GET /holidays/:id`, `POST /holidays`, `PATCH /holidays/:id`, `DELETE /holidays/:id` | ✅ | Motor de dias úteis; upsert de feriados com precedência `manual` |
| `ReportsModule` | `GET /reports/overview` | ✅ (básico) | 6 indicadores agregados; acesso restrito a `superadmin` e `advogado` |

### 1.4 Camada Comum (`src/common/`)

| Componente | Status | Detalhe |
|------------|--------|---------|
| `AuthGuard` | ✅ | Valida sessão BetterAuth; popula `request.user`; respeita `@Public()` |
| `RolesGuard` | ✅ | Verifica `@Roles()` por handler e controller |
| `@CurrentUser()` | ✅ | Decorator funcional; usado em `GET /me` |
| `@Public()` | ✅ | Decorator funcional; usado na rota `/` |
| `@Roles()` | ✅ | Decorator funcional |
| `ZodValidationPipe` | ✅ | Global; integrado com `createZodDto()` |
| `GlobalExceptionFilter` | ✅ | Normaliza exceções NestJS para `{error, details?}` |
| `AuditInterceptor` | ✅ | Append-only em `audit_logs`; registra após resposta bem-sucedida (GATE-3) |
| `ResponseEnvelopeInterceptor` | ✅ | Envelopa respostas raw em `{data}` |
| `setupSwagger` | ✅ | UI em `/docs`, JSON em `/docs/json`, YAML em `/docs/yaml` |

### 1.5 Regras de Negócio (Gates e Fluxos)

| Gate/Regra | Status | Detalhe |
|------------|--------|---------|
| **GATE-1** — CPF/docs banidos | ✅ | Schema Drizzle sem esses campos; Zod rejeita campos proibidos via `withWitnessGuards` |
| **GATE-2** — Limite testemunhas | ✅ | Bloqueio hard: `jec`=4, `vara`=10; contagem exclui `replaced=true` e `status=desistida`; `ConflictException` com `vagas_restantes` |
| **GATE-3** — audit_logs imutável | ✅ | Apenas `db.insert`; ausência de update/delete confirmada |
| **GATE-4** — replaced bloqueia deadline | ✅ | `DeadlinesService` rejeita `replaced=true` com `UnprocessableEntityException` |
| **GATE-4** — status terminal | ✅ | `substituida` bloqueia update, replace e remove |
| **GATE-5** — superadmin indeletável | ✅ | `UsersService.remove()` rejeita `profile=superadmin`; desativação via API também bloqueada |
| **GATE-6** — schema fonte única | ✅ | DTOs derivados de schemas Zod via `z.infer` |
| Substituição em transação | ✅ | `db.transaction()` cobre criação da substituta + marcação da original + cancelamento de prazos |
| Desistência de testemunha | ✅ | Muda status para `desistida`; cancela prazos ativos |
| Intimação (5 métodos) | ✅ | `carta_simples`, `carta_precatoria`, `sala_passiva`, `mandado`, `whatsapp`; gera `CUSTAS_PRECATORIA` ou `JUNTADA_INTIMACAO` conforme método |
| Resultado da intimação | ✅ | Positivo → `JUNTADA_INTIMACAO`; negativo → `PROVIDENCIA_CLIENTE` + E3 |
| Cancelamento de audiência | ✅ | Status `cancelada`; cancela todos os prazos do processo; envia E4 |
| Redesignação de audiência | ✅ | Status `redesignada`; cancela prazos; recria prazos baseados em audiência com nova data; envia E5; notificação interna se delta > 30 dias com testemunhas intimadas |
| Dados incompletos de testemunha | ✅ | `pendente_dados` → cria prazo `DADOS_TESTEMUNHA` (5 dias úteis) + envia E1 |

### 1.6 Motor de Prazos (`DeadlineCalculatorService`)

| Tipo | Cálculo | Status |
|------|---------|--------|
| `dados_testemunha` | +5 dias úteis a partir de hoje | ✅ |
| `custas_precatoria` | +5 dias corridos | ✅ |
| `providencia_cliente` | +3 dias úteis | ✅ |
| `juntada_intimacao` | audiência − 5 dias úteis | ✅ |
| `desistencia_testemunha` | audiência − 5 dias úteis | ✅ |

Feriados: filtra nacionais, estaduais e municipais da comarca. Prioridade `source=manual` sobre `source=auto` para mesma data.

### 1.7 Cron Jobs

| Job | Schedule | Passos | Status |
|-----|----------|--------|--------|
| `JOB-PRAZOS` | `0 7 * * *` (07h00 diário) | 1) Marca vencidos; 2) Alerta preventivo (vencem amanhã); 3) Alerta `juntada_intimacao`; 4) Grava `audit_log JOB_PRAZOS` | ✅ |
| `JOB-FERIADOS` | `0 6 1 * *` (1º de cada mês, 06h00) | Sincroniza feriados nacionais do ano corrente e seguinte via BrasilAPI; upsert sem sobrescrever `source=manual` | ✅ |

Cada passo do `JOB-PRAZOS` roda em transação própria — falha isolada não cancela os demais.

### 1.8 EmailService

- Arquitetura plugável via token `EMAIL_TRANSPORT`
- Provedor padrão: `ConsoleEmailTransport` (log em console)
- Templates E1 a E6 implementados com renderização de variáveis
- `InternalNotificationService`: envia E6 para todos os usuários ativos com perfil `advogado` ou `superadmin`
- Registro em tabela `emails` após cada envio

### 1.9 Testes

- **14 suites** — **52 testes unitários** passando (tempo: ~1.7s)
- Cobertura de serviços: `clients`, `users`, `processes`, `hearings`, `witnesses`, `deadlines`, `holidays`, `reports`, `email`, `jobs`
- **1 suite E2E** (`test/app.e2e-spec.ts`) com testes de integração contra banco real: health, autenticação, CRUD de clientes e usuários, controle de acesso por perfil, relatórios

### 1.10 Swagger (`/docs`)

- UI funcional com `persistAuthorization`, `displayRequestDuration`, expansão automática
- Todos os controllers anotados com `@ApiTags` e `@ApiOperation`
- JSON exportável em `/docs/json`

---

## 2. O que precisa de atenção (Parcial ou Divergente)

### 2.1 Nomenclatura — `holydays` (typo) em vez de `holidays`

**Impacto:** Médio  
**Local:** `src/modules/holydays/`

O diretório e o arquivo do módulo usam `holydays` (grafia incorreta em inglês). O contrato define `holidays` e a estrutura de infra menciona `feriados`. Isso cria inconsistência com importações externas, buscas no código e futuros desenvolvedores.

> **Ação sugerida:** Renomear o diretório para `src/modules/holidays/` e atualizar todos os imports.

### 2.2 `src/infra/feriados/` vazio

**Impacto:** Baixo (cosmético)  
**Local:** `src/infra/feriados/`

O diretório existe mas está vazio. A lógica de feriados ficou em `src/modules/holydays/` (dentro do `DeadlinesModule`). Não é um bug funcional, mas diverge da estrutura definida no contrato.

> **Ação sugerida:** Ou remover o diretório vazio, ou mover `HolidaysService` para `src/infra/feriados/` conforme o contrato original.

### 2.3 `src/modules/auth/auth.ts` — não é um módulo NestJS

**Impacto:** Baixo (cosmético/arquitetural)  
**Local:** `src/modules/auth/auth.ts`

Existe apenas um arquivo funcional (`auth.ts`) com a instância do BetterAuth e helpers, sem `AuthModule`, `AuthController` ou `AuthService` no padrão NestJS. Funciona bem, mas diverge da arquitetura modular esperada.

> **Ação sugerida:** Criar `auth.module.ts` como wrapper, ou documentar explicitamente que a auth é tratada fora do padrão de módulo NestJS.

### 2.4 `AuditInterceptor` não captura `previousData`

**Impacto:** Médio  
**Local:** `src/common/interceptors/audit.interceptor.ts`

O interceptor grava apenas `newData`. O campo `previousData` — que existe no schema — permanece sempre `null`. Para operações de UPDATE e DELETE, a capacidade de auditoria completa (antes/depois) fica prejudicada.

> **Ação sugerida:** Nos fluxos de PATCH/DELETE, buscar o estado anterior no service antes da mutação e repassar via contexto ou retorno enriquecido.

### 2.5 `mentions_witness=false` não bloqueia criação de testemunha

**Impacto:** Médio  
**Local:** `src/modules/witnesses/witnesses.service.ts`

O contrato define que `mentions_witness=false` em um processo não deve acionar o módulo de testemunhas. Atualmente `WitnessesService.create()` não verifica esse campo — qualquer usuário pode cadastrar testemunhas em processos sem testemunhas declaradas.

> **Ação sugerida:** Adicionar verificação de `process.mentionsWitness` no início de `WitnessesService.create()` e lançar `UnprocessableEntityException` se `false`.

### 2.6 TypeScript strict não está totalmente habilitado

**Impacto:** Baixo  
**Local:** `tsconfig.json`

`noImplicitAny: false` e `strictBindCallApply: false` estão desabilitados. O contrato menciona "TypeScript strict". Atualmente o código compila sem erros mesmo com `any` implícito.

> **Ação sugerida:** Habilitar `strict: true` ou pelo menos `noImplicitAny: true` e corrigir os erros que surgirem.

### 2.7 Response Envelope — duplicidade de responsabilidade

**Impacto:** Baixo  
**Local:** `src/common/interceptors/response-envelope.interceptor.ts` + controllers

O `ResponseEnvelopeInterceptor` envelopa respostas raw em `{data}`, mas vários controllers já retornam manualmente `{data, meta}`. Isso cria uma duplicidade: o interceptor tem uma condição para não re-envelopar quando `data` ou `error` já estão presentes. Funciona corretamente, mas a lógica está dividida.

> **Ação sugerida:** Padronizar — controllers de listagem podem retornar diretamente `{data, meta}` (responsabilidade do controller), e o interceptor fica apenas como fallback para respostas simples.

### 2.8 Swagger sem `addBearerAuth()` e sem `@ApiResponse()` detalhados

**Impacto:** Médio  
**Local:** `src/common/swagger/setup-swagger.ts` e controllers

O `DocumentBuilder` não chama `.addBearerAuth()`, portanto o botão "Authorize" no Swagger UI não está vinculado ao esquema de autenticação Bearer. Além disso, a maioria dos endpoints não possui `@ApiResponse()` para os códigos de erro (401, 403, 404, 409, 422), tornando a documentação incompleta para consumidores externos.

> **Ação sugerida:**
> 1. Adicionar `.addBearerAuth()` no `DocumentBuilder`.
> 2. Adicionar `@ApiResponse()` para os principais códigos de erro nos controllers.

### 2.9 Registro de intimação via WhatsApp sem campo dedicado no schema

**Impacto:** Baixo  
**Local:** `src/modules/witnesses/witnesses.service.ts`

O timestamp da intimação via WhatsApp é armazenado como texto no campo `notes` da testemunha. Não há campo estruturado (`whatsapp_sent_at`) no schema, dificultando consultas e relatórios por esse critério.

> **Ação sugerida:** Avaliar se campos estruturados para intimação (data/método/resultado) são necessários. Se sim, adicionar ao schema e criar nova migration.

### 2.10 Rota de health check está em `/` e não em `/health`

**Impacto:** Baixo  
**Local:** `src/app.controller.ts`

O contrato menciona `/health` como exceção pública. A rota pública atual é `/` (raiz). Não é um bug, mas o endpoint `/health` convencional é esperado por ferramentas de monitoramento (k8s readiness/liveness probes, etc.).

> **Ação sugerida:** Adicionar rota `/health` com `@Public()` ou renomear a rota existente.

---

## 3. O que está ausente

### 3.1 Provedor de E-mail real (Resend / SendGrid / Gmail API)

**Impacto:** Alto — bloqueia uso em produção  
**Status no CLAUDE.md:** Pendente de decisão

O `EmailService` usa exclusivamente `ConsoleEmailTransport`, que apenas loga no console. Nenhum provedor real está integrado. A arquitetura plugável já está pronta — basta implementar o transport correto.

> **O que falta:**
> - Implementar `ResendEmailTransport` ou `SendGridEmailTransport` que implemente a interface `EmailTransport`
> - Configurar a variável de ambiente `EMAIL_PROVIDER` para selecionar o transport
> - Adicionar as credenciais do provedor nas variáveis de ambiente

### 3.2 Lembrete de petição para desistência de testemunha

**Impacto:** Baixo  
**Status no CLAUDE.md:** Pendente de decisão ("Desistência de testemunha exige petição ao juízo?")

Quando uma testemunha entra em `desistida`, não há geração de lembrete ou tarefa de petição. O `CLAUDE.md` reconhece esta como decisão pendente.

> **O que falta:** Após fechamento da decisão de negócio, implementar a geração do lembrete (possivelmente um novo `deadline_type` ou notificação interna).

### 3.3 Alerta de `acknowledgment_date` pendente após X dias

**Impacto:** Médio  
**Status no CLAUDE.md:** Pendente de decisão ("sugestão: 7 úteis")

A tabela `emails` possui o campo `acknowledgment_date` (preenchimento manual da data de confirmação de recebimento). Não há job nem verificação que alerte quando esse campo permanece nulo por mais de N dias úteis após o envio.

> **O que falta:** Após fechamento do prazo (sugestão: 7 dias úteis), adicionar um passo no `JOB-PRAZOS` ou criar um job dedicado que identifique e-mails sem `acknowledgment_date` e gere notificação interna.

### 3.4 `ReportsModule` muito básico

**Impacto:** Médio  
**Local:** `src/modules/reports/`

O módulo de relatórios possui apenas um endpoint (`GET /reports/overview`) com 6 indicadores simples. O contrato menciona que o módulo "agrega dados dos demais módulos", mas não especifica quais outros relatórios são necessários.

> **O que falta (sugestões):**
> - Relatório de prazos vencidos/a vencer por processo
> - Relatório de audiências por período
> - Relatório de testemunhas por status
> - Relatório de e-mails sem `acknowledgment_date`

### 3.5 `HolidaysModule` sem `.module.ts` dedicado

**Impacto:** Baixo (arquitetural)  
**Local:** `src/modules/deadlines/deadlines.module.ts`

`HolidaysController`, `HolidaysRepository` e `HolidaysService` estão registrados dentro do `DeadlinesModule`. Não existe um `HolidaysModule` separado. Funciona, mas dificulta a reutilização independente e a organização modular.

---

## 4. Decisões pendentes do CLAUDE.md que impactam o desenvolvimento

| Decisão | Impacto se não fechada | Situação atual |
|---------|------------------------|----------------|
| Canal de notificação interna (badge no frontend vs e-mail) | A implementação atual usa e-mail (E6); badge no frontend não existe | Decidido implicitamente como e-mail, mas não formalizado |
| Provedor SMTP (Resend / SendGrid / Gmail API) | API não envia e-mails reais em produção | Apenas console implementado |
| X dias sem `acknowledgment_date` para alerta | Nenhum alerta implementado | Sem implementação |
| Desistência de testemunha exige petição ao juízo? | Sem lembrete de petição | Sem implementação |

---

## 5. Estado dos Testes

### 5.1 Testes Unitários (Jest)

```
Test Suites: 14 passed, 14 total
Tests:       52 passed, 52 total
Snapshots:   0 total
Time:        ~1.7s
```

Todos os testes passam sem falhas. A cobertura abrange os principais fluxos de negócio.

### 5.2 Testes E2E

O arquivo `test/app.e2e-spec.ts` existe e contém testes de integração com banco real, cobrindo:
- Health check (`GET /`)
- Controle de acesso para rotas protegidas
- Rotas públicas de autenticação (`/auth/sign-in/email`)
- CRUD de clientes
- CRUD de usuários (com superadmin)
- `GET /reports/overview` (permissão `advogado`)
- Bloqueio de `GET /reports/overview` para `paralegal`

> **Nota:** Os testes E2E requerem banco de dados real configurado (`DATABASE_URL`).

### 5.3 Gaps de cobertura nos testes

- Repositórios não possuem testes (apenas services são testados com mocks)
- Fluxos de integração de prazos (criação → job → vencimento) sem teste E2E
- `AuditInterceptor` sem testes dedicados
- `DeadlineCalculatorService` com cobertura parcial (55 linhas testadas)

---

## 6. Estado do Swagger

| Item | Status |
|------|--------|
| UI acessível em `/docs` | ✅ |
| JSON em `/docs/json` | ✅ |
| YAML em `/docs/yaml` | ✅ |
| Tags por módulo (`@ApiTags`) | ✅ |
| Sumário dos endpoints (`@ApiOperation`) | ✅ |
| Autenticação Bearer configurada (`addBearerAuth()`) | ❌ Ausente |
| `@ApiResponse()` para erros (401, 403, 404, etc.) | ❌ Majoritariamente ausente |
| `@ApiProperty()` nos DTOs | ⚠️ Parcial — usa `createZodDto` sem decorators Swagger |
| Exemplos de request/response | ❌ Ausente |

> **Consequência prática:** O botão "Authorize" na UI do Swagger não conecta ao fluxo Bearer. Desenvolvedores precisam adicionar o token manualmente nos headers via `curl` ou cliente HTTP externo.

---

## 7. Checklist de Conformidade com o CLAUDE.md

### Gates (regras absolutas)

| Gate | Status |
|------|--------|
| GATE-1: CPF/docs banidos do schema | ✅ |
| GATE-2: Limite JEC=4, CVC=10, bloqueio hard no service | ✅ |
| GATE-3: audit_logs append-only | ✅ |
| GATE-4: `replaced=true` bloqueia novo deadline | ✅ |
| GATE-4: `substituida` é estado terminal | ✅ |
| GATE-5: superadmin indeletável | ✅ |
| GATE-6: schema como fonte única | ✅ (com ressalvas em tipos auxiliares) |

### Arquitetura de camadas

| Camada | Status |
|--------|--------|
| Guard → Pipe → Controller → Service → Repository | ✅ |
| Controllers sem lógica de negócio | ✅ |
| Services sem acesso direto ao Drizzle (domínio) | ✅ |
| `AuditInterceptor` e `auth.ts` acessam `db` diretamente | ⚠️ Desvio aceitável |
| Repositories sem lógica de negócio | ✅ |
| Response envelope `{data, meta?}` | ✅ |

### Fluxos de negócio obrigatórios

| Fluxo | Status |
|-------|--------|
| Testemunha com dados completos | ✅ |
| Testemunha com dados incompletos → prazo + E1 | ✅ |
| `mentions_witness=false` → não aciona módulo | ⚠️ Parcial (sem bloqueio hard no create) |
| Substituição de testemunha em transação | ✅ |
| Desistência de testemunha + cancelamento de prazos | ✅ |
| Desistência → lembrete de petição | ❌ Pendente de decisão |
| Intimação com 5 métodos | ✅ |
| Resultado positivo → `JUNTADA_INTIMACAO` | ✅ |
| Resultado negativo → `PROVIDENCIA_CLIENTE` + E3 | ✅ |
| Cancelamento de audiência → cascata + E4 | ✅ |
| Redesignação → cancela + recria prazos + E5 + alerta 30 dias | ✅ |
| Motor de dias úteis (nacionais + estaduais + municipais) | ✅ |

---

## 8. Próximos Passos Recomendados (por prioridade)

### 🔴 Alta prioridade (bloqueia produção)

1. **Integrar provedor de e-mail real** — Implementar `ResendEmailTransport` ou equivalente; configurar `EMAIL_PROVIDER` no ambiente. ok
2. **Adicionar `addBearerAuth()` no Swagger** — Sem isso, a UI do Swagger não serve para testar endpoints autenticados. ok

### 🟡 Média prioridade (qualidade e conformidade)

3. **Capturar `previousData` no `AuditInterceptor`** — Necessário para auditoria completa de mudanças. ok
   - 🛠 Skills: `nestjs-expert` · `backend-dev-guidelines` · `audit-context-building`

4. **Bloquear criação de testemunha quando `mentions_witness=false`** — Completar a regra de negócio faltante. ok
   - 🛠 Skills: `nestjs-expert` · `backend-development-feature-development` · `tdd-workflow`

5. **Renomear `src/modules/holydays/` para `src/modules/holidays/`** — Corrigir o typo e alinhar à nomenclatura do projeto. ok

6. **Habilitar `noImplicitAny: true` no TypeScript** — Aumentar a segurança de tipos. ok
   - 🛠 Skills: `typescript-expert` · `typescript-pro` · `codebase-cleanup-tech-debt`

7. **Adicionar `@ApiResponse()` nos controllers** — Completar a documentação Swagger para consumidores externos. ok
   - 🛠 Skills: `api-documentation` · `api-documenter` · `openapi-spec-generation` · `nestjs-expert`

### 🟢 Baixa prioridade (melhorias incrementais)

8. **Implementar alerta de `acknowledgment_date` pendente** — Após fechamento da decisão de negócio (sugestão: 7 dias úteis). ok
   - 🛠 Skills: `nestjs-expert` · `backend-development-feature-development` · `drizzle-orm-expert`

10. **Expandir `ReportsModule`** — Novos relatórios conforme necessidade do cliente. ok
    - 🛠 Skills: `nestjs-expert` · `drizzle-orm-expert` · `postgres-best-practices` · `postgresql-optimization`

11. **Remover ou popular `src/infra/feriados/`** — Limpeza estrutural. ok
    - 🛠 Skills: `codebase-cleanup-deps-audit` · `codebase-cleanup-refactor-clean`

12. **Adicionar rota `/health` dedicada** — Para compatibilidade com ferramentas de monitoramento. ok
    - 🛠 Skills: `nestjs-expert` · `backend-dev-guidelines` · `api-patterns`

13. **Ampliar testes E2E** — Cobrir fluxos de witnesses, hearings, deadlines e jobs. ok
    - 🛠 Skills: `e2e-testing` · `e2e-testing-patterns` · `tdd-workflow` · `tdd-orchestrator`

---

## 9. Resumo Visual

```
IMPLEMENTADO       ████████████████████████████████  ~75%
PARCIAL/DIVERGENTE ███████                           ~18%
AUSENTE            ██                                 ~7%
```

O projeto está sólido para um ambiente de desenvolvimento e testes. As lacunas críticas para produção se resumem principalmente à integração de e-mail real e à completude da documentação Swagger. Todas as regras de negócio críticas (Gates) estão implementadas e testadas.
