import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '../../infra/database/client';
import { holidays } from '../../schema';
import type {
  CreateHolidayInput,
  HolidayFiltersInput,
  UpdateHolidayInput,
} from '../../schema/zod';

export type HolidayEntity = typeof holidays.$inferSelect;

export type HolidayListResult = {
  items: HolidayEntity[];
  total: number;
  page: number;
  pageSize: number;
};

export type HolidayScope = {
  date: string;
  type: CreateHolidayInput['type'];
  state?: string;
  municipality?: string;
};

type NormalizedHolidayFilters = Pick<
  HolidayFiltersInput,
  'type' | 'state' | 'municipality' | 'source'
> & {
  date?: Date;
  page: number;
  pageSize: number;
};

function toDateColumnValue(dateValue: Date) {
  return dateValue.toISOString().slice(0, 10);
}

@Injectable()
export class HolidaysRepository {
  async findMany(
    filters: NormalizedHolidayFilters,
  ): Promise<HolidayListResult> {
    const conditions = [
      filters.date
        ? eq(holidays.date, toDateColumnValue(filters.date))
        : undefined,
      filters.type ? eq(holidays.type, filters.type) : undefined,
      filters.state ? eq(holidays.state, filters.state) : undefined,
      filters.municipality
        ? eq(holidays.municipality, filters.municipality)
        : undefined,
      filters.source ? eq(holidays.source, filters.source) : undefined,
    ].filter((condition) => condition !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(holidays)
        .where(whereClause)
        .orderBy(desc(holidays.date), desc(holidays.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(holidays)
        .where(whereClause),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findById(id: string): Promise<HolidayEntity | null> {
    const [holiday] = await db
      .select()
      .from(holidays)
      .where(eq(holidays.id, id))
      .limit(1);

    return holiday ?? null;
  }

  async findByScope(scope: HolidayScope): Promise<HolidayEntity | null> {
    const conditions = [
      eq(holidays.date, scope.date),
      eq(holidays.type, scope.type),
      scope.state ? eq(holidays.state, scope.state) : undefined,
      scope.state === undefined ? sql`${holidays.state} is null` : undefined,
      scope.municipality
        ? eq(holidays.municipality, scope.municipality)
        : undefined,
      scope.municipality === undefined
        ? sql`${holidays.municipality} is null`
        : undefined,
    ].filter((condition) => condition !== undefined);

    const [holiday] = await db
      .select()
      .from(holidays)
      .where(and(...conditions))
      .limit(1);

    return holiday ?? null;
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<HolidayEntity[]> {
    return db
      .select()
      .from(holidays)
      .where(
        and(
          gte(holidays.date, toDateColumnValue(startDate)),
          lte(holidays.date, toDateColumnValue(endDate)),
        ),
      )
      .orderBy(desc(holidays.date), desc(holidays.createdAt));
  }

  async create(input: CreateHolidayInput): Promise<HolidayEntity> {
    const [holiday] = await db
      .insert(holidays)
      .values({
        ...input,
        date: toDateColumnValue(input.date),
      })
      .returning();

    return holiday;
  }

  async update(
    id: string,
    input: UpdateHolidayInput,
  ): Promise<HolidayEntity | null> {
    const [holiday] = await db
      .update(holidays)
      .set({
        ...input,
        date: input.date ? toDateColumnValue(input.date) : undefined,
      })
      .where(eq(holidays.id, id))
      .returning();

    return holiday ?? null;
  }

  async remove(id: string): Promise<HolidayEntity | null> {
    const [holiday] = await db
      .delete(holidays)
      .where(eq(holidays.id, id))
      .returning();

    return holiday ?? null;
  }
}
