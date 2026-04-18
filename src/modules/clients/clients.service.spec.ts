import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import type { ClientsRepository } from './clients.repository';
import type {
  ClientFiltersInput,
  CreateClientInput,
  UpdateClientInput,
} from '../../schema/zod';

describe('ClientsService', () => {
  let service: ClientsService;
  let repository: jest.Mocked<ClientsRepository>;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ClientsRepository>;

    service = new ClientsService(repository);
  });

  it('creates a client with normalized email when it is unique', async () => {
    const input: CreateClientInput = {
      name: 'Cliente A',
      email: 'CLIENTE@EXEMPLO.COM',
      phone: '11999999999',
      type: 'pf',
    };

    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: '1f3e7d0d-0af5-4287-a3b4-17d75f6ab001',
      name: 'Cliente A',
      email: 'cliente@exemplo.com',
      phone: '11999999999',
      type: 'pf',
      createdAt: new Date(),
    });

    const result = await service.create(input);

    expect(repository.findByEmail).toHaveBeenCalledWith('cliente@exemplo.com');
    expect(repository.create).toHaveBeenCalledWith({
      ...input,
      email: 'cliente@exemplo.com',
    });
    expect(result.email).toBe('cliente@exemplo.com');
  });

  it('rejects client creation when email already exists', async () => {
    repository.findByEmail.mockResolvedValue({
      id: '1f3e7d0d-0af5-4287-a3b4-17d75f6ab001',
      name: 'Cliente A',
      email: 'cliente@exemplo.com',
      phone: null,
      type: 'pf',
      createdAt: new Date(),
    });

    await expect(
      service.create({
        name: 'Cliente B',
        email: 'cliente@exemplo.com',
        type: 'pf',
        phone: undefined,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects update when target client does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update('1f3e7d0d-0af5-4287-a3b4-17d75f6ab001', {
        name: 'Novo Nome',
      } satisfies UpdateClientInput),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns paginated list payload', async () => {
    const filters: ClientFiltersInput = {
      page: 2,
      pageSize: 5,
      name: 'Cliente',
    };

    repository.findMany.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 5,
    });

    const result = await service.findMany(filters);

    expect(repository.findMany).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      name: 'Cliente',
    });
    expect(result.meta).toEqual({
      total: 0,
      page: 2,
      pageSize: 5,
    });
  });
});
