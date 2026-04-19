import { DeadlineCalculatorService } from './deadline-calculator.service';

describe('DeadlineCalculatorService', () => {
  let service: DeadlineCalculatorService;
  let holidaysService: {
    getApplicableHolidayDateSet: jest.Mock;
  };

  beforeEach(() => {
    holidaysService = {
      getApplicableHolidayDateSet: jest.fn(),
    };

    service = new DeadlineCalculatorService(holidaysService as never);
  });

  it('calculates business deadlines skipping weekends and holidays', async () => {
    holidaysService.getApplicableHolidayDateSet.mockResolvedValue(
      new Set(['2026-04-21']),
    );

    const result = await service.calculate({
      type: 'dados_testemunha',
      referenceDate: new Date('2026-04-17T00:00:00.000Z'),
      municipality: 'Sao Paulo',
      state: 'SP',
    });

    expect(result.toISOString().slice(0, 10)).toBe('2026-04-27');
  });

  it('calculates calendar deadlines without skipping weekends', async () => {
    holidaysService.getApplicableHolidayDateSet.mockResolvedValue(new Set());

    const result = await service.calculate({
      type: 'custas_precatoria',
      referenceDate: new Date('2026-04-17T00:00:00.000Z'),
    });

    expect(result.toISOString().slice(0, 10)).toBe('2026-04-22');
  });

  it('calculates hearing-based deadlines going backwards in business days', async () => {
    holidaysService.getApplicableHolidayDateSet.mockResolvedValue(new Set());

    const result = await service.calculate({
      type: 'juntada_intimacao',
      hearingDate: new Date('2026-04-29T00:00:00.000Z'),
      municipality: 'Campinas',
      state: 'SP',
    });

    expect(result.toISOString().slice(0, 10)).toBe('2026-04-22');
  });
});
