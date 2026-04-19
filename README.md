# Gestao Processual API

API REST em NestJS + Fastify para gestao processual civel com foco em audiencias, testemunhas, prazos, usuarios, clientes, relatorios e automacoes operacionais.

## Stack

- Node.js 20+
- NestJS com Fastify
- TypeScript strict
- Drizzle ORM + PostgreSQL
- Zod como fonte de validacao
- Better Auth para autenticacao
- Scheduler nativo do Nest para jobs recorrentes

## Modulos principais

- Auth: sessao, guardas e autorizacao por perfil
- Clients: cadastro e listagem de clientes
- Users: administracao de usuarios e perfis
- Processes: dados centrais do processo
- Deadlines: motor de prazos e utilitarios de vencimento
- Holydays: feriados nacionais, estaduais e municipais com precedencia manual
- Witnesses: cadastro, substituicao, desistencia e regras de limite
- Hearings: audiencia, cancelamento e redesignacao
- Reports: indicadores agregados restritos a advogado e superadmin
- Jobs: sincronizacao de feriados e processamento diario de prazos
- Infra email: envio plugavel com persistencia em tabela de emails

## Regras criticas

- CPF, RG, CNH e qualquer documento de identidade nao entram no schema de testemunhas
- O limite de testemunhas e imposto no service:
  - JEC: 4
  - Vara comum: 10
- Audit log e append-only: sem update e sem delete
- Testemunha substituida nao recebe novo prazo
- Usuario superadmin nao pode ser removido pela API
- Schemas de src/schema e src/schema/zod sao a fonte de verdade

## Jobs

### JOB-PRAZOS

- Cron: 0 7 \* \* \*
- Marca prazos abertos vencidos
- Gera alerta preventivo para prazos com vencimento no dia seguinte
- Marca notificacoes de JUNTADA_INTIMACAO no dia de disparo
- Registra auditoria com actionType JOB_PRAZOS

### JOB-FERIADOS

- Cron: 0 6 1 \* \*
- Consulta a BrasilAPI para o ano corrente e o seguinte
- Persiste feriados nacionais com source auto
- Reaproveita a regra existente que impede sobrescrever feriados manuais

## Email e templates

O projeto possui um EmailService plugavel com transporte padrao em console para ambiente local. Os templates E1-E6 ficam centralizados na camada de infraestrutura.

Templates atualmente integrados ao fluxo:

- E1: testemunha com dados pendentes
- E4: audiencia cancelada
- E5: audiencia redesignada

Os registros de envio sao persistidos na tabela emails.

## Variaveis de ambiente

Variaveis obrigatorias ou relevantes:

- PORT
- DATABASE_URL
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- BETTER_AUTH_BASE_PATH
- EMAIL_PROVIDER
- EMAIL_FROM

Exemplo minimo:

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/process_management
BETTER_AUTH_SECRET=um-segredo-longo
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_BASE_PATH=/auth
EMAIL_PROVIDER=console
EMAIL_FROM=nao-responda@gestaoprocessual.local
```

## Execucao local

Instalacao:

```bash
pnpm install
```

Desenvolvimento:

```bash
pnpm start:dev
```

Build:

```bash
pnpm build
```

## Testes

Unitarios:

```bash
pnpm test
```

E2E:

```bash
pnpm test:e2e
```

Cobertura:

```bash
pnpm test:cov
```

## Endpoints novos da fase 12

- GET /reports/overview

Resposta:

```json
{
  "data": {
    "processesTotal": 0,
    "hearingsScheduled": 0,
    "openDeadlines": 0,
    "overdueDeadlines": 0,
    "pendingWitnessData": 0,
    "emailsSent": 0
  }
}
```

Acesso permitido apenas para perfis advogado e superadmin.

## Estrutura relevante

```text
src/
  common/
  config/
  infra/
    database/
    email/
  jobs/
  modules/
    clients/
    deadlines/
    hearings/
    holydays/
    processes/
    reports/
    users/
    witnesses/
  schema/
```

## Observacoes operacionais

- O transporte de email atual e seguro para desenvolvimento porque nao depende de provedor externo
- Os jobs usam ScheduleModule.forRoot no AppModule
- Relatorios sao agregados por queries simples e podem ser expandidos sem mudar o contrato atual
- O canal de notificacao interna continua preparado para evolucao, enquanto os eventos de email essenciais ja foram conectados
