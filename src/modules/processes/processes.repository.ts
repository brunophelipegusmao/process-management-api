import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';

import { db } from '../../infra/database/client';
import { processes } from '../../schema';
import type {
  CreateProcessInput,
  ProcessFiltersInput,
  UpdateProcessInput,
} from '../../schema/zod';

export type ProcessEntity = typeof processes.$inferSelect;

export type ProcessListResult = {
  items: ProcessEntity[];
  total: number;
  page: number;
  pageSize: number;
};

type NormalizedProcessFilters = Pick<
  ProcessFiltersInput,
  'clientId' | 'cnjNumber' | 'courtType' | 'status' | 'mentionsWitness'
> & {
  page: number;
  pageSize: number;
};

function toDateColumnValue(dateValue?: Date) {
  return dateValue ? dateValue.toISOString().split('T')[0] : undefined;
}

@Injectable()
export class ProcessesRepository {
  async findMany(
    filters: NormalizedProcessFilters,
  ): Promise<ProcessListResult> {
    const conditions = [
      filters.clientId ? eq(processes.clientId, filters.clientId) : undefined,
      filters.cnjNumber
        ? ilike(processes.cnjNumber, `%${filters.cnjNumber}%`)
        : undefined,
      filters.courtType
        ? eq(processes.courtType, filters.courtType)
        : undefined,
      filters.status ? eq(processes.status, filters.status) : undefined,
      filters.mentionsWitness !== undefined
        ? eq(processes.mentionsWitness, filters.mentionsWitness)
        : undefined,
    ].filter((condition) => condition !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(processes)
        .where(whereClause)
        .orderBy(desc(processes.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(processes)
        .where(whereClause),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findById(id: string): Promise<ProcessEntity | null> {
    const [process] = await db
      .select()
      .from(processes)
      .where(eq(processes.id, id))
      .limit(1);

    return process ?? null;
  }

  async findByCnjNumber(cnjNumber: string): Promise<ProcessEntity | null> {
    const [process] = await db
      .select()
      .from(processes)
      .where(eq(processes.cnjNumber, cnjNumber))
      .limit(1);

    return process ?? null;
  }

  async findByClientId(clientId: string): Promise<ProcessEntity[]> {
    return db
      .select()
      .from(processes)
      .where(eq(processes.clientId, clientId))
      .orderBy(desc(processes.createdAt));
  }

  async create(input: CreateProcessInput): Promise<ProcessEntity> {
    const [process] = await db
      .insert(processes)
      .values({
        ...input,
        citationDate: toDateColumnValue(input.citationDate),
      })
      .returning();

    return process;
  }

  async update(
    id: string,
    input: UpdateProcessInput,
  ): Promise<ProcessEntity | null> {
    const [process] = await db
      .update(processes)
      .set({
        ...input,
        citationDate: toDateColumnValue(input.citationDate),
        updatedAt: new Date(),
      })
      .where(eq(processes.id, id))
      .returning();

    return process ?? null;
  }

  async remove(id: string): Promise<ProcessEntity | null> {
    const [process] = await db
      .delete(processes)
      .where(eq(processes.id, id))
      .returning();

    return process ?? null;
  }
}
