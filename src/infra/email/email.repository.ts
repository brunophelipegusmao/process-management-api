import { Injectable } from '@nestjs/common';

import { db, type DatabaseExecutor } from '../database/client';
import { emails } from '../../schema';

export type EmailEntity = typeof emails.$inferSelect;

export type CreateEmailRecordInput = {
  processId: string;
  template: EmailEntity['template'];
  recipient: string;
  sentAt?: Date;
};

@Injectable()
export class EmailRepository {
  async create(
    input: CreateEmailRecordInput,
    executor: DatabaseExecutor = db,
  ): Promise<EmailEntity> {
    const [email] = await executor
      .insert(emails)
      .values({
        processId: input.processId,
        template: input.template,
        recipient: input.recipient,
        sentAt: input.sentAt ?? new Date(),
      })
      .returning();

    return email;
  }
}
