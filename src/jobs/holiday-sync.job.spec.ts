import { HolidaySyncJob } from './holiday-sync.job';
import type { HolidaysService } from '../modules/holidays/holidays.service';

describe('HolidaySyncJob', () => {
  let job: HolidaySyncJob;
  let holidaysService: jest.Mocked<HolidaysService>;

  beforeEach(() => {
    holidaysService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<HolidaysService>;

    job = new HolidaySyncJob(holidaysService);
  });

  it('syncs current and next year holidays from BrasilAPI as automatic national holidays', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { date: '2026-04-21', name: 'Tiradentes' },
          { date: '2026-12-25', name: 'Natal' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ date: '2027-01-01', name: 'Confraternizacao' }],
      });

    const originalFetch = global.fetch;
    global.fetch = fetchMock as typeof fetch;

    try {
      const result = await job.sync(new Date('2026-04-19T00:00:00.000Z'));

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://brasilapi.com.br/api/feriados/v1/2026',
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://brasilapi.com.br/api/feriados/v1/2027',
      );
      expect(holidaysService.create).toHaveBeenCalledTimes(3);
      expect(holidaysService.create).toHaveBeenCalledWith({
        date: new Date('2026-04-21T00:00:00.000Z'),
        name: 'Tiradentes',
        type: 'nacional',
        source: 'auto',
      });
      expect(result.createdCount).toBe(3);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
import { HolidaySyncJob } from './holiday-sync.job';
import type { HolidaysService } from '../modules/holidays/holidays.service';

describe('HolidaySyncJob', () => {
  let job: HolidaySyncJob;
  let holidaysService: jest.Mocked<HolidaysService>;

  beforeEach(() => {
    holidaysService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<HolidaysService>;

    job = new HolidaySyncJob(holidaysService);
  });

  it('syncs current and next year holidays from BrasilAPI as automatic national holidays', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { date: '2026-04-21', name: 'Tiradentes' },
          { date: '2026-12-25', name: 'Natal' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ date: '2027-01-01', name: 'Confraternizacao' }],
      });

    const originalFetch = global.fetch;
    global.fetch = fetchMock as typeof fetch;

    try {
      const result = await job.sync(new Date('2026-04-19T00:00:00.000Z'));

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://brasilapi.com.br/api/feriados/v1/2026',
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://brasilapi.com.br/api/feriados/v1/2027',
      );
      expect(holidaysService.create).toHaveBeenCalledTimes(3);
      expect(holidaysService.create).toHaveBeenCalledWith({
        date: new Date('2026-04-21T00:00:00.000Z'),
        name: 'Tiradentes',
        type: 'nacional',
        source: 'auto',
      });
      expect(result.createdCount).toBe(3);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
