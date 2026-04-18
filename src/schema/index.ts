import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import {
  AnyPgColumn,
  boolean,
  date,
  jsonb,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const courtTypeValues = ['vara', 'jec'] as const;
export const clientTypeValues = ['pf', 'pj'] as const;
export const clientSideValues = ['reu', 'autor'] as const;
export const processStatusValues = [
  'citado',
  'em_andamento',
  'encerrado',
] as const;
export const hearingTypeValues = [
  'conciliacao',
  'aij',
  'oitiva',
  'acij',
] as const;
export const hearingStatusValues = [
  'agendada',
  'realizada',
  'cancelada',
  'redesignada',
] as const;
export const witnessStatusValues = [
  'pendente_dados',
  'dados_completos',
  'rol_juntado',
  'intimada',
  'intimacao_positiva',
  'intimacao_negativa',
  'aguardando_cliente',
  'desistida',
  'substituida',
] as const;
export const witnessSideValues = ['reu', 'autor'] as const;
export const deadlineTypeValues = [
  'dados_testemunha',
  'custas_precatoria',
  'juntada_intimacao',
  'desistencia_testemunha',
  'providencia_cliente',
] as const;
export const deadlineStatusValues = [
  'aberto',
  'cumprido',
  'vencido',
  'cancelado',
] as const;
export const holidayTypeValues = ['nacional', 'estadual', 'municipal'] as const;
export const holidaySourceValues = ['auto', 'manual'] as const;
export const emailTemplateValues = [
  'E1',
  'E2',
  'E3',
  'E4',
  'E5',
  'E6',
] as const;
export const userProfileValues = [
  'superadmin',
  'advogado',
  'paralegal',
] as const;
export const actionTypeValues = [
  'CREATE_PROCESS',
  'UPDATE_PROCESS',
  'DELETE_PROCESS',
  'CREATE_HEARING',
  'UPDATE_HEARING',
  'CANCEL_HEARING',
  'RESCHEDULE_HEARING',
  'CREATE_WITNESS',
  'UPDATE_WITNESS',
  'REPLACE_WITNESS',
  'RETIRE_WITNESS',
  'CREATE_DEADLINE',
  'UPDATE_DEADLINE',
  'CANCEL_DEADLINE',
  'SEND_EMAIL',
  'ACK_EMAIL',
  'FULFILL_EMAIL',
  'CREATE_USER',
  'UPDATE_USER',
  'JOB_PRAZOS',
] as const;

export const courtTypeEnum = pgEnum('court_type', courtTypeValues);
export const clientTypeEnum = pgEnum('client_type', clientTypeValues);
export const clientSideEnum = pgEnum('client_side', clientSideValues);
export const processStatusEnum = pgEnum('process_status', processStatusValues);
export const hearingTypeEnum = pgEnum('hearing_type', hearingTypeValues);
export const hearingStatusEnum = pgEnum('hearing_status', hearingStatusValues);
export const witnessStatusEnum = pgEnum('witness_status', witnessStatusValues);
export const witnessSideEnum = pgEnum('witness_side', witnessSideValues);
export const deadlineTypeEnum = pgEnum('deadline_type', deadlineTypeValues);
export const deadlineStatusEnum = pgEnum(
  'deadline_status',
  deadlineStatusValues,
);
export const holidayTypeEnum = pgEnum('holiday_type', holidayTypeValues);
export const holidaySourceEnum = pgEnum('holiday_source', holidaySourceValues);
export const emailTemplateEnum = pgEnum('email_template', emailTemplateValues);
export const userProfileEnum = pgEnum('user_profile', userProfileValues);
export const actionTypeEnum = pgEnum('action_type', actionTypeValues);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    profile: userProfileEnum('profile').default('advogado').notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_single_superadmin_idx')
      .on(table.profile)
      .where(sql`${table.profile} = 'superadmin'`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sessions_token_idx').on(table.token),
    index('sessions_user_id_idx').on(table.userId),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('accounts_provider_account_idx').on(
      table.providerId,
      table.accountId,
    ),
    index('accounts_user_id_idx').on(table.userId),
  ],
);

export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('verifications_identifier_value_idx').on(
      table.identifier,
      table.value,
    ),
  ],
);

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  type: clientTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const processes = pgTable('processes', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  cnjNumber: text('cnj_number').notNull().unique(),
  comarca: text('comarca').notNull(),
  vara: text('vara').notNull(),
  courtType: courtTypeEnum('court_type').notNull(),
  authorName: text('author_name').notNull(),
  defendantName: text('defendant_name').notNull(),
  clientSide: clientSideEnum('client_side').default('reu').notNull(),
  status: processStatusEnum('status').default('citado').notNull(),
  citationDate: date('citation_date'),
  mentionsWitness: boolean('mentions_witness').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const hearings = pgTable('hearings', {
  id: uuid('id').defaultRandom().primaryKey(),
  processId: uuid('process_id')
    .notNull()
    .references(() => processes.id, { onDelete: 'cascade' }),
  dateTime: timestamp('date_time').notNull(),
  type: hearingTypeEnum('type').notNull(),
  status: hearingStatusEnum('status').default('agendada').notNull(),
  rescheduledTo: timestamp('rescheduled_to'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const witnesses = pgTable('witnesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  processId: uuid('process_id')
    .notNull()
    .references(() => processes.id, { onDelete: 'restrict' }),
  replacedById: uuid('replaced_by_id').references(
    (): AnyPgColumn => witnesses.id,
    { onDelete: 'set null' },
  ),
  fullName: text('full_name').notNull(),
  address: text('address').notNull(),
  residenceComarca: text('residence_comarca').notNull(),
  maritalStatus: text('marital_status'),
  profession: text('profession'),
  phone: text('phone'),
  notes: text('notes'),
  side: witnessSideEnum('side').default('reu').notNull(),
  status: witnessStatusEnum('status').default('pendente_dados').notNull(),
  replaced: boolean('replaced').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deadlines = pgTable('deadlines', {
  id: uuid('id').defaultRandom().primaryKey(),
  processId: uuid('process_id')
    .notNull()
    .references(() => processes.id, { onDelete: 'restrict' }),
  witnessId: uuid('witness_id').references(() => witnesses.id, {
    onDelete: 'set null',
  }),
  type: deadlineTypeEnum('type').notNull(),
  dueDate: date('due_date').notNull(),
  status: deadlineStatusEnum('status').default('aberto').notNull(),
  notificationSent: boolean('notification_sent').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const holidays = pgTable('holidays', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull(),
  name: text('name').notNull(),
  type: holidayTypeEnum('type').notNull(),
  state: text('state'),
  municipality: text('municipality'),
  source: holidaySourceEnum('source').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const emails = pgTable('emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  processId: uuid('process_id')
    .notNull()
    .references(() => processes.id, { onDelete: 'restrict' }),
  template: emailTemplateEnum('template').notNull(),
  recipient: text('recipient').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  repliedAt: timestamp('replied_at'),
  acknowledgmentDate: date('acknowledgment_date'),
  fulfilledAt: date('fulfilled_at'),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  processId: uuid('process_id').references(() => processes.id, {
    onDelete: 'restrict',
  }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  actionType: actionTypeEnum('action_type').notNull(),
  description: text('description').notNull(),
  previousData: jsonb('previous_data').$type<Record<string, unknown> | null>(),
  newData: jsonb('new_data').$type<Record<string, unknown> | null>(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type AuthSession = InferSelectModel<typeof sessions>;
export type NewAuthSession = InferInsertModel<typeof sessions>;
export type AuthAccount = InferSelectModel<typeof accounts>;
export type NewAuthAccount = InferInsertModel<typeof accounts>;
export type Verification = InferSelectModel<typeof verifications>;
export type NewVerification = InferInsertModel<typeof verifications>;
export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;
export type Process = InferSelectModel<typeof processes>;
export type NewProcess = InferInsertModel<typeof processes>;
export type Hearing = InferSelectModel<typeof hearings>;
export type NewHearing = InferInsertModel<typeof hearings>;
export type Witness = InferSelectModel<typeof witnesses>;
export type NewWitness = InferInsertModel<typeof witnesses>;
export type Deadline = InferSelectModel<typeof deadlines>;
export type NewDeadline = InferInsertModel<typeof deadlines>;
export type Holiday = InferSelectModel<typeof holidays>;
export type NewHoliday = InferInsertModel<typeof holidays>;
export type Email = InferSelectModel<typeof emails>;
export type NewEmail = InferInsertModel<typeof emails>;
export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;
