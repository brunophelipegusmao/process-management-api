import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ClientsRepository } from '../clients/clients.repository';
import { auditContext } from '../../common/interceptors/audit-context';
import type {
  CreateProcessInput,
  ProcessFiltersInput,
  UpdateProcessInput,
} from '../../schema/zod';
import { ProcessesRepository } from './processes.repository';

@Injectable()
export class ProcessesService {
  constructor(
    private readonly processesRepository: ProcessesRepository,
    private readonly clientsRepository: ClientsRepository,
  ) {}

  async findMany(filters: ProcessFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const result = await this.processesRepository.findMany({
      ...filters,
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
    const process = await this.processesRepository.findById(id);

    if (!process) {
      throw new NotFoundException({
        error: 'Process not found',
      });
    }

    return process;
  }

  async findByClientId(clientId: string) {
    await this.ensureClientExists(clientId);
    return this.processesRepository.findByClientId(clientId);
  }

  async create(input: CreateProcessInput) {
    await this.ensureClientExists(input.clientId);
    await this.ensureUniqueCnj(input.cnjNumber);

    return this.processesRepository.create(input);
  }

  async update(id: string, input: UpdateProcessInput) {
    const currentProcess = await this.findById(id);
    auditContext.setPreviousData(currentProcess);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    if (input.cnjNumber) {
      await this.ensureUniqueCnj(input.cnjNumber, currentProcess.id);
    }

    const process = await this.processesRepository.update(id, input);

    if (!process) {
      throw new NotFoundException({
        error: 'Process not found',
      });
    }

    return process;
  }

  async remove(id: string) {
    const currentProcess = await this.findById(id);
    auditContext.setPreviousData(currentProcess);

    const process = await this.processesRepository.remove(id);

    if (!process) {
      throw new NotFoundException({
        error: 'Process not found',
      });
    }

    return process;
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.clientsRepository.findById(clientId);

    if (!client) {
      throw new NotFoundException({
        error: 'Client not found',
      });
    }
  }

  private async ensureUniqueCnj(cnjNumber: string, currentProcessId?: string) {
    const existingProcess =
      await this.processesRepository.findByCnjNumber(cnjNumber);

    if (existingProcess && existingProcess.id !== currentProcessId) {
      throw new ConflictException({
        error: 'Process CNJ already exists',
      });
    }
  }
}
