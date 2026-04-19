import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import {
  db,
  runInTransaction,
  type DatabaseExecutor,
  type DatabaseTransaction,
} from '../../infra/database/client';
import { clients, hearings, processes } from '../../schema';
import type { HearingFiltersInput, UpdateHearingInput } from '../../schema/zod';

export type HearingEntity = typeof hearings.$inferSelect;

export type HearingListResult = {
  items: HearingEntity[];
  total: number;
  page: number;
  pageSize: number;
};

export type HearingProcessContext = Pick<
  typeof processes.$inferSelect,
  'id' | 'mentionsWitness' | 'cnjNumber'
> & {
  clientEmail: string;
};

export type CreateHearingRecordInput = {
  processId: string;
  dateTime: Date;
  type: HearingEntity['type'];
  status?: HearingEntity['status'];
  rescheduledTo?: Date;
};

type NormalizedHearingFilters = Pick<
  HearingFiltersInput,
  'processId' | 'type' | 'status' | 'startsAt' | 'endsAt'
> & {
  page: number;
  pageSize: number;
};

@Injectable()
export class HearingsRepository {
  async findMany(
    filters: NormalizedHearingFilters,
  ): Promise<HearingListResult> {
    const conditions = [
      filters.processId ? eq(hearings.processId, filters.processId) : undefined,
      filters.type ? eq(hearings.type, filters.type) : undefined,
      filters.status ? eq(hearings.status, filters.status) : undefined,
      filters.startsAt ? gte(hearings.dateTime, filters.startsAt) : undefined,
      filters.endsAt ? lte(hearings.dateTime, filters.endsAt) : undefined,
    ].filter((condition) => condition !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(hearings)
        .where(whereClause)
        .orderBy(desc(hearings.dateTime), desc(hearings.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(hearings)
        .where(whereClause),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findById(
    id: string,
    executor: DatabaseExecutor = db,
  ): Promise<HearingEntity | null> {
    const [hearing] = await executor
      .select()
      .from(hearings)
      .where(eq(hearings.id, id))
      .limit(1);

    return hearing ?? null;
  }

  async findProcessContext(
    processId: string,
  ): Promise<HearingProcessContext | null> {
    const [process] = await db
      .select({
        id: processes.id,
        mentionsWitness: processes.mentionsWitness,
        cnjNumber: processes.cnjNumber,
        clientEmail: clients.email,
      })
      .from(processes)
      .innerJoin(clients, eq(clients.id, processes.clientId))
      .where(eq(processes.id, processId))
      .limit(1);

    return process ?? null;
  }

  async create(
    input: CreateHearingRecordInput,
    executor: DatabaseExecutor = db,
  ): Promise<HearingEntity> {
    const [hearing] = await executor
      .insert(hearings)
      .values({
        processId: input.processId,
        dateTime: input.dateTime,
        type: input.type,
        status: input.status ?? 'agendada',
        rescheduledTo: input.rescheduledTo,
      })
      .returning();

    return hearing;
  }

  async update(
    id: string,
    input: UpdateHearingInput,
    executor: DatabaseExecutor = db,
  ): Promise<HearingEntity | null> {
    const [hearing] = await executor
      .update(hearings)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(hearings.id, id))
      .returning();

    return hearing ?? null;
  }

  async remove(
    id: string,
    executor: DatabaseExecutor = db,
  ): Promise<HearingEntity | null> {
    const [hearing] = await executor
      .delete(hearings)
      .where(eq(hearings.id, id))
      .returning();

    return hearing ?? null;
  }

  async runInTransaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    return runInTransaction(callback);
  }
}
