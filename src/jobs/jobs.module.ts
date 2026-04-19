import { Module } from '@nestjs/common';

import { EmailModule } from '../infra/email/email.module';
import { DeadlinesModule } from '../modules/deadlines/deadlines.module';
import { DeadlinesJob } from './deadlines.job';
import { HolidaySyncJob } from './holiday-sync.job';
import { JobsRepository } from './jobs.repository';

@Module({
  imports: [DeadlinesModule, EmailModule],
  providers: [JobsRepository, HolidaySyncJob, DeadlinesJob],
  exports: [HolidaySyncJob, DeadlinesJob],
})
export class JobsModule {}
