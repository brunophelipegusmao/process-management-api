import { Module } from '@nestjs/common';
import { UsersModule } from '../../modules/users/users.module';

import {
  ConsoleEmailTransport,
  EmailService,
  EMAIL_TRANSPORT,
} from './email.service';
import { EmailRepository } from './email.repository';
import { InternalNotificationService } from './internal-notification.service';
import { SmtpEmailTransport } from './smtp-email.transport';
import { appEnv } from '../../config/app-env';

@Module({
  imports: [UsersModule],
  providers: [
    EmailRepository,
    EmailService,
    InternalNotificationService,
    ConsoleEmailTransport,
    SmtpEmailTransport,
    {
      provide: EMAIL_TRANSPORT,
      useFactory: (
        consoleTransport: ConsoleEmailTransport,
        smtpTransport: SmtpEmailTransport,
      ) => {
        if (appEnv.email.provider === 'smtp') {
          return smtpTransport;
        }
        return consoleTransport;
      },
      inject: [ConsoleEmailTransport, SmtpEmailTransport],
    },
  ],
  exports: [EmailService, InternalNotificationService],
})
export class EmailModule {}
