import { Module } from '@nestjs/common';

import { DeadlineCalculatorService } from './deadline-calculator.service';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesRepository } from './deadlines.repository';
import { DeadlinesService } from './deadlines.service';
import { HolidaysController } from '../holydays/holidays.controller';
import { HolidaysRepository } from '../holydays/holidays.repository';
import { HolidaysService } from '../holydays/holidays.service';

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
