import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  CreateHolidayInput,
  HolidayFiltersInput,
  UpdateHolidayInput,
} from '../../schema/zod';
import {
  HolidaysRepository,
  type HolidayEntity,
  type HolidayScope,
} from './holidays.repository';

type ApplicableHolidayFilter = {
  startDate: Date;
  endDate: Date;
  state?: string;
  municipality?: string;
};

function normalizeState(state?: string | null) {
  const normalized = state?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeMunicipality(municipality?: string | null) {
  const normalized = municipality?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeDateKey(date: Date | string) {
  return typeof date === 'string' ? date : date.toISOString().slice(0, 10);
}

@Injectable()
export class HolidaysService {
  constructor(private readonly holidaysRepository: HolidaysRepository) {}

  async findMany(filters: HolidayFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const result = await this.holidaysRepository.findMany({
      ...filters,
      state: normalizeState(filters.state),
      municipality: normalizeMunicipality(filters.municipality),
      page,
      pageSize,
    });

    return {
      items: result.items,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    };
  }

  async findById(id: string) {
    const holiday = await this.holidaysRepository.findById(id);

    if (!holiday) {
      throw new NotFoundException({
        error: 'Holiday not found',
      });
    }

    return holiday;
  }

  async create(input: CreateHolidayInput) {
    const normalizedInput = this.normalizeCreateInput(input);
    const existingHoliday = await this.holidaysRepository.findByScope(
      this.toScope(normalizedInput),
    );

    if (
      existingHoliday?.source === 'manual' &&
      normalizedInput.source === 'auto'
    ) {
      return existingHoliday;
    }

    if (existingHoliday) {
      const updatedHoliday = await this.holidaysRepository.update(
        existingHoliday.id,
        normalizedInput,
      );

      if (!updatedHoliday) {
        throw new NotFoundException({
          error: 'Holiday not found',
        });
      }

      return updatedHoliday;
    }

    return this.holidaysRepository.create(normalizedInput);
  }

  async update(id: string, input: UpdateHolidayInput) {
    const currentHoliday = await this.findById(id);
    const normalizedInput = this.normalizeUpdateInput(currentHoliday, input);
    const existingHoliday = await this.holidaysRepository.findByScope(
      this.toScope(normalizedInput),
    );

    if (existingHoliday && existingHoliday.id !== id) {
      throw new ConflictException({
        error: 'Holiday already exists for the same scope',
      });
    }

    const holiday = await this.holidaysRepository.update(id, normalizedInput);

    if (!holiday) {
      throw new NotFoundException({
        error: 'Holiday not found',
      });
    }

    return holiday;
  }

  async remove(id: string) {
    await this.findById(id);

    const holiday = await this.holidaysRepository.remove(id);

    if (!holiday) {
      throw new NotFoundException({
        error: 'Holiday not found',
      });
    }

    return holiday;
  }

  async getApplicableHolidayDateSet(filter: ApplicableHolidayFilter) {
    const holidays = await this.holidaysRepository.findByDateRange(
      filter.startDate,
      filter.endDate,
    );
    const normalizedState = normalizeState(filter.state);
    const normalizedMunicipality = normalizeMunicipality(filter.municipality);
    const applicableByDate = new Map<string, HolidayEntity>();

    for (const holiday of holidays) {
      if (
        !this.isApplicable(holiday, normalizedState, normalizedMunicipality)
      ) {
        continue;
      }

      const dateKey = holiday.date;
      const currentHoliday = applicableByDate.get(dateKey);

      if (!currentHoliday || holiday.source === 'manual') {
        applicableByDate.set(dateKey, holiday);
      }
    }

    return new Set(applicableByDate.keys());
  }

  private normalizeCreateInput(input: CreateHolidayInput): CreateHolidayInput {
    return {
      ...input,
      state: normalizeState(input.state),
      municipality: normalizeMunicipality(input.municipality),
    };
  }

  private normalizeUpdateInput(
    currentHoliday: HolidayEntity,
    input: UpdateHolidayInput,
  ): {
    date: Date;
    name: string;
    type: HolidayScope['type'];
    state?: string;
    municipality?: string;
    source: HolidayEntity['source'];
  } {
    return {
      date: input.date ?? new Date(`${currentHoliday.date}T00:00:00.000Z`),
      name: input.name?.trim() ?? currentHoliday.name,
      type: input.type ?? currentHoliday.type,
      state:
        input.state !== undefined
          ? normalizeState(input.state)
          : normalizeState(currentHoliday.state),
      municipality:
        input.municipality !== undefined
          ? normalizeMunicipality(input.municipality)
          : normalizeMunicipality(currentHoliday.municipality),
      source: input.source ?? currentHoliday.source,
    };
  }

  private toScope(input: {
    date: Date;
    type: HolidayScope['type'];
    state?: string;
    municipality?: string;
  }): HolidayScope {
    return {
      date: normalizeDateKey(input.date),
      type: input.type,
      state: input.state,
      municipality: input.municipality,
    };
  }

  private isApplicable(
    holiday: HolidayEntity,
    state?: string,
    municipality?: string,
  ) {
    if (holiday.type === 'nacional') {
      return true;
    }

    if (holiday.type === 'estadual') {
      return Boolean(state && normalizeState(holiday.state) === state);
    }

    const holidayMunicipality = normalizeMunicipality(holiday.municipality);
    const holidayState = normalizeState(holiday.state);

    return Boolean(
      municipality &&
      holidayMunicipality === municipality &&
      (!holidayState || !state || holidayState === state),
    );
  }
}
