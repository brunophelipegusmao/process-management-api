import { Module } from '@nestjs/common';
import { UsersModule } from '../../modules/users/users.module';

import {
  ConsoleEmailTransport,
  EmailService,
  EMAIL_TRANSPORT,
} from './email.service';
import { EmailRepository } from './email.repository';
import { InternalNotificationService } from './internal-notification.service';

@Module({
  imports: [UsersModule],
  providers: [
    EmailRepository,
    EmailService,
    InternalNotificationService,
    ConsoleEmailTransport,
    {
      provide: EMAIL_TRANSPORT,
      useExisting: ConsoleEmailTransport,
    },
  ],
  exports: [EmailService, InternalNotificationService],
})
export class EmailModule {}
