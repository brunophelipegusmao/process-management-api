import { ConflictException, NotFoundException } from '@nestjs/common';

import type { ClientsRepository } from '../../clients/clients.repository';
import type { ProcessesRepository } from './processes.repository';
import { ProcessesService } from './processes.service';
import type {
  CreateProcessInput,
  ProcessFiltersInput,
  UpdateProcessInput,
} from '../../schema/zod';

describe('ProcessesService', () => {
  let service: ProcessesService;
  let processesRepository: jest.Mocked<ProcessesRepository>;
  let clientsRepository: jest.Mocked<ClientsRepository>;

  beforeEach(() => {
    processesRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByCnjNumber: jest.fn(),
      findByClientId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ProcessesRepository>;

    clientsRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ClientsRepository>;

    service = new ProcessesService(processesRepository, clientsRepository);
  });

  it('creates a process when client exists and CNJ is unique', async () => {
    const input: CreateProcessInput = {
      clientId: '1f3e7d0d-0af5-4287-a3b4-17d75f6ab001',
      cnjNumber: '0000000-00.2026.8.26.0001',
      comarca: 'Sao Paulo',
      vara: '1 Vara Civel',
      courtType: 'vara',
      authorName: 'Autor A',
      defendantName: 'Reu B',
      clientSide: 'reu',
      status: 'citado',
      citationDate: new Date('2026-04-10T00:00:00.000Z'),
      mentionsWitness: false,
    };

    clientsRepository.findById.mockResolvedValue({
      id: input.clientId,
      name: 'Cliente A',
      email: 'cliente@exemplo.com',
      phone: null,
      type: 'pf',
      createdAt: new Date(),
    });
    processesRepository.findByCnjNumber.mockResolvedValue(null);
    processesRepository.create.mockResolvedValue({
      id: '7b5f15c1-e7fd-4af7-8d22-fdc4b42dd100',
      ...input,
      mentionsWitness: false,
      citationDate: '2026-04-10',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(input);

    expect(clientsRepository.findById).toHaveBeenCalledWith(input.clientId);
    expect(processesRepository.findByCnjNumber).toHaveBeenCalledWith(
      input.cnjNumber,
    );
    expect(processesRepository.create).toHaveBeenCalledWith(input);
    expect(result.cnjNumber).toBe(input.cnjNumber);
  });

  it('rejects process creation when CNJ already exists', async () => {
    clientsRepository.findById.mockResolvedValue({
      id: '1f3e7d0d-0af5-4287-a3b4-17d75f6ab001',
      name: 'Cliente A',
      email: 'cliente@exemplo.com',
      phone: null,
      type: 'pf',
      createdAt: new Date(),
    });
    processesRepository.findByCnjNumber.mockResolvedValue({
      id: '7b5f15c1-e7fd-4af7-8d22-fdc4b42dd100',
      clientId: '1f3e7d0d-0af5-4287-a3b4-17d75f6ab001',
      cnjNumber: '0000000-00.2026.8.26.0001',
      comarca: 'Sao Paulo',
      vara: '1 Vara Civel',
      courtType: 'vara',
      authorName: 'Autor A',
      defendantName: 'Reu B',
      clientSide: 'reu',
      status: 'citado',
      citationDate: '2026-04-10',
      mentionsWitness: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.create({
        clientId: '1f3e7d0d-0af5-4287-a3b4-17d75f6ab001',
        cnjNumber: '0000000-00.2026.8.26.0001',
        comarca: 'Sao Paulo',
        vara: '1 Vara Civel',
        courtType: 'vara',
        authorName: 'Autor A',
        defendantName: 'Reu B',
        clientSide: 'reu',
        status: 'citado',
        citationDate: new Date('2026-04-10T00:00:00.000Z'),
        mentionsWitness: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects process creation when client does not exist', async () => {
    clientsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({
        clientId: '1f3e7d0d-0af5-4287-a3b4-17d75f6ab001',
        cnjNumber: '0000000-00.2026.8.26.0001',
        comarca: 'Sao Paulo',
        vara: '1 Vara Civel',
        courtType: 'vara',
        authorName: 'Autor A',
        defendantName: 'Reu B',
        clientSide: 'reu',
        status: 'citado',
        citationDate: new Date('2026-04-10T00:00:00.000Z'),
        mentionsWitness: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects update when target process does not exist', async () => {
    processesRepository.findById.mockResolvedValue(null);

    await expect(
      service.update('7b5f15c1-e7fd-4af7-8d22-fdc4b42dd100', {
        status: 'encerrado',
      } satisfies UpdateProcessInput),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns paginated list payload', async () => {
    const filters: ProcessFiltersInput = {
      page: 2,
      pageSize: 5,
      status: 'citado',
      courtType: 'vara',
    };

    processesRepository.findMany.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 5,
    });

    const result = await service.findMany(filters);

    expect(processesRepository.findMany).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      status: 'citado',
      courtType: 'vara',
    });
    expect(result.meta).toEqual({
      total: 0,
      page: 2,
      pageSize: 5,
    });
  });
});
