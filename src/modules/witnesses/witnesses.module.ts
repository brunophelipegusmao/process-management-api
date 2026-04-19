import { Module } from '@nestjs/common';

import { DeadlinesModule } from '../deadlines/deadlines.module';
import { WitnessesController } from './witnesses.controller';
import { WitnessesRepository } from './witnesses.repository';
import { WitnessesService } from './witnesses.service';

@Module({
  imports: [DeadlinesModule],
  controllers: [WitnessesController],
  providers: [WitnessesRepository, WitnessesService],
  exports: [WitnessesRepository, WitnessesService],
})
export class WitnessesModule {}
