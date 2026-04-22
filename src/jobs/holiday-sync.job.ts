import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { HolidaysService } from '../modules/holidays/holidays.service';

type BrasilApiHoliday = {
  date: string;
  name: string;
};

@Injectable()
export class HolidaySyncJob {
  private readonly logger = new Logger(HolidaySyncJob.name);

  constructor(private readonly holidaysService: HolidaysService) {}

  @Cron('0 6 1 * *', {
    name: 'job-feriados',
    waitForCompletion: true,
  })
  async handleCron() {
    return this.sync();
  }

  async sync(referenceDate = new Date()) {
    const years = [
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCFullYear() + 1,
    ];
    let createdCount = 0;

    for (const year of years) {
      const holidays = await this.fetchHolidaysByYear(year);

      for (const holiday of holidays) {
        await this.holidaysService.create({
          date: new Date(`${holiday.date}T00:00:00.000Z`),
          name: holiday.name,
          type: 'nacional',
          source: 'auto',
        });

        createdCount += 1;
      }
    }

    this.logger.log(`job-feriados completed createdCount=${createdCount}`);

    return {
      createdCount,
      years,
    };
  }

  private async fetchHolidaysByYear(year: number): Promise<BrasilApiHoliday[]> {
    const response = await fetch(
      `https://brasilapi.com.br/api/feriados/v1/${year}`,
    );

    if (!response.ok) {
      throw new Error(`BrasilAPI holiday sync failed for year ${year}`);
    }

    return (await response.json()) as BrasilApiHoliday[];
  }
}
