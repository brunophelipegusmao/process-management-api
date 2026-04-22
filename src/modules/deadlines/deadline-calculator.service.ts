import { BadRequestException, Injectable } from '@nestjs/common';

import type { CreateDeadlineInput } from '../../schema/zod';
import { HolidaysService } from '../holidays/holidays.service';

export type DeadlineCalculationInput = {
  type: CreateDeadlineInput['type'];
  referenceDate?: Date;
  hearingDate?: Date;
  state?: string;
  municipality?: string;
};

function startOfUtcDay(date: Date) {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function addUtcDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + amount);
  return startOfUtcDay(nextDate);
}

function isWeekend(date: Date) {
  const weekday = date.getUTCDay();
  return weekday === 0 || weekday === 6;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class DeadlineCalculatorService {
  constructor(private readonly holidaysService: HolidaysService) {}

  async calculate(input: DeadlineCalculationInput) {
    switch (input.type) {
      case 'dados_testemunha':
        return this.addBusinessDays(
          input.referenceDate ?? new Date(),
          5,
          input.state,
          input.municipality,
        );
      case 'custas_precatoria':
        return addUtcDays(startOfUtcDay(input.referenceDate ?? new Date()), 5);
      case 'providencia_cliente':
        return this.addBusinessDays(
          input.referenceDate ?? new Date(),
          3,
          input.state,
          input.municipality,
        );
      case 'juntada_intimacao':
      case 'desistencia_testemunha':
        if (!input.hearingDate) {
          throw new BadRequestException({
            error: 'hearingDate is required for the selected deadline type',
          });
        }

        return this.subtractBusinessDays(
          input.hearingDate,
          5,
          input.state,
          input.municipality,
        );
    }
  }

  private async addBusinessDays(
    baseDate: Date,
    amount: number,
    state?: string,
    municipality?: string,
  ) {
    const startDate = startOfUtcDay(baseDate);
    const endDate = addUtcDays(startDate, Math.max(amount * 4, 10));
    const holidaySet = await this.holidaysService.getApplicableHolidayDateSet({
      startDate,
      endDate,
      state,
      municipality,
    });

    let remainingDays = amount;
    let currentDate = startDate;

    while (remainingDays > 0) {
      currentDate = addUtcDays(currentDate, 1);

      if (isWeekend(currentDate) || holidaySet.has(toDateKey(currentDate))) {
        continue;
      }

      remainingDays -= 1;
    }

    return currentDate;
  }

  private async subtractBusinessDays(
    baseDate: Date,
    amount: number,
    state?: string,
    municipality?: string,
  ) {
    const endDate = startOfUtcDay(baseDate);
    const startDate = addUtcDays(endDate, -Math.max(amount * 4, 10));
    const holidaySet = await this.holidaysService.getApplicableHolidayDateSet({
      startDate,
      endDate,
      state,
      municipality,
    });

    let remainingDays = amount;
    let currentDate = endDate;

    while (remainingDays > 0) {
      currentDate = addUtcDays(currentDate, -1);

      if (isWeekend(currentDate) || holidaySet.has(toDateKey(currentDate))) {
        continue;
      }

      remainingDays -= 1;
    }

    return currentDate;
  }
}
