import { Module } from '@nestjs/common';

import { DeadlineCalculatorService } from './deadline-calculator.service';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesRepository } from './deadlines.repository';
import { DeadlinesService } from './deadlines.service';
import { HolidaysController } from '../holidays/holidays.controller';
import { HolidaysRepository } from '../holidays/holidays.repository';
import { HolidaysService } from '../holidays/holidays.service';

@Module({
  controllers: [DeadlinesController, HolidaysController],
  providers: [
    DeadlinesRepository,
    DeadlinesService,
    HolidaysRepository,
    HolidaysService,
    DeadlineCalculatorService,
  ],
  exports: [
    DeadlinesRepository,
    DeadlinesService,
    HolidaysRepository,
    HolidaysService,
    DeadlineCalculatorService,
  ],
})
export class DeadlinesModule {}
