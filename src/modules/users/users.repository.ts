import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';

import { db } from '../../infra/database/client';
import { users } from '../../schema';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserFiltersInput,
} from '../../schema/zod';

export type UserEntity = typeof users.$inferSelect;

export type UserListResult = {
  items: UserEntity[];
  total: number;
  page: number;
  pageSize: number;
};

type NormalizedUserFilters = Pick<
  UserFiltersInput,
  'active' | 'email' | 'profile'
> & {
  page: number;
  pageSize: number;
};

@Injectable()
export class UsersRepository {
  async findMany(filters: NormalizedUserFilters): Promise<UserListResult> {
    const conditions = [
      filters.email ? ilike(users.email, `%${filters.email}%`) : undefined,
      filters.profile ? eq(users.profile, filters.profile) : undefined,
      typeof filters.active === 'boolean'
        ? eq(users.active, filters.active)
        : undefined,
    ].filter((condition) => condition !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findById(id: string): Promise<UserEntity | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  async findActiveNotificationRecipients(): Promise<UserEntity[]> {
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.active, true),
          sql`${users.profile} in ('superadmin', 'advogado')`,
        ),
      )
      .orderBy(desc(users.createdAt));
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const [user] = await db.insert(users).values(input).returning();
    return user;
  }

  async update(id: string, input: UpdateUserInput): Promise<UserEntity | null> {
    const [user] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user ?? null;
  }

  async remove(id: string): Promise<UserEntity | null> {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning();

    return user ?? null;
  }
}
