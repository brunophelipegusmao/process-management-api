import { Injectable } from '@nestjs/common';
import { and, isNull, lte, sql } from 'drizzle-orm';

import {
  db,
  runInTransaction,
  type DatabaseExecutor,
  type DatabaseTransaction,
} from '../infra/database/client';
import { auditLogs, emails } from '../schema';

export type CreateAuditLogRecordInput = {
  actionType: typeof auditLogs.$inferInsert.actionType;
  description: string;
  processId?: string;
  userId?: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
};

export type PendingAckEmail = {
  id: string;
  processId: string;
  template: string;
  recipient: string;
  sentAt: Date;
};

@Injectable()
export class JobsRepository {
  async createAuditLog(
    input: CreateAuditLogRecordInput,
    executor: DatabaseExecutor = db,
  ) {
    await executor.insert(auditLogs).values(input);
  }

  async findPendingAcknowledgments(
    thresholdDate: Date,
    executor: DatabaseExecutor = db,
  ): Promise<PendingAckEmail[]> {
    return executor
      .select({
        id: emails.id,
        processId: emails.processId,
        template: emails.template,
        recipient: emails.recipient,
        sentAt: emails.sentAt,
      })
      .from(emails)
      .where(
        and(
          isNull(emails.acknowledgmentDate),
          lte(emails.sentAt, sql`${thresholdDate.toISOString()}::timestamptz`),
        ),
      );
  }

  async runInTransaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    return runInTransaction(callback);
  }
}
