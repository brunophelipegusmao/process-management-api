import { ConflictException, NotFoundException } from '@nestjs/common';

import { HolidaysService } from './holidays.service';
import type { HolidaysRepository } from './holidays.repository';

describe('HolidaysService', () => {
  let service: HolidaysService;
  let repository: jest.Mocked<HolidaysRepository>;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByDateRange: jest.fn(),
      findByScope: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<HolidaysRepository>;

    service = new HolidaysService(repository);
  });

  it('keeps manual holiday over automatic one on the same scope', async () => {
    repository.findByScope.mockResolvedValue({
      id: '8a2d93f9-c486-48c0-b9d8-40d27e2a1001',
      date: '2026-04-21',
      name: 'Tiradentes auto',
      type: 'nacional',
      state: null,
      municipality: null,
      source: 'manual',
      createdAt: new Date(),
    });

    const result = await service.create({
      date: new Date('2026-04-21T00:00:00.000Z'),
      name: 'Tiradentes auto',
      type: 'nacional',
      source: 'auto',
    });

    expect(repository.create).not.toHaveBeenCalled();
    expect(result.source).toBe('manual');
  });

  it('updates the existing automatic holiday when a manual override is created', async () => {
    repository.findByScope.mockResolvedValue({
      id: '8a2d93f9-c486-48c0-b9d8-40d27e2a1002',
      date: '2026-04-21',
      name: 'Tiradentes auto',
      type: 'nacional',
      state: null,
      municipality: null,
      source: 'auto',
      createdAt: new Date(),
    });
    repository.update.mockResolvedValue({
      id: '8a2d93f9-c486-48c0-b9d8-40d27e2a1002',
      date: '2026-04-21',
      name: 'Tiradentes manual',
      type: 'nacional',
      state: null,
      municipality: null,
      source: 'manual',
      createdAt: new Date(),
    });

    const result = await service.create({
      date: new Date('2026-04-21T00:00:00.000Z'),
      name: 'Tiradentes manual',
      type: 'nacional',
      source: 'manual',
    });

    expect(repository.update).toHaveBeenCalled();
    expect(result.source).toBe('manual');
  });

  it('returns applicable holiday dates with manual precedence', async () => {
    repository.findByDateRange.mockResolvedValue([
      {
        id: '1',
        date: '2026-04-21',
        name: 'Tiradentes auto',
        type: 'nacional',
        state: null,
        municipality: null,
        source: 'auto',
        createdAt: new Date(),
      },
      {
        id: '2',
        date: '2026-04-21',
        name: 'Tiradentes manual',
        type: 'nacional',
        state: null,
        municipality: null,
        source: 'manual',
        createdAt: new Date(),
      },
      {
        id: '3',
        date: '2026-04-22',
        name: 'Feriado estadual',
        type: 'estadual',
        state: 'SP',
        municipality: null,
        source: 'manual',
        createdAt: new Date(),
      },
    ]);

    const result = await service.getApplicableHolidayDateSet({
      startDate: new Date('2026-04-20T00:00:00.000Z'),
      endDate: new Date('2026-04-25T00:00:00.000Z'),
      state: 'SP',
    });

    expect(result).toEqual(new Set(['2026-04-21', '2026-04-22']));
  });

  it('rejects update when target holiday does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update('8a2d93f9-c486-48c0-b9d8-40d27e2a1999', {
        name: 'Feriado inexistente',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects update when another holiday already uses the same scope', async () => {
    repository.findById.mockResolvedValue({
      id: '8a2d93f9-c486-48c0-b9d8-40d27e2a1003',
      date: '2026-04-21',
      name: 'Atual',
      type: 'nacional',
      state: null,
      municipality: null,
      source: 'manual',
      createdAt: new Date(),
    });
    repository.findByScope.mockResolvedValue({
      id: '8a2d93f9-c486-48c0-b9d8-40d27e2a1004',
      date: '2026-04-22',
      name: 'Duplicado',
      type: 'nacional',
      state: null,
      municipality: null,
      source: 'manual',
      createdAt: new Date(),
    });

    await expect(
      service.update('8a2d93f9-c486-48c0-b9d8-40d27e2a1003', {
        date: new Date('2026-04-22T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
