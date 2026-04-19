import { Injectable } from '@nestjs/common';

import {
  db,
  runInTransaction,
  type DatabaseExecutor,
  type DatabaseTransaction,
} from '../infra/database/client';
import { auditLogs } from '../schema';

export type CreateAuditLogRecordInput = {
  actionType: typeof auditLogs.$inferInsert.actionType;
  description: string;
  processId?: string;
  userId?: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
};

@Injectable()
export class JobsRepository {
  async createAuditLog(
    input: CreateAuditLogRecordInput,
    executor: DatabaseExecutor = db,
  ) {
    await executor.insert(auditLogs).values(input);
  }

  async runInTransaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    return runInTransaction(callback);
  }
}
