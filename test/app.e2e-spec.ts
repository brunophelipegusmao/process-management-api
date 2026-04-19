import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';

const mockedGetSessionFromHeaders = jest.fn();
const mockedRegisterAuthRoutes = jest.fn(
  async (app: NestFastifyApplication) => {
    const fastify = app.getHttpAdapter().getInstance();

    fastify.post('/auth/sign-in/email', async (_request, reply) => {
      reply.status(400).send({
        code: 'INVALID_EMAIL',
      });
    });
  },
);

jest.mock('./../src/modules/auth/auth', () => ({
  getSessionFromHeaders: (...args: unknown[]) =>
    mockedGetSessionFromHeaders(...args),
  registerAuthRoutes: (...args: unknown[]) => mockedRegisterAuthRoutes(...args),
}));

import { AppModule } from './../src/app.module';
import { db, sql } from './../src/infra/database/client';
import { auditLogs, clients, users } from './../src/schema';
import { registerAuthRoutes } from './../src/modules/auth/auth';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;
  let createdClientIds: string[];
  let createdUserIds: string[];
  let auditUserIds: string[];

  beforeEach(() => {
    mockedGetSessionFromHeaders.mockReset();
    mockedGetSessionFromHeaders.mockResolvedValue(null);
    mockedRegisterAuthRoutes.mockClear();
    createdClientIds = [];
    createdUserIds = [];
    auditUserIds = [];
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await registerAuthRoutes(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/ (GET)', async () => {
    const result = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(result.statusCode).toEqual(200);
    expect(result.json()).toEqual({
      data: 'Hello World!',
    });
  });

  it('/missing (GET)', async () => {
    const result = await app.inject({
      method: 'GET',
      url: '/missing',
    });

    expect(result.statusCode).toEqual(404);
    expect(result.json()).toEqual({
      error: 'Not Found',
      details: 'Cannot GET /missing',
    });
  });

  it('/me (GET) blocks unauthenticated access', async () => {
    const result = await app.inject({
      method: 'GET',
      url: '/me',
    });

    expect(result.statusCode).toEqual(401);
    expect(result.json()).toEqual({
      error: 'Unauthorized',
      details: 'Authentication required',
    });
  });

  it('/auth/sign-in/email (POST) is publicly mounted', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/auth/sign-in/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {},
    });

    expect(result.statusCode).toEqual(400);
    expect(result.json()).toMatchObject({
      code: expect.any(String),
    });
  });

  it('/clients (POST/GET) persists and lists clients for authenticated staff', async () => {
    mockedGetSessionFromHeaders.mockResolvedValue({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Advogado Teste',
        email: 'advogado@teste.com',
        profile: 'advogado',
        active: true,
      },
    });

    const uniqueSuffix = Date.now();
    const createResponse = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        name: 'Cliente E2E',
        email: `cliente-${uniqueSuffix}@teste.com`,
        phone: '11999999999',
        type: 'pf',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      data: {
        id: expect.any(String),
        name: 'Cliente E2E',
        email: `cliente-${uniqueSuffix}@teste.com`,
        type: 'pf',
      },
    });

    createdClientIds.push(createResponse.json().data.id);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/clients',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.json().data.id,
          email: `cliente-${uniqueSuffix}@teste.com`,
        }),
      ]),
      meta: expect.objectContaining({
        total: expect.any(Number),
        page: 1,
        pageSize: 10,
      }),
    });
  });

  it('/users (POST/GET) persists and lists users for superadmin', async () => {
    const actingUserId = '22222222-2222-4222-8222-222222222222';

    await db.insert(users).values({
      id: actingUserId,
      name: 'Superadmin Teste',
      email: 'superadmin@teste.com',
      profile: 'superadmin',
      active: true,
      emailVerified: true,
    });

    createdUserIds.push(actingUserId);
    auditUserIds.push(actingUserId);

    mockedGetSessionFromHeaders.mockResolvedValue({
      user: {
        id: actingUserId,
        name: 'Superadmin Teste',
        email: 'superadmin@teste.com',
        profile: 'superadmin',
        active: true,
      },
    });

    const uniqueSuffix = Date.now();
    const createResponse = await app.inject({
      method: 'POST',
      url: '/users',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        name: 'Usuario E2E',
        email: `usuario-${uniqueSuffix}@teste.com`,
        profile: 'paralegal',
        active: true,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      data: {
        id: expect.any(String),
        name: 'Usuario E2E',
        email: `usuario-${uniqueSuffix}@teste.com`,
        profile: 'paralegal',
        active: true,
      },
    });

    createdUserIds.push(createResponse.json().data.id);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/users',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.json().data.id,
          email: `usuario-${uniqueSuffix}@teste.com`,
        }),
      ]),
      meta: expect.objectContaining({
        total: expect.any(Number),
        page: 1,
        pageSize: 10,
      }),
    });
  });

  it('/reports/overview (GET) returns aggregated indicators for advogado', async () => {
    mockedGetSessionFromHeaders.mockResolvedValue({
      user: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Advogado Relatorios',
        email: 'relatorios@teste.com',
        profile: 'advogado',
        active: true,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/reports/overview',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        processesTotal: expect.any(Number),
        hearingsScheduled: expect.any(Number),
        openDeadlines: expect.any(Number),
        overdueDeadlines: expect.any(Number),
        pendingWitnessData: expect.any(Number),
        emailsSent: expect.any(Number),
      },
    });
  });

  it('/reports/overview (GET) blocks paralegal access', async () => {
    mockedGetSessionFromHeaders.mockResolvedValue({
      user: {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Paralegal Teste',
        email: 'paralegal@teste.com',
        profile: 'paralegal',
        active: true,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/reports/overview',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: 'Forbidden',
      details: 'Insufficient permissions',
    });
  });

  afterEach(async () => {
    for (const auditUserId of auditUserIds) {
      await db.delete(auditLogs).where(eq(auditLogs.userId, auditUserId));
    }

    for (const clientId of createdClientIds) {
      await db.delete(clients).where(eq(clients.id, clientId));
    }

    for (const userId of createdUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }

    await app.close();
  });

  afterAll(async () => {
    await sql.end({ timeout: 1 });
  });
});
