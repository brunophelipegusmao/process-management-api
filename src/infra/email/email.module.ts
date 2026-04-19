import { Module } from '@nestjs/common';

import {
  ConsoleEmailTransport,
  EmailService,
  EMAIL_TRANSPORT,
} from './email.service';
import { EmailRepository } from './email.repository';

@Module({
  providers: [
    EmailRepository,
    EmailService,
    ConsoleEmailTransport,
    {
      provide: EMAIL_TRANSPORT,
      useExisting: ConsoleEmailTransport,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
