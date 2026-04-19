import { ReportsService } from './reports.service';
import type { ReportsRepository } from './reports.repository';

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: jest.Mocked<ReportsRepository>;

  beforeEach(() => {
    repository = {
      getOverview: jest.fn(),
    } as unknown as jest.Mocked<ReportsRepository>;

    service = new ReportsService(repository);
  });

  it('returns overview report with aggregated indicators', async () => {
    repository.getOverview.mockResolvedValue({
      processesTotal: 12,
      hearingsScheduled: 4,
      openDeadlines: 7,
      overdueDeadlines: 2,
      pendingWitnessData: 3,
      emailsSent: 5,
    });

    const result = await service.getOverview();

    expect(result).toEqual({
      processesTotal: 12,
      hearingsScheduled: 4,
      openDeadlines: 7,
      overdueDeadlines: 2,
      pendingWitnessData: 3,
      emailsSent: 5,
    });
  });
});
import { ReportsService } from './reports.service';
import type { ReportsRepository } from './reports.repository';

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: jest.Mocked<ReportsRepository>;

  beforeEach(() => {
    repository = {
      getOverview: jest.fn(),
    } as unknown as jest.Mocked<ReportsRepository>;

    service = new ReportsService(repository);
  });

  it('returns overview report with aggregated indicators', async () => {
    repository.getOverview.mockResolvedValue({
      processesTotal: 12,
      hearingsScheduled: 4,
      openDeadlines: 7,
      overdueDeadlines: 2,
      pendingWitnessData: 3,
      emailsSent: 5,
    });

    const result = await service.getOverview();

    expect(result).toEqual({
      processesTotal: 12,
      hearingsScheduled: 4,
      openDeadlines: 7,
      overdueDeadlines: 2,
      pendingWitnessData: 3,
      emailsSent: 5,
    });
  });
});
