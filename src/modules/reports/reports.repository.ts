import { Injectable } from '@nestjs/common';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '../../infra/database/client';
import {
  deadlines,
  emails,
  hearings,
  processes,
  witnesses,
} from '../../schema';

export type ReportsOverview = {
  processesTotal: number;
  hearingsScheduled: number;
  openDeadlines: number;
  overdueDeadlines: number;
  pendingWitnessData: number;
  emailsSent: number;
};

export type DeadlinesByStatus = Record<string, number>;

export type WitnessesByStatus = Record<string, number>;

export type UpcomingHearing = {
  id: string;
  processId: string;
  cnjNumber: string;
  dateTime: Date;
  type: string;
};

@Injectable()
export class ReportsRepository {
  async getOverview(): Promise<ReportsOverview> {
    const [
      [{ totalProcesses }],
      [{ scheduledHearings }],
      [{ openDeadlines }],
      [{ overdueDeadlines }],
      [{ pendingWitnessData }],
      [{ sentEmails }],
    ] = await Promise.all([
      db.select({ totalProcesses: sql<number>`count(*)::int` }).from(processes),
      db
        .select({ scheduledHearings: sql<number>`count(*)::int` })
        .from(hearings)
        .where(sql`${hearings.status} = 'agendada'`),
      db
        .select({ openDeadlines: sql<number>`count(*)::int` })
        .from(deadlines)
        .where(sql`${deadlines.status} = 'aberto'`),
      db
        .select({ overdueDeadlines: sql<number>`count(*)::int` })
        .from(deadlines)
        .where(sql`${deadlines.status} = 'vencido'`),
      db
        .select({ pendingWitnessData: sql<number>`count(*)::int` })
        .from(witnesses)
        .where(
          sql`${witnesses.status} = 'pendente_dados' and ${witnesses.replaced} = false`,
        ),
      db.select({ sentEmails: sql<number>`count(*)::int` }).from(emails),
    ]);

    return {
      processesTotal: totalProcesses ?? 0,
      hearingsScheduled: scheduledHearings ?? 0,
      openDeadlines: openDeadlines ?? 0,
      overdueDeadlines: overdueDeadlines ?? 0,
      pendingWitnessData: pendingWitnessData ?? 0,
      emailsSent: sentEmails ?? 0,
    };
  }

  async getDeadlinesByStatus(): Promise<DeadlinesByStatus> {
    const rows = await db
      .select({
        status: deadlines.status,
        count: sql<number>`count(*)::int`,
      })
      .from(deadlines)
      .groupBy(deadlines.status);

    return Object.fromEntries(rows.map((r) => [r.status, r.count ?? 0]));
  }

  async getWitnessesByStatus(): Promise<WitnessesByStatus> {
    const rows = await db
      .select({
        status: witnesses.status,
        count: sql<number>`count(*)::int`,
      })
      .from(witnesses)
      .where(eq(witnesses.replaced, false))
      .groupBy(witnesses.status);

    return Object.fromEntries(rows.map((r) => [r.status, r.count ?? 0]));
  }

  async getUpcomingHearings(
    fromDate: Date,
    toDate: Date,
  ): Promise<UpcomingHearing[]> {
    return db
      .select({
        id: hearings.id,
        processId: hearings.processId,
        cnjNumber: processes.cnjNumber,
        dateTime: hearings.dateTime,
        type: hearings.type,
      })
      .from(hearings)
      .innerJoin(processes, eq(hearings.processId, processes.id))
      .where(
        and(
          eq(hearings.status, 'agendada'),
          gte(hearings.dateTime, fromDate),
          lte(hearings.dateTime, toDate),
        ),
      )
      .orderBy(hearings.dateTime);
  }
}
