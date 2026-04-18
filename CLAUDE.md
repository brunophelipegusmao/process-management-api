# GESTAO-PROCESSUAL-API | lang:pt-BR | for-AI-parsing | optimize=compliance-over-brevity

<!-- Leia este arquivo inteiro antes de escrever qualquer linha de código -->

<skills label="carregar antes de codar — ordem importa">

SKILL-LOAD-ORDER:

1. nestjs-expert → .cursor/skills/nestjs-expert/SKILL.md
2. drizzle-orm-expert → .cursor/skills/drizzle-orm-expert/SKILL.md
3. postgres-best-practices → .cursor/skills/postgres-best-practices/SKILL.md
4. zod-validation-expert → .cursor/skills/zod-validation-expert/SKILL.md
5. backend-dev-guidelines → .cursor/skills/backend-dev-guidelines/SKILL.md
6. api-patterns → .cursor/skills/api-patterns/SKILL.md
7. typescript-expert → .cursor/skills/typescript-expert/SKILL.md
8. systematic-debugging → .cursor/skills/systematic-debugging/SKILL.md

on-demand:
auth-implementation-patterns → carregar quando trabalhar em src/modules/auth/
postgresql-optimization → carregar quando otimizar queries ou criar índices
database-migrations-sql-migrations → carregar quando criar ou alterar migrations
tdd-workflow → carregar quando escrever testes

</skills>

<stack>
runtime:    Node.js 20+ | TypeScript strict
framework:  NestJS com adapter Fastify (não Express)
orm:        Drizzle ORM — nunca Prisma, nunca TypeORM
db:         PostgreSQL
validation: Zod — schema único compartilhado entre camadas
auth:       BetterAuth
transport:  REST JSON — sem GraphQL, sem tRPC
jobs:       cron nativo NestJS (@nestjs/schedule) — sem BullMQ nesta fase
email:      infra/email/ — provedor a definir (Resend | SendGrid | Gmail API)
</stack>

<structure>
gestao-processual-api/
  src/
    modules/
      processes/       → ProcessesModule
      hearings/        → HearingsModule
      witnesses/       → WitnessesModule
      deadlines/       → DeadlinesModule
      clients/         → ClientsModule
      users/           → UsersModule
      reports/         → ReportsModule
    infra/
      email/           → EmailService (provedor plugável)
      feriados/        → FeriadosService (Brasil API)
    schema/            → Drizzle schemas (única fonte de verdade do DB)
    jobs/              → CronJobs (JOB-PRAZOS + JOB-FERIADOS)
    common/
      guards/          → AuthGuard | RolesGuard
      decorators/      → @CurrentUser() | @Roles()
      pipes/           → ZodValidationPipe
      filters/         → GlobalExceptionFilter
      interceptors/    → AuditInterceptor
  migrations/          → Drizzle Kit migrations
  drizzle.config.ts
</structure>

<gates label="regras absolutas — verificar ANTES de qualquer código">

GATE-1 CPF/DOCS:
rule: CPF, RG, CNH e qualquer documento de identidade NUNCA entram no banco
scope: tabela witnesses e qualquer DTO relacionado
action: recusar campo | retornar erro 400 se recebido no payload
violation: remover imediatamente se encontrado em qualquer schema ou DTO

GATE-2 LIMITE-TESTEMUNHAS:
rule: bloqueio hard na camada de serviço — não alerta, não aviso
vara-comum (CPC): max=10 — contagem exclui replaced=true e status=desistida
jec (Lei 9.099): max=4 — idem
trigger: TestemunhasService.create() ANTES do INSERT
action: lançar ConflictException com { vagas_restantes: N }
banned: nunca delegar esta validação para o controller ou para o banco

GATE-3 AUDIT-IMMUTABLE:
rule: audit_logs é append-only — nunca UPDATE, nunca DELETE
scope: AuditInterceptor + qualquer código que toque audit_logs
action: apenas db.insert(auditLogs).values({...})
violation: qualquer update/delete em audit_logs = bug crítico

GATE-4 WITNESS-REPLACED:
rule: testemunha com replaced=true não pode receber novo deadline
rule: status='substituida' é estado terminal — sem transição de saída
trigger: DeadlinesService.create() verificar replaced antes do INSERT
action: lançar UnprocessableEntityException se replaced=true

GATE-5 SUPERADMIN:
rule: profile='superadmin' — conta única, não pode ser deletada pela API
action: UsuariosService.remove() deve rejeitar se profile='superadmin'
allowed: apenas active=false via operação direta no banco (fora da API)

GATE-6 SCHEMA-FONTE-UNICA:
rule: src/schema/ é a única fonte de verdade — DTOs derivam dos schemas Zod
banned: nunca duplicar tipos manualmente fora do schema
pattern: inferir tipos com z.infer<typeof schema>

</gates>

<architecture label="camadas obrigatórias — nunca pular">

LAYER-ORDER:
request → Guard → Pipe → Controller → Service → Repository → Drizzle → PostgreSQL
response ← Controller ← Service ← Repository ← Drizzle

CONTROLLER:
responsibility: receber HTTP, validar via ZodValidationPipe, delegar ao Service
banned: lógica de negócio, acesso direto ao banco, regras de domínio
pattern: sempre retornar { data, meta? } — nunca retornar entidade raw

SERVICE:
responsibility: lógica de negócio, orquestração, validação de regras de domínio
banned: acesso direto ao Drizzle — sempre via Repository
pattern: lançar exceções NestJS tipadas (NotFoundException, ConflictException, etc.)

REPOSITORY:
responsibility: acesso ao banco via Drizzle — queries, joins, transações
banned: lógica de negócio
pattern: métodos nomeados por intenção: findByProcessId(), createWithDeadline()

SHARED-ZOD-SCHEMAS:
location: src/schema/zod/ — schemas exportados e reutilizáveis
pattern: CreateWitnessSchema, UpdateHearingSchema, etc.
use: ZodValidationPipe no controller + inferência de tipo no service

</architecture>

<patterns label="padrões de código obrigatórios">

NESTJS-FASTIFY:
bootstrap: NestFactory.create(AppModule, new FastifyAdapter())
cors: configurar via FastifyAdapter options
validation: ZodValidationPipe global — nunca class-validator

AUTH:
provider: BetterAuth
guard: AuthGuard em todos os endpoints — exceção: /health, /auth/login
roles: @Roles('superadmin' | 'advogado' | 'paralegal') + RolesGuard
current-user: @CurrentUser() decorator injetando o usuário do request

AUDIT:
trigger: AuditInterceptor captura toda mutação (POST/PATCH/DELETE)
fields: user_id | action_type | process_id | previous_data | new_data
pattern: interceptor grava APÓS a resposta bem-sucedida do service

DRIZZLE:
connection: pool via postgres.js — nunca conexão direta
transactions: db.transaction(async (tx) => {...}) para operações multi-tabela
migrations: drizzle-kit generate + drizzle-kit migrate — nunca DDL manual
types: inferir com InferSelectModel<typeof table>

ZOD:
pipe: ZodValidationPipe(schema) por endpoint ou global
error: formatar erros Zod → { field, message }[] antes de retornar 400
share: mesmo schema pode ser importado pelo frontend — manter em src/schema/zod/

RESPONSE-FORMAT:
success: { data: T, meta?: { total, page, ... } }
error: { error: string, details?: any } via GlobalExceptionFilter
never: retornar entidade raw sem envelopar

ERROR-HANDLING:
service: lançar exceção NestJS tipada
filter: GlobalExceptionFilter mapeia para HTTP correto
log: registrar stack em dev, mensagem limpa em prod

</patterns>

<rules label="regras de negócio — implementar exatamente como descrito">

TESTEMUNHA-CADASTRO:
dados-completos: full_name + address preenchidos → OK, sem ação adicional
dados-incompletos: gerar deadline DADOS_TESTEMUNHA (5 dias úteis) + disparar E1
sem-testemunha: mentions_witness=false → não acionar módulo de testemunhas

TESTEMUNHA-SUBSTITUICAO:
timing: permitida a qualquer tempo — sem checar status atual
steps: 1. inativar original: replaced=true | status=substituida | replaced_by_id=nova_id 2. cancelar todos deadlines ativos da original: status=cancelado 3. criar substituta como nova entidade (não conta para o limite)
transacao: toda a operação em db.transaction()

TESTEMUNHA-DESISTENCIA:
steps: 1. status → desistida 2. cancelar todos deadlines ativos: status=cancelado
pendente: se desistência exige petição → gerar lembrete (aguardar decisão)

INTIMACAO:
mesma-comarca: método=carta_simples | custas=false | gerar JUNTADA_INTIMACAO
comarca-diversa-precatoria: método=carta_precatoria | custas=true | gerar CUSTAS_PRECATORIA
comarca-diversa-passiva: método=sala_passiva | custas=false | apenas petição
oficial-justica: método=mandado | custas=true
whatsapp: método=whatsapp | custas=true | registrar data/hora

resultado-positivo: criar deadline JUNTADA_INTIMACAO = audiência - 5 dias úteis
resultado-negativo: disparar E3 + criar deadline PROVIDENCIA_CLIENTE (3 dias úteis)

AUDIENCIA-CANCELAMENTO:

1. hearing.status → cancelada
2. todos deadlines do processo → status=cancelado
3. disparar E4

AUDIENCIA-REDESIGNACAO:

1. hearing.status → redesignada | rescheduled_to = nova_data
2. todos deadlines vinculados → status=cancelado
3. disparar E5
4. gerar novos deadlines com base na nova data
5. se delta > 30 dias E testemunhas já intimadas → notificação interna

PRAZOS:
DADOS_TESTEMUNHA: 5 dias úteis | notif = dia seguinte ao vencimento
CUSTAS_PRECATORIA: 5 dias corridos | notif = no vencimento
JUNTADA_INTIMACAO: audiência - 5 dias úteis | notif = ao atingir a data
DESISTENCIA_TESTEMUNHA: audiência - 5 dias úteis | notif = ao atingir a data
PROVIDENCIA_CLIENTE: 3 dias úteis | notif = vencimento sem resposta → escalada

DIAS-UTEIS:
motor: filtrar feriados nacionais + estaduais da UF + municipais da comarca do processo
fonte: tabela holidays — source=manual sobrepõe source=auto para mesma data

</rules>

<jobs label="cron jobs — src/jobs/">

JOB-PRAZOS:
schedule: 07h00 diário (cron: '0 7 \* \* \*')
passo-1: SELECT deadlines WHERE status=aberto AND due_date <= hoje
→ UPDATE status=vencido + gerar notificação interna
passo-2: SELECT deadlines WHERE due_date = amanhã
→ gerar alerta preventivo
passo-3: SELECT JUNTADA_INTIMACAO onde (data_audiencia - 5úteis) = hoje
→ notificar
passo-4: INSERT audit_logs (action_type=JOB_PRAZOS)
tx: cada passo em transação própria — falha isolada não cancela os demais

JOB-FERIADOS:
schedule: mensal (cron: '0 6 1 \* \*')
action: GET brasilapi.com.br/api/feriados/v1/{ano} para ano corrente e seguinte
upsert: source=auto — não sobrescrever source=manual na mesma data

</jobs>

<modules label="responsabilidade de cada módulo">

ProcessesModule:
entidades: Process
regras: CNJ único | client_side default=reu | status machine

HearingsModule:
entidades: Hearing
regras: tipos AIJ/oitiva/ACIJ ativam testemunhas | conciliacao não
dep: WitnessesModule | DeadlinesModule | EmailService

WitnessesModule:
entidades: Witness
regras: GATE-1 | GATE-2 | GATE-4 | substituição | desistência | intimação
dep: DeadlinesModule | EmailService

DeadlinesModule:
entidades: Deadline
regras: motor dias úteis | tipos e prazos conforme <rules>
dep: HolidaysService

ClientsModule:
entidades: Client
regras: email único por cliente

UsersModule:
entidades: User
regras: GATE-5 | perfis: superadmin | advogado | paralegal

ReportsModule:
sem entidade própria — agrega dados dos demais módulos
acesso: apenas perfil advogado | superadmin

</modules>

<entities label="schema Drizzle — única fonte de verdade | src/schema/">

ENUMS:
court_type: vara | jec
client_side: reu | autor
process_status: citado | em_andamento | encerrado
hearing_type: conciliacao | aij | oitiva | acij
hearing_status: agendada | realizada | cancelada | redesignada
witness_status: pendente_dados | dados_completos | rol_juntado | intimada | intimacao_positiva | intimacao_negativa | aguardando_cliente | desistida | substituida
witness_side: reu | autor (default=reu)
deadline_type: dados_testemunha | custas_precatoria | juntada_intimacao | desistencia_testemunha | providencia_cliente
deadline_status: aberto | cumprido | vencido | cancelado
holiday_type: nacional | estadual | municipal
holiday_source: auto | manual
email_template: E1 | E2 | E3 | E4 | E5 | E6
user_profile: superadmin | advogado | paralegal
action_type: CREATE_PROCESS | UPDATE_PROCESS | DELETE_PROCESS | CREATE_HEARING | UPDATE_HEARING | CANCEL_HEARING | RESCHEDULE_HEARING | CREATE_WITNESS | UPDATE_WITNESS | REPLACE_WITNESS | RETIRE_WITNESS | CREATE_DEADLINE | UPDATE_DEADLINE | CANCEL_DEADLINE | SEND_EMAIL | ACK_EMAIL | FULFILL_EMAIL | CREATE_USER | UPDATE_USER | JOB_PRAZOS

TABLES:
users:
pk: id (uuid, defaultRandom)
cols: name (text) | email (text, unique) | password_hash (text) | profile (user_profile, default=advogado) | active (bool, default=true) | created_at (timestamp, defaultNow)
constraint: apenas 1 registro com profile=superadmin

clients:
pk: id (uuid, defaultRandom)
cols: name (text) | email (text) | phone (text, null) | type (pf|pj) | created_at (timestamp, defaultNow)
note: email = destino exclusivo de todos os disparos automáticos

processes:
pk: id (uuid, defaultRandom)
fk: client_id → clients.id (onDelete=restrict)
cols: cnj_number (text, unique) | comarca (text) | vara (text) | court_type (enum) | author_name (text) | defendant_name (text) | client_side (client_side, default=reu) | status (process_status, default=citado) | citation_date (date, null) | mentions_witness (bool, default=false) | created_at | updated_at

hearings:
pk: id (uuid, defaultRandom)
fk: process_id → processes.id (onDelete=cascade)
cols: date_time (timestamp) | type (hearing_type) | status (hearing_status, default=agendada) | rescheduled_to (timestamp, null) | created_at | updated_at
rule: tipos aij | oitiva | acij → ativar módulo testemunhas | conciliacao → não

witnesses:
pk: id (uuid, defaultRandom)
fk: process_id → processes.id (onDelete=restrict)
fk: replaced_by_id → witnesses.id (self-ref, null)
cols:
required: full_name (text) | address (text) | residence_comarca (text)
optional: marital_status (text, null) | profession (text, null) | phone (text, null) | notes (text, null)
control: side (witness_side, default=reu) | status (witness_status, default=pendente_dados) | replaced (bool, default=false)
timestamps: created_at | updated_at
banned-cols: cpf | rg | qualquer documento de identidade

deadlines:
pk: id (uuid, defaultRandom)
fk: process_id → processes.id (onDelete=restrict)
fk: witness_id → witnesses.id (null, onDelete=set null)
cols: type (deadline_type) | due_date (date) | status (deadline_status, default=aberto) | notification_sent (bool, default=false) | created_at | updated_at

holidays:
pk: id (uuid, defaultRandom)
cols: date (date) | name (text) | type (holiday_type) | state (text, null) | municipality (text, null) | source (holiday_source) | created_at
rule: source=manual sobrepõe source=auto para mesma date

emails:
pk: id (uuid, defaultRandom)
fk: process_id → processes.id (onDelete=restrict)
cols: template (email_template) | recipient (text) | sent_at (timestamp, defaultNow) | replied_at (timestamp, null) | acknowledgment_date (date, null) | fulfilled_at (date, null)
note: acknowledgment_date = preenchimento manual | sem rastreamento de abertura

audit_logs:
pk: id (uuid, defaultRandom)
fk: process_id → processes.id (null — ações de sistema não têm processo)
fk: user_id → users.id (onDelete=restrict)
cols: created_at (timestamp, defaultNow) | action_type (action_type) | description (text) | previous_data (jsonb, null) | new_data (jsonb, null)
constraint: APPEND-ONLY — sem UPDATE, sem DELETE, sem softDelete

</entities>

<decisions label="não reabrir — já decidido">

confirmed:

- Fastify adapter (não Express)
- Drizzle ORM (não Prisma, não TypeORM)
- Zod para validação (não class-validator)
- BetterAuth para autenticação
- audit_logs imutável
- CPF/docs de identidade banidos do schema de testemunhas
- Limite JEC=4, CPC=10 — bloqueio hard no service
- Substituição não conta para o limite
- Superadmin único e indeletável pela API

pending:

- Canal notificação interna: badge no frontend vs e-mail ao advogado
- Provedor SMTP: Resend | SendGrid | Gmail API
- Parâmetro X dias sem acknowledgment_date para alerta de pendência (sugestão: 7 úteis)
- Desistência de testemunha exige petição ao juízo?

</decisions>

<workflow label="sequência de desenvolvimento recomendada">

fase-1 FUNDAÇÃO:

1. bootstrap NestJS + Fastify
2. configurar Drizzle + PostgreSQL + drizzle.config.ts
3. escrever src/schema/ completo (todos os enums e tabelas)
4. rodar primeira migration
5. configurar BetterAuth + AuthGuard + RolesGuard
6. ZodValidationPipe global + GlobalExceptionFilter + AuditInterceptor

fase-2 DOMÍNIO (ordem por dependência):

1. ClientsModule (sem dependências)
2. UsersModule (sem dependências)
3. ProcessesModule (depende de Clients)
4. DeadlinesModule + HolidaysService (motor dias úteis)
5. WitnessesModule (depende de Deadlines)
6. HearingsModule (depende de Witnesses + Deadlines)

fase-3 INFRAESTRUTURA:

1. EmailService + templates E1-E6
2. FeriadosService + JOB-FERIADOS
3. JOB-PRAZOS

fase-4 RELATÓRIOS:

1. ReportsModule (agrega tudo acima)

</workflow>
