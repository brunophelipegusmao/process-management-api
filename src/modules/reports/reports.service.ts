import { Injectable } from '@nestjs/common';

import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getOverview() {
    return this.reportsRepository.getOverview();
  }
}
