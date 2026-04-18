import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';

import { db } from '../../infra/database/client';
import { clients } from '../../schema';
import type {
  ClientFiltersInput,
  CreateClientInput,
  UpdateClientInput,
} from '../../schema/zod';

export type ClientEntity = typeof clients.$inferSelect;

export type ClientListResult = {
  items: ClientEntity[];
  total: number;
  page: number;
  pageSize: number;
};

type NormalizedClientFilters = Pick<
  ClientFiltersInput,
  'email' | 'name' | 'type'
> & {
  page: number;
  pageSize: number;
};

@Injectable()
export class ClientsRepository {
  async findMany(filters: NormalizedClientFilters): Promise<ClientListResult> {
    const conditions = [
      filters.email ? ilike(clients.email, `%${filters.email}%`) : undefined,
      filters.name ? ilike(clients.name, `%${filters.name}%`) : undefined,
      filters.type ? eq(clients.type, filters.type) : undefined,
    ].filter((condition) => condition !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(whereClause)
        .orderBy(desc(clients.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(clients)
        .where(whereClause),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findById(id: string): Promise<ClientEntity | null> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    return client ?? null;
  }

  async findByEmail(email: string): Promise<ClientEntity | null> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.email, email))
      .limit(1);

    return client ?? null;
  }

  async create(input: CreateClientInput): Promise<ClientEntity> {
    const [client] = await db.insert(clients).values(input).returning();
    return client;
  }

  async update(
    id: string,
    input: UpdateClientInput,
  ): Promise<ClientEntity | null> {
    const [client] = await db
      .update(clients)
      .set(input)
      .where(eq(clients.id, id))
      .returning();

    return client ?? null;
  }

  async remove(id: string): Promise<ClientEntity | null> {
    const [client] = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .returning();

    return client ?? null;
  }
}
