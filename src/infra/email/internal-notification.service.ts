import { Injectable } from '@nestjs/common';

import { UsersRepository } from '../../modules/users/users.repository';
import { EmailService } from './email.service';

export type NotifyInternalRecipientsInput = {
  processId: string;
  processCode?: string;
  message: string;
};

@Injectable()
export class InternalNotificationService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
  ) {}

  async notifyRecipients(input: NotifyInternalRecipientsInput) {
    const users = await this.usersRepository.findActiveNotificationRecipients();
    const recipients = [...new Set(users.map((user) => user.email))];

    if (recipients.length === 0) {
      return {
        recipientCount: 0,
      };
    }

    await Promise.all(
      recipients.map((recipient) =>
        this.emailService.sendTemplate({
          processId: input.processId,
          template: 'E6',
          recipient,
          variables: {
            processCode: input.processCode,
            message: input.message,
          },
        }),
      ),
    );

    return {
      recipientCount: recipients.length,
    };
  }
}
