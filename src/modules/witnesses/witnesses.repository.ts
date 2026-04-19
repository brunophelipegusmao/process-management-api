import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import {
  db,
  runInTransaction,
  type DatabaseExecutor,
  type DatabaseTransaction,
} from '../../infra/database/client';
import { clients, processes, witnesses } from '../../schema';
import type { UpdateWitnessInput, WitnessFiltersInput } from '../../schema/zod';

export type WitnessEntity = typeof witnesses.$inferSelect;

export type WitnessListResult = {
  items: WitnessEntity[];
  total: number;
  page: number;
  pageSize: number;
};

export type WitnessProcessContext = Pick<
  typeof processes.$inferSelect,
  'id' | 'courtType' | 'comarca' | 'mentionsWitness' | 'cnjNumber'
> & {
  clientEmail: string;
};

export type CreateWitnessRecordInput = {
  processId: string;
  replacedById?: string;
  fullName: string;
  address: string;
  residenceComarca: string;
  maritalStatus?: string;
  profession?: string;
  phone?: string;
  notes?: string;
  side: WitnessEntity['side'];
  status: WitnessEntity['status'];
  replaced: boolean;
};

type NormalizedWitnessFilters = Pick<
  WitnessFiltersInput,
  'processId' | 'side' | 'status' | 'replaced'
> & {
  page: number;
  pageSize: number;
};

@Injectable()
export class WitnessesRepository {
  async findMany(
    filters: NormalizedWitnessFilters,
  ): Promise<WitnessListResult> {
    const conditions = [
      filters.processId
        ? eq(witnesses.processId, filters.processId)
        : undefined,
      filters.side ? eq(witnesses.side, filters.side) : undefined,
      filters.status ? eq(witnesses.status, filters.status) : undefined,
      filters.replaced !== undefined
        ? eq(witnesses.replaced, filters.replaced)
        : undefined,
    ].filter((condition) => condition !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(witnesses)
        .where(whereClause)
        .orderBy(desc(witnesses.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(witnesses)
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
  ): Promise<WitnessEntity | null> {
    const [witness] = await executor
      .select()
      .from(witnesses)
      .where(eq(witnesses.id, id))
      .limit(1);

    return witness ?? null;
  }

  async findProcessContext(
    processId: string,
  ): Promise<WitnessProcessContext | null> {
    const [process] = await db
      .select({
        id: processes.id,
        courtType: processes.courtType,
        comarca: processes.comarca,
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

  async countActiveForProcess(
    processId: string,
    executor: DatabaseExecutor = db,
  ): Promise<number> {
    const [result] = await executor
      .select({ total: sql<number>`count(*)::int` })
      .from(witnesses)
      .where(
        and(
          eq(witnesses.processId, processId),
          eq(witnesses.replaced, false),
          ne(witnesses.status, 'desistida'),
        ),
      );

    return result?.total ?? 0;
  }

  async countByProcessAndStatuses(
    processId: string,
    statuses: WitnessEntity['status'][],
    executor: DatabaseExecutor = db,
  ): Promise<number> {
    if (statuses.length === 0) {
      return 0;
    }

    const [result] = await executor
      .select({ total: sql<number>`count(*)::int` })
      .from(witnesses)
      .where(
        and(
          eq(witnesses.processId, processId),
          inArray(witnesses.status, statuses),
          eq(witnesses.replaced, false),
        ),
      );

    return result?.total ?? 0;
  }

  async create(
    input: CreateWitnessRecordInput,
    executor: DatabaseExecutor = db,
  ): Promise<WitnessEntity> {
    const [witness] = await executor
      .insert(witnesses)
      .values(input)
      .returning();

    return witness;
  }

  async update(
    id: string,
    input: UpdateWitnessInput,
    executor: DatabaseExecutor = db,
  ): Promise<WitnessEntity | null> {
    const [witness] = await executor
      .update(witnesses)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(witnesses.id, id))
      .returning();

    return witness ?? null;
  }

  async markAsReplaced(
    id: string,
    replacedById: string,
    executor: DatabaseExecutor = db,
  ): Promise<WitnessEntity | null> {
    const [witness] = await executor
      .update(witnesses)
      .set({
        replaced: true,
        replacedById,
        status: 'substituida',
        updatedAt: new Date(),
      })
      .where(eq(witnesses.id, id))
      .returning();

    return witness ?? null;
  }

  async markAsRetired(
    id: string,
    executor: DatabaseExecutor = db,
  ): Promise<WitnessEntity | null> {
    const [witness] = await executor
      .update(witnesses)
      .set({
        status: 'desistida',
        updatedAt: new Date(),
      })
      .where(eq(witnesses.id, id))
      .returning();

    return witness ?? null;
  }

  async runInTransaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    return runInTransaction(callback);
  }
}
