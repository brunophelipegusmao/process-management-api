import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db, type DatabaseExecutor } from '../../infra/database/client';
import { deadlines, processes, witnesses } from '../../schema';
import type {
  DeadlineFiltersInput,
  UpdateDeadlineInput,
} from '../../schema/zod';

export type DeadlineEntity = typeof deadlines.$inferSelect;

export type DeadlineListResult = {
  items: DeadlineEntity[];
  total: number;
  page: number;
  pageSize: number;
};

export type DeadlineProcessContext = Pick<
  typeof processes.$inferSelect,
  'id' | 'comarca'
>;

export type DeadlineWitnessContext = Pick<
  typeof witnesses.$inferSelect,
  'id' | 'processId' | 'replaced' | 'status'
>;

export type CreateDeadlineRecordInput = {
  processId: string;
  witnessId?: string;
  type: DeadlineEntity['type'];
  dueDate: Date;
  status?: DeadlineEntity['status'];
  notificationSent?: boolean;
};

type NormalizedDeadlineFilters = Pick<
  DeadlineFiltersInput,
  'processId' | 'witnessId' | 'type' | 'status'
> & {
  dueDateFrom?: Date;
  dueDateTo?: Date;
  page: number;
  pageSize: number;
};

function toDateColumnValue(dateValue: Date) {
  return dateValue.toISOString().slice(0, 10);
}

@Injectable()
export class DeadlinesRepository {
  async findMany(
    filters: NormalizedDeadlineFilters,
  ): Promise<DeadlineListResult> {
    const conditions = [
      filters.processId
        ? eq(deadlines.processId, filters.processId)
        : undefined,
      filters.witnessId
        ? eq(deadlines.witnessId, filters.witnessId)
        : undefined,
      filters.type ? eq(deadlines.type, filters.type) : undefined,
      filters.status ? eq(deadlines.status, filters.status) : undefined,
      filters.dueDateFrom
        ? gte(deadlines.dueDate, toDateColumnValue(filters.dueDateFrom))
        : undefined,
      filters.dueDateTo
        ? lte(deadlines.dueDate, toDateColumnValue(filters.dueDateTo))
        : undefined,
    ].filter((condition) => condition !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(deadlines)
        .where(whereClause)
        .orderBy(desc(deadlines.dueDate), desc(deadlines.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(deadlines)
        .where(whereClause),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findById(id: string): Promise<DeadlineEntity | null> {
    const [deadline] = await db
      .select()
      .from(deadlines)
      .where(eq(deadlines.id, id))
      .limit(1);

    return deadline ?? null;
  }

  async findProcessContext(
    processId: string,
  ): Promise<DeadlineProcessContext | null> {
    const [process] = await db
      .select({
        id: processes.id,
        comarca: processes.comarca,
      })
      .from(processes)
      .where(eq(processes.id, processId))
      .limit(1);

    return process ?? null;
  }

  async findWitnessContext(
    witnessId: string,
  ): Promise<DeadlineWitnessContext | null> {
    const [witness] = await db
      .select({
        id: witnesses.id,
        processId: witnesses.processId,
        replaced: witnesses.replaced,
        status: witnesses.status,
      })
      .from(witnesses)
      .where(eq(witnesses.id, witnessId))
      .limit(1);

    return witness ?? null;
  }

  async create(
    input: CreateDeadlineRecordInput,
    executor: DatabaseExecutor = db,
  ): Promise<DeadlineEntity> {
    const [deadline] = await executor
      .insert(deadlines)
      .values({
        processId: input.processId,
        witnessId: input.witnessId,
        type: input.type,
        dueDate: toDateColumnValue(input.dueDate),
        status: input.status ?? 'aberto',
        notificationSent: input.notificationSent ?? false,
      })
      .returning();

    return deadline;
  }

  async update(
    id: string,
    input: UpdateDeadlineInput,
    executor: DatabaseExecutor = db,
  ): Promise<DeadlineEntity | null> {
    const [deadline] = await executor
      .update(deadlines)
      .set({
        ...input,
        dueDate: input.dueDate ? toDateColumnValue(input.dueDate) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(deadlines.id, id))
      .returning();

    return deadline ?? null;
  }

  async cancel(
    id: string,
    executor: DatabaseExecutor = db,
  ): Promise<DeadlineEntity | null> {
    const [deadline] = await executor
      .update(deadlines)
      .set({
        status: 'cancelado',
        updatedAt: new Date(),
      })
      .where(eq(deadlines.id, id))
      .returning();

    return deadline ?? null;
  }

  async cancelActiveByWitnessId(
    witnessId: string,
    executor: DatabaseExecutor = db,
  ): Promise<number> {
    const cancelledDeadlines = await executor
      .update(deadlines)
      .set({
        status: 'cancelado',
        updatedAt: new Date(),
      })
      .where(
        and(eq(deadlines.witnessId, witnessId), eq(deadlines.status, 'aberto')),
      )
      .returning({ id: deadlines.id });

    return cancelledDeadlines.length;
  }
}
