import { Module } from '@nestjs/common';

import { EmailModule } from '../../infra/email/email.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { WitnessesModule } from '../witnesses/witnesses.module';
import { HearingsController } from './hearings.controller';
import { HearingsRepository } from './hearings.repository';
import { HearingsService } from './hearings.service';

@Module({
  imports: [DeadlinesModule, WitnessesModule, EmailModule],
  controllers: [HearingsController],
  providers: [HearingsRepository, HearingsService],
  exports: [HearingsRepository, HearingsService],
})
export class HearingsModule {}
