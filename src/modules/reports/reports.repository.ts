import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

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
}
