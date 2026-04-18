import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  ClientFiltersInput,
  CreateClientInput,
  UpdateClientInput,
} from '../../schema/zod';
import { ClientsRepository } from './clients.repository';

@Injectable()
export class ClientsService {
  constructor(private readonly clientsRepository: ClientsRepository) {}

  async findMany(filters: ClientFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const result = await this.clientsRepository.findMany({
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
    const client = await this.clientsRepository.findById(id);

    if (!client) {
      throw new NotFoundException({
        error: 'Client not found',
      });
    }

    return client;
  }

  async create(input: CreateClientInput) {
    const normalizedInput = {
      ...input,
      email: input.email.toLowerCase(),
    } satisfies CreateClientInput;

    await this.ensureUniqueEmail(normalizedInput.email);
    return this.clientsRepository.create(normalizedInput);
  }

  async update(id: string, input: UpdateClientInput) {
    await this.findById(id);

    const normalizedInput = {
      ...input,
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
    } satisfies UpdateClientInput;

    if (normalizedInput.email) {
      await this.ensureUniqueEmail(normalizedInput.email, id);
    }

    const client = await this.clientsRepository.update(id, normalizedInput);

    if (!client) {
      throw new NotFoundException({
        error: 'Client not found',
      });
    }

    return client;
  }

  async remove(id: string) {
    await this.findById(id);

    const client = await this.clientsRepository.remove(id);

    if (!client) {
      throw new NotFoundException({
        error: 'Client not found',
      });
    }

    return client;
  }

  private async ensureUniqueEmail(email: string, currentClientId?: string) {
    const existingClient = await this.clientsRepository.findByEmail(email);

    if (existingClient && existingClient.id !== currentClientId) {
      throw new ConflictException({
        error: 'Client email already exists',
      });
    }
  }
}
