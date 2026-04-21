import { z } from 'zod';

import {
  actionTypeValues,
  clientSideValues,
  clientTypeValues,
  courtTypeValues,
  deadlineStatusValues,
  deadlineTypeValues,
  emailTemplateValues,
  hearingStatusValues,
  hearingTypeValues,
  holidaySourceValues,
  holidayTypeValues,
  processStatusValues,
  userProfileValues,
  witnessSideValues,
  witnessStatusValues,
} from '..';

const uuidSchema = z.string().uuid();
const optionalUuidSchema = uuidSchema.optional();
const dateSchema = z.coerce.date();
const optionalDateSchema = dateSchema.optional();
const dateTimeSchema = z.coerce.date();
const optionalDateTimeSchema = dateTimeSchema.optional();
const optionalLooseTrimmedStringSchema = z.string().trim().optional();
const optionalTrimmedStringSchema = z.string().trim().min(1).optional();
const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const bannedWitnessFields = [
  'cpf',
  'rg',
  'cnh',
  'document',
  'identityDocument',
];

function withStrictUnknownFieldValidation<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) {
  return schema.strict();
}

function withWitnessGuards<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.strict().superRefine((value, context) => {
    for (const field of bannedWitnessFields) {
      if (field in value) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} is not allowed for witnesses`,
        });
      }
    }
  });
}

export const userProfileSchema = z.enum(userProfileValues);
export const clientTypeSchema = z.enum(clientTypeValues);
export const clientSideSchema = z.enum(clientSideValues);
export const courtTypeSchema = z.enum(courtTypeValues);
export const processStatusSchema = z.enum(processStatusValues);
export const hearingTypeSchema = z.enum(hearingTypeValues);
export const hearingStatusSchema = z.enum(hearingStatusValues);
export const witnessStatusSchema = z.enum(witnessStatusValues);
export const witnessSideSchema = z.enum(witnessSideValues);
export const deadlineTypeSchema = z.enum(deadlineTypeValues);
export const deadlineStatusSchema = z.enum(deadlineStatusValues);
export const holidayTypeSchema = z.enum(holidayTypeValues);
export const holidaySourceSchema = z.enum(holidaySourceValues);
export const emailTemplateSchema = z.enum(emailTemplateValues);
export const actionTypeSchema = z.enum(actionTypeValues);
export const witnessIntimationMethodSchema = z.enum([
  'carta_simples',
  'carta_precatoria',
  'sala_passiva',
  'mandado',
  'whatsapp',
]);
export const witnessIntimationOutcomeSchema = z.enum(['positive', 'negative']);

const userShape = {
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  emailVerified: z.boolean().optional(),
  image: optionalTrimmedStringSchema,
  profile: userProfileSchema.default('advogado'),
  active: z.boolean().optional(),
};

export const createUserSchema = withStrictUnknownFieldValidation(
  z.object(userShape),
);
export const updateUserSchema = withStrictUnknownFieldValidation(
  z.object(userShape).partial(),
);
export const userFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    email: optionalTrimmedStringSchema,
    profile: userProfileSchema.optional(),
    active: z.coerce.boolean().optional(),
  }),
);

const clientShape = {
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: optionalTrimmedStringSchema,
  type: clientTypeSchema,
};

export const createClientSchema = withStrictUnknownFieldValidation(
  z.object(clientShape),
);
export const updateClientSchema = withStrictUnknownFieldValidation(
  z.object(clientShape).partial(),
);
export const clientFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    email: optionalTrimmedStringSchema,
    type: clientTypeSchema.optional(),
    name: optionalTrimmedStringSchema,
  }),
);

const processShape = {
  clientId: uuidSchema,
  cnjNumber: z.string().trim().min(1),
  comarca: z.string().trim().min(1),
  vara: z.string().trim().min(1),
  courtType: courtTypeSchema,
  authorName: z.string().trim().min(1),
  defendantName: z.string().trim().min(1),
  clientSide: clientSideSchema.default('reu'),
  status: processStatusSchema.default('citado'),
  citationDate: optionalDateSchema,
  mentionsWitness: z.boolean().optional(),
};

export const createProcessSchema = withStrictUnknownFieldValidation(
  z.object(processShape),
);
export const updateProcessSchema = withStrictUnknownFieldValidation(
  z.object(processShape).partial(),
);
export const processFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    clientId: optionalUuidSchema,
    cnjNumber: optionalTrimmedStringSchema,
    courtType: courtTypeSchema.optional(),
    status: processStatusSchema.optional(),
    mentionsWitness: z.coerce.boolean().optional(),
  }),
);

const hearingShape = {
  processId: uuidSchema,
  dateTime: dateTimeSchema,
  type: hearingTypeSchema,
  status: hearingStatusSchema.default('agendada'),
  rescheduledTo: optionalDateTimeSchema,
};

export const createHearingSchema = withStrictUnknownFieldValidation(
  z.object(hearingShape),
);
export const updateHearingSchema = withStrictUnknownFieldValidation(
  z.object(hearingShape).partial(),
);
export const hearingFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    processId: optionalUuidSchema,
    type: hearingTypeSchema.optional(),
    status: hearingStatusSchema.optional(),
    startsAt: optionalDateTimeSchema,
    endsAt: optionalDateTimeSchema,
  }),
);

const witnessShape = {
  processId: uuidSchema,
  replacedById: optionalUuidSchema,
  fullName: z.string().trim().min(1),
  address: optionalLooseTrimmedStringSchema,
  residenceComarca: optionalLooseTrimmedStringSchema,
  maritalStatus: optionalTrimmedStringSchema,
  profession: optionalTrimmedStringSchema,
  phone: optionalTrimmedStringSchema,
  notes: optionalTrimmedStringSchema,
  side: witnessSideSchema.default('reu'),
  status: witnessStatusSchema.optional(),
  replaced: z.boolean().optional(),
};

const replaceWitnessShape = {
  fullName: z.string().trim().min(1),
  address: optionalLooseTrimmedStringSchema,
  residenceComarca: optionalLooseTrimmedStringSchema,
  maritalStatus: optionalTrimmedStringSchema,
  profession: optionalTrimmedStringSchema,
  phone: optionalTrimmedStringSchema,
  notes: optionalTrimmedStringSchema,
  side: witnessSideSchema.default('reu'),
  status: witnessStatusSchema.optional(),
};

export const createWitnessSchema = withWitnessGuards(z.object(witnessShape));
export const updateWitnessSchema = withWitnessGuards(
  z.object(witnessShape).partial(),
);
export const replaceWitnessSchema = withWitnessGuards(
  z.object(replaceWitnessShape),
);
export const witnessIntimationRequestSchema = withStrictUnknownFieldValidation(
  z.object({
    method: witnessIntimationMethodSchema,
    hearingDate: optionalDateTimeSchema,
    sentAt: optionalDateTimeSchema,
  }),
).superRefine((value, context) => {
  if (value.method === 'carta_simples' && !value.hearingDate) {
    context.addIssue({
      code: 'custom',
      path: ['hearingDate'],
      message: 'hearingDate is required for carta_simples intimation',
    });
  }
});
export const witnessIntimationOutcomeRequestSchema =
  withStrictUnknownFieldValidation(
    z.object({
      outcome: witnessIntimationOutcomeSchema,
      hearingDate: optionalDateTimeSchema,
      occurredAt: optionalDateTimeSchema,
    }),
  ).superRefine((value, context) => {
    if (value.outcome === 'positive' && !value.hearingDate) {
      context.addIssue({
        code: 'custom',
        path: ['hearingDate'],
        message: 'hearingDate is required for positive intimation outcome',
      });
    }
  });
export const witnessFiltersSchema = withWitnessGuards(
  paginationSchema.extend({
    processId: optionalUuidSchema,
    side: witnessSideSchema.optional(),
    status: witnessStatusSchema.optional(),
    replaced: z.coerce.boolean().optional(),
  }),
);

const createDeadlineShape = {
  processId: uuidSchema,
  witnessId: optionalUuidSchema,
  type: deadlineTypeSchema,
  referenceDate: optionalDateSchema,
  hearingDate: optionalDateSchema,
  state: optionalTrimmedStringSchema,
  municipality: optionalTrimmedStringSchema,
  notificationSent: z.boolean().optional(),
};

const deadlineShape = {
  processId: uuidSchema,
  witnessId: optionalUuidSchema,
  type: deadlineTypeSchema,
  dueDate: dateSchema,
  status: deadlineStatusSchema.default('aberto'),
  notificationSent: z.boolean().optional(),
};

export const createDeadlineSchema = withStrictUnknownFieldValidation(
  z.object(createDeadlineShape),
).superRefine((value, context) => {
  const requiresHearingDate =
    value.type === 'juntada_intimacao' ||
    value.type === 'desistencia_testemunha';

  if (requiresHearingDate && !value.hearingDate) {
    context.addIssue({
      code: 'custom',
      path: ['hearingDate'],
      message: 'hearingDate is required for the selected deadline type',
    });
  }
});
export const updateDeadlineSchema = withStrictUnknownFieldValidation(
  z.object(deadlineShape).partial(),
);
export const deadlineFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    processId: optionalUuidSchema,
    witnessId: optionalUuidSchema,
    type: deadlineTypeSchema.optional(),
    status: deadlineStatusSchema.optional(),
    dueDateFrom: optionalDateSchema,
    dueDateTo: optionalDateSchema,
  }),
);

const holidayShape = {
  date: dateSchema,
  name: z.string().trim().min(1),
  type: holidayTypeSchema,
  state: optionalTrimmedStringSchema,
  municipality: optionalTrimmedStringSchema,
  source: holidaySourceSchema,
};

export const createHolidaySchema = withStrictUnknownFieldValidation(
  z.object(holidayShape),
);
export const updateHolidaySchema = withStrictUnknownFieldValidation(
  z.object(holidayShape).partial(),
);
export const holidayFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    date: optionalDateSchema,
    type: holidayTypeSchema.optional(),
    state: optionalTrimmedStringSchema,
    municipality: optionalTrimmedStringSchema,
    source: holidaySourceSchema.optional(),
  }),
);

const emailShape = {
  processId: uuidSchema,
  template: emailTemplateSchema,
  recipient: z.string().trim().email(),
  sentAt: optionalDateTimeSchema,
  repliedAt: optionalDateTimeSchema,
  acknowledgmentDate: optionalDateSchema,
  fulfilledAt: optionalDateSchema,
};

export const createEmailSchema = withStrictUnknownFieldValidation(
  z.object(emailShape),
);
export const updateEmailSchema = withStrictUnknownFieldValidation(
  z.object(emailShape).partial(),
);
export const emailFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    processId: optionalUuidSchema,
    template: emailTemplateSchema.optional(),
    recipient: optionalTrimmedStringSchema,
  }),
);

const auditLogShape = {
  processId: optionalUuidSchema,
  userId: optionalUuidSchema,
  actionType: actionTypeSchema,
  description: z.string().trim().min(1),
  previousData: z.record(z.string(), z.unknown()).nullable().optional(),
  newData: z.record(z.string(), z.unknown()).nullable().optional(),
};

export const createAuditLogSchema = withStrictUnknownFieldValidation(
  z.object(auditLogShape),
);
export const auditLogFiltersSchema = withStrictUnknownFieldValidation(
  paginationSchema.extend({
    processId: optionalUuidSchema,
    userId: optionalUuidSchema,
    actionType: actionTypeSchema.optional(),
    createdFrom: optionalDateTimeSchema,
    createdTo: optionalDateTimeSchema,
  }),
);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientFiltersInput = z.infer<typeof clientFiltersSchema>;
export type CreateProcessInput = z.infer<typeof createProcessSchema>;
export type UpdateProcessInput = z.infer<typeof updateProcessSchema>;
export type ProcessFiltersInput = z.infer<typeof processFiltersSchema>;
export type CreateHearingInput = z.infer<typeof createHearingSchema>;
export type UpdateHearingInput = z.infer<typeof updateHearingSchema>;
export type HearingFiltersInput = z.infer<typeof hearingFiltersSchema>;
export type CreateWitnessInput = z.infer<typeof createWitnessSchema>;
export type UpdateWitnessInput = z.infer<typeof updateWitnessSchema>;
export type ReplaceWitnessInput = z.infer<typeof replaceWitnessSchema>;
export type WitnessIntimationRequestInput = z.infer<
  typeof witnessIntimationRequestSchema
>;
export type WitnessIntimationOutcomeRequestInput = z.infer<
  typeof witnessIntimationOutcomeRequestSchema
>;
export type WitnessFiltersInput = z.infer<typeof witnessFiltersSchema>;
export type CreateDeadlineInput = z.infer<typeof createDeadlineSchema>;
export type UpdateDeadlineInput = z.infer<typeof updateDeadlineSchema>;
export type DeadlineFiltersInput = z.infer<typeof deadlineFiltersSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type HolidayFiltersInput = z.infer<typeof holidayFiltersSchema>;
export type CreateEmailInput = z.infer<typeof createEmailSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
export type EmailFiltersInput = z.infer<typeof emailFiltersSchema>;
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
