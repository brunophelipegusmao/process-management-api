# Process Management API

> REST API for Brazilian civil litigation management — process tracking, witness control, hearing lifecycle, smart deadline engine, SMTP notifications, and immutable audit logs.

---

## English

### Overview

**Process Management API** is a backend service built for Brazilian law firms to manage civil litigation processes end-to-end. It covers the full lifecycle of a case: from initial process registration and hearing scheduling through witness management, automated deadline calculation (business days minus public holidays), email notifications, and immutable audit trails.

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict) |
| Framework | NestJS with Fastify adapter |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Validation | Zod |
| Authentication | BetterAuth |
| Email | Nodemailer (SMTP) |
| Documentation | Swagger / OpenAPI |
| Testing | Jest (unit + E2E) |

### Architecture

```
Request → Guard → Pipe → Controller → Service → Repository → Drizzle → PostgreSQL
```

- **Controller** — receives HTTP, validates via `ZodValidationPipe`, delegates to Service
- **Service** — business logic, domain rules, orchestration
- **Repository** — Drizzle ORM queries, joins, transactions
- **Schema** (`src/schema/`) — single source of truth for all DB types

All responses follow the envelope format: `{ data: T, meta?: { total, page, pageSize } }`.

### Project Structure

```
src/
├── modules/
│   ├── processes/       # ProcessesModule
│   ├── hearings/        # HearingsModule
│   ├── witnesses/       # WitnessesModule
│   ├── deadlines/       # DeadlinesModule
│   ├── clients/         # ClientsModule
│   ├── users/           # UsersModule
│   └── reports/         # ReportsModule
├── infra/
│   ├── email/           # SMTP transport + email service
│   └── database/        # PostgreSQL connection (postgres.js pool)
├── schema/              # Drizzle schemas (single source of truth)
├── jobs/                # Cron jobs (deadlines + holiday sync)
├── config/              # Environment config (app-env.ts)
└── common/
    ├── guards/          # AuthGuard, RolesGuard
    ├── decorators/      # @CurrentUser(), @Public(), @Roles()
    ├── pipes/           # ZodValidationPipe
    ├── filters/         # GlobalExceptionFilter
    └── interceptors/    # AuditInterceptor, ResponseEnvelopeInterceptor
```

### Business Rules

#### Business Gates (hard blocks)

| Gate | Rule |
|---|---|
| **GATE-1** | CPF, RG, CNH and any identity document are **never** stored — 400 if received in payload |
| **GATE-2** | Witness hard limit: **JEC (Lei 9.099) = 4** / **CPC (vara comum) = 10** — replaced and withdrawn witnesses do not count |
| **GATE-3** | `audit_logs` is **append-only** — no UPDATE, no DELETE, ever |
| **GATE-4** | A witness with `replaced=true` cannot receive new deadlines — 422 |
| **GATE-5** | The `superadmin` profile cannot be deleted via API |

#### Witness Lifecycle

- **Incomplete data** (no address) → auto-generates `DADOS_TESTEMUNHA` deadline (5 business days)
- **Substitution** → original marked `replaced=true / status=substituida`, all active deadlines cancelled; replacement is a new entity (does not count toward limit)
- **Withdrawal** → `status=desistida`, all active deadlines cancelled
- **Summons** — supports: `carta_simples`, `carta_precatoria`, `sala_passiva`, `mandado`, `whatsapp`

#### Hearing Lifecycle

- **Cancel** → `status=cancelada`, all process deadlines cancelled, email E4 sent
- **Reschedule** → `status=redesignada`, deadlines rebuilt from new date, email E5 sent; if Δ > 30 days and witnesses already summoned → internal alert

#### Deadline Engine

Business-day calculation filters national, state, and municipal holidays from the `holidays` table. Source `manual` overrides `auto` for the same date.

| Type | Rule | Notification |
|---|---|---|
| `dados_testemunha` | 5 business days | Day after due |
| `custas_precatoria` | 5 calendar days | On due date |
| `juntada_intimacao` | Hearing − 5 business days | On trigger date |
| `desistencia_testemunha` | Hearing − 5 business days | On trigger date |
| `providencia_cliente` | 3 business days | On due date |

### Cron Jobs

| Job | Schedule | Actions |
|---|---|---|
| **DeadlinesJob** | 07:00 daily | Mark overdue; preventive alerts; hearing-based alerts; pending acknowledgment alerts (7 days) |
| **HolidaySyncJob** | 06:00 first of month | Sync national holidays from BrasilAPI for current and next year |

### Authentication & Authorization

BetterAuth handles session management. Every endpoint is protected by `AuthGuard` except `/health` and `/auth/*`.

| Profile | Access |
|---|---|
| `superadmin` | Full access |
| `advogado` | Full access including reports |
| `paralegal` | Processes, hearings, witnesses, deadlines (no reports, no users) |

### Getting Started

#### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- pnpm

#### Environment Variables

```env
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
PORT=3000

# Email
EMAIL_PROVIDER=smtp        # smtp | console
EMAIL_FROM=you@domain.com
SMTP_HOST=smtp.host.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@domain.com
SMTP_PASS=your_password

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# BetterAuth
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:3333
```

#### Installation & Running

```bash
pnpm install

# Run migrations
pnpm db:migrate

# Development
pnpm start:dev

# Production
pnpm build && pnpm start:prod
```

#### Testing

```bash
# Unit tests
pnpm test

# E2E tests (requires running PostgreSQL)
pnpm test:e2e
```

#### API Documentation

Swagger UI is available at `http://localhost:3333/docs` when the server is running. Use the **Authorize** button to set your Bearer token.

### API Endpoints Summary

| Module | Endpoints |
|---|---|
| **Clients** | `GET/POST /clients` · `GET/PATCH/DELETE /clients/:id` |
| **Users** | `GET/POST /users` · `GET/PATCH/DELETE /users/:id` |
| **Processes** | `GET/POST /processes` · `GET/PATCH/DELETE /processes/:id` |
| **Hearings** | `GET/POST /hearings` · `GET/PATCH /hearings/:id` · `POST /hearings/:id/reschedule` · `DELETE /hearings/:id` |
| **Witnesses** | `GET/POST /witnesses` · `GET/PATCH/DELETE /witnesses/:id` · `POST /witnesses/:id/replace` · `POST /witnesses/:id/intimation` · `POST /witnesses/:id/intimation/outcome` |
| **Deadlines** | `GET/POST /deadlines` · `GET/PATCH/DELETE /deadlines/:id` |
| **Holidays** | `GET/POST /holidays` · `GET/PATCH/DELETE /holidays/:id` |
| **Reports** | `GET /reports/overview` · `GET /reports/deadlines-by-status` · `GET /reports/witnesses-by-status` · `GET /reports/upcoming-hearings` |
| **Health** | `GET /health` (public) |

---

---

## Português

### Visão Geral

**Process Management API** é um serviço backend construído para escritórios de advocacia brasileiros gerenciarem processos cíveis de ponta a ponta. Cobre o ciclo completo de um processo: do cadastro inicial e agendamento de audiências até o controle de testemunhas, cálculo automático de prazos em dias úteis (com feriados nacionais, estaduais e municipais), notificações por e-mail e trilha de auditoria imutável.

### Stack Técnica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20+ |
| Linguagem | TypeScript (strict) |
| Framework | NestJS com adapter Fastify |
| ORM | Drizzle ORM |
| Banco de dados | PostgreSQL |
| Validação | Zod |
| Autenticação | BetterAuth |
| E-mail | Nodemailer (SMTP) |
| Documentação | Swagger / OpenAPI |
| Testes | Jest (unitários + E2E) |

### Arquitetura

```
Request → Guard → Pipe → Controller → Service → Repository → Drizzle → PostgreSQL
```

- **Controller** — recebe HTTP, valida via `ZodValidationPipe`, delega ao Service
- **Service** — lógica de negócio, regras de domínio, orquestração
- **Repository** — queries Drizzle ORM, joins, transações
- **Schema** (`src/schema/`) — única fonte de verdade de todos os tipos do banco

Todas as respostas seguem o envelope: `{ data: T, meta?: { total, page, pageSize } }`.

### Estrutura do Projeto

```
src/
├── modules/
│   ├── processes/       # ProcessesModule
│   ├── hearings/        # HearingsModule
│   ├── witnesses/       # WitnessesModule
│   ├── deadlines/       # DeadlinesModule
│   ├── clients/         # ClientsModule
│   ├── users/           # UsersModule
│   └── reports/         # ReportsModule
├── infra/
│   ├── email/           # Transporte SMTP + serviço de e-mail
│   └── database/        # Conexão PostgreSQL (pool postgres.js)
├── schema/              # Schemas Drizzle (fonte única de verdade)
├── jobs/                # Cron jobs (prazos + feriados)
├── config/              # Configuração de ambiente (app-env.ts)
└── common/
    ├── guards/          # AuthGuard, RolesGuard
    ├── decorators/      # @CurrentUser(), @Public(), @Roles()
    ├── pipes/           # ZodValidationPipe
    ├── filters/         # GlobalExceptionFilter
    └── interceptors/    # AuditInterceptor, ResponseEnvelopeInterceptor
```

### Regras de Negócio

#### Gates (bloqueios absolutos)

| Gate | Regra |
|---|---|
| **GATE-1** | CPF, RG, CNH e qualquer documento de identidade **nunca** são armazenados — 400 se recebidos |
| **GATE-2** | Limite hard de testemunhas: **JEC (Lei 9.099) = 4** / **CPC (vara comum) = 10** — substituídas e desistentes não contam |
| **GATE-3** | `audit_logs` é **append-only** — sem UPDATE, sem DELETE, jamais |
| **GATE-4** | Testemunha com `replaced=true` não pode receber novo prazo — 422 |
| **GATE-5** | O perfil `superadmin` não pode ser excluído via API |

#### Ciclo de Vida da Testemunha

- **Dados incompletos** (sem endereço) → gera prazo `DADOS_TESTEMUNHA` automático (5 dias úteis)
- **Substituição** → original marcada `replaced=true / status=substituida`, todos os prazos ativos cancelados; substituta é nova entidade (não conta no limite)
- **Desistência** → `status=desistida`, todos os prazos ativos cancelados
- **Intimação** — métodos: `carta_simples`, `carta_precatoria`, `sala_passiva`, `mandado`, `whatsapp`

#### Ciclo de Vida da Audiência

- **Cancelamento** → `status=cancelada`, todos os prazos do processo cancelados, e-mail E4 disparado
- **Redesignação** → `status=redesignada`, prazos recriados com base na nova data, e-mail E5 disparado; se Δ > 30 dias e testemunhas já intimadas → alerta interno

#### Motor de Prazos

O cálculo em dias úteis filtra feriados nacionais, estaduais e municipais da tabela `holidays`. Fonte `manual` sobrepõe `auto` para a mesma data.

| Tipo | Regra | Notificação |
|---|---|---|
| `dados_testemunha` | 5 dias úteis | Dia seguinte ao vencimento |
| `custas_precatoria` | 5 dias corridos | No vencimento |
| `juntada_intimacao` | Audiência − 5 dias úteis | Ao atingir a data |
| `desistencia_testemunha` | Audiência − 5 dias úteis | Ao atingir a data |
| `providencia_cliente` | 3 dias úteis | No vencimento |

### Cron Jobs

| Job | Agendamento | Ações |
|---|---|---|
| **DeadlinesJob** | 07h00 diário | Marcar vencidos; alertas preventivos; alertas por audiência; alertas de acknowledgment pendente (7 dias) |
| **HolidaySyncJob** | 06h00 dia 1 do mês | Sincroniza feriados nacionais da BrasilAPI para o ano atual e o seguinte |

### Autenticação e Autorização

O BetterAuth gerencia sessões. Todos os endpoints são protegidos pelo `AuthGuard`, exceto `/health` e `/auth/*`.

| Perfil | Acesso |
|---|---|
| `superadmin` | Acesso total |
| `advogado` | Acesso total incluindo relatórios |
| `paralegal` | Processos, audiências, testemunhas, prazos (sem relatórios, sem usuários) |

### Configuração e Execução

#### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- pnpm

#### Variáveis de Ambiente

```env
DATABASE_URL=postgres://usuario:senha@localhost:5432/banco
PORT=3000

# E-mail
EMAIL_PROVIDER=smtp        # smtp | console
EMAIL_FROM=voce@dominio.com
SMTP_HOST=smtp.host.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=voce@dominio.com
SMTP_PASS=sua_senha

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# BetterAuth
BETTER_AUTH_SECRET=seu_segredo
BETTER_AUTH_URL=http://localhost:3333
```

#### Instalação e Execução

```bash
pnpm install

# Executar migrations
pnpm db:migrate

# Desenvolvimento
pnpm start:dev

# Produção
pnpm build && pnpm start:prod
```

#### Testes

```bash
# Testes unitários
pnpm test

# Testes E2E (requer PostgreSQL em execução)
pnpm test:e2e
```

#### Documentação da API

A UI do Swagger está disponível em `http://localhost:3333/docs` com o servidor em execução. Use o botão **Authorize** para definir o Bearer token.

### Resumo dos Endpoints

| Módulo | Endpoints |
|---|---|
| **Clientes** | `GET/POST /clients` · `GET/PATCH/DELETE /clients/:id` |
| **Usuários** | `GET/POST /users` · `GET/PATCH/DELETE /users/:id` |
| **Processos** | `GET/POST /processes` · `GET/PATCH/DELETE /processes/:id` |
| **Audiências** | `GET/POST /hearings` · `GET/PATCH /hearings/:id` · `POST /hearings/:id/reschedule` · `DELETE /hearings/:id` |
| **Testemunhas** | `GET/POST /witnesses` · `GET/PATCH/DELETE /witnesses/:id` · `POST /witnesses/:id/replace` · `POST /witnesses/:id/intimation` · `POST /witnesses/:id/intimation/outcome` |
| **Prazos** | `GET/POST /deadlines` · `GET/PATCH/DELETE /deadlines/:id` |
| **Feriados** | `GET/POST /holidays` · `GET/PATCH/DELETE /holidays/:id` |
| **Relatórios** | `GET /reports/overview` · `GET /reports/deadlines-by-status` · `GET /reports/witnesses-by-status` · `GET /reports/upcoming-hearings` |
| **Health** | `GET /health` (público) |
