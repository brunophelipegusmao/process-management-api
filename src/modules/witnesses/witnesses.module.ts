import { Module } from '@nestjs/common';

import { EmailModule } from '../../infra/email/email.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { WitnessesController } from './witnesses.controller';
import { WitnessesRepository } from './witnesses.repository';
import { WitnessesService } from './witnesses.service';

@Module({
  imports: [DeadlinesModule, EmailModule],
  controllers: [WitnessesController],
  providers: [WitnessesRepository, WitnessesService],
  exports: [WitnessesRepository, WitnessesService],
})
export class WitnessesModule {}
