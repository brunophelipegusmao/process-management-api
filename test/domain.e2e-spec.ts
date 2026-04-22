import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { and, eq, inArray } from 'drizzle-orm';

// ── Auth mock (must be before AppModule import) ─────────────────────────────

const mockedGetSessionFromHeaders = jest.fn();
const mockedRegisterAuthRoutes = jest.fn(
  async (app: NestFastifyApplication) => {
    const fastify = app.getHttpAdapter().getInstance();
    fastify.post('/auth/sign-in/email', async (_req, reply) => {
      reply.status(400).send({ code: 'INVALID_EMAIL' });
    });
  },
);

jest.mock('./../src/modules/auth/auth', () => ({
  getSessionFromHeaders: (...args: unknown[]) =>
    mockedGetSessionFromHeaders(...args),
  registerAuthRoutes: (...args: unknown[]) => mockedRegisterAuthRoutes(...args),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { AppModule } from './../src/app.module';
import { db, sql } from './../src/infra/database/client';
import {
  auditLogs,
  clients,
  deadlines,
  emails,
  hearings,
  processes,
  users,
  witnesses,
} from './../src/schema';
import { registerAuthRoutes } from './../src/modules/auth/auth';

// ── Helpers ──────────────────────────────────────────────────────────────────

// These UUIDs must exist in the DB for routes protected by the AuditInterceptor,
// because the interceptor inserts audit_logs with a FK to users.id.
const ADVOGADO_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PARALEGAL_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const ADVOGADO_SESSION = {
  user: {
    id: ADVOGADO_ID,
    name: 'Advogado E2E',
    email: 'advogado-e2e@teste.com',
    profile: 'advogado',
    active: true,
  },
};

const PARALEGAL_SESSION = {
  user: {
    id: PARALEGAL_ID,
    name: 'Paralegal E2E',
    email: 'paralegal-e2e@teste.com',
    profile: 'paralegal',
    active: true,
  },
};

// ── Suite ────────────────────────────────────────────────────────────────────

describe('Domain flows (e2e)', () => {
  let app: NestFastifyApplication;

  // Track IDs for cleanup — order matters (FKs with restrict)
  let clientIds: string[] = [];
  let processIds: string[] = [];
  let hearingIds: string[] = [];
  let witnessIds: string[] = [];
  let deadlineIds: string[] = [];
  let auditUserIds: string[] = [ADVOGADO_ID, PARALEGAL_ID];

  beforeAll(async () => {
    // Pre-create users required by AuditInterceptor FK constraint
    for (const [id, name, email, profile] of [
      [ADVOGADO_ID, 'Advogado E2E', 'advogado-e2e@teste.com', 'advogado'],
      [PARALEGAL_ID, 'Paralegal E2E', 'paralegal-e2e@teste.com', 'paralegal'],
    ] as const) {
      await db
        .insert(users)
        .values({ id, name, email, profile, active: true, emailVerified: true })
        .onConflictDoNothing();
    }
  });

  afterAll(async () => {
    await db.delete(auditLogs).where(inArray(auditLogs.userId, [ADVOGADO_ID, PARALEGAL_ID]));
    await db.delete(users).where(inArray(users.id, [ADVOGADO_ID, PARALEGAL_ID]));
    await sql.end({ timeout: 1 });
  });

  beforeEach(() => {
    mockedGetSessionFromHeaders.mockReset();
    mockedGetSessionFromHeaders.mockResolvedValue(null);
    mockedRegisterAuthRoutes.mockClear();
    clientIds = [];
    processIds = [];
    hearingIds = [];
    witnessIds = [];
    deadlineIds = [];
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

  afterEach(async () => {
    // Cleanup in FK-safe order (restrict constraints)
    if (processIds.length) {
      await db
        .delete(auditLogs)
        .where(inArray(auditLogs.processId, processIds));
      await db.delete(emails).where(inArray(emails.processId, processIds));
      await db
        .delete(deadlines)
        .where(inArray(deadlines.processId, processIds));
      await db
        .delete(witnesses)
        .where(inArray(witnesses.processId, processIds));
      await db
        .delete(hearings)
        .where(inArray(hearings.processId, processIds));
      await db.delete(processes).where(inArray(processes.id, processIds));
    }
    if (clientIds.length) {
      await db.delete(clients).where(inArray(clients.id, clientIds));
    }

    await app.close();
  });

  // ── Setup helpers ──────────────────────────────────────────────────────────

  async function createClient(suffix: string) {
    mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
    const res = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { 'content-type': 'application/json' },
      payload: {
        name: 'Cliente Domínio',
        email: `cliente-domain-${suffix}@teste.com`,
        type: 'pj',
      },
    });
    expect(res.statusCode).toBe(201);
    const id: string = res.json().data.id as string;
    clientIds.push(id);
    return id;
  }

  async function createProcess(
    clientId: string,
    suffix: string,
    mentionsWitness = false,
    courtType: 'vara' | 'jec' = 'vara',
  ) {
    mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
    const res = await app.inject({
      method: 'POST',
      url: '/processes',
      headers: { 'content-type': 'application/json' },
      payload: {
        clientId,
        cnjNumber: `0000001-${suffix}.2024.8.26.0001`,
        comarca: 'São Paulo',
        vara: '1ª Vara Cível',
        courtType,
        authorName: 'Autor Teste',
        defendantName: 'Réu Teste',
        clientSide: 'reu',
        mentionsWitness,
      },
    });
    expect(res.statusCode).toBe(201);
    const id: string = res.json().data.id as string;
    processIds.push(id);
    return id;
  }

  // ── Health ─────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 without authentication', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        data: {
          status: 'ok',
          uptime: expect.any(Number),
          timestamp: expect.any(String),
        },
      });
    });

    it('returns 401 on protected route without session', async () => {
      const res = await app.inject({ method: 'GET', url: '/clients' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Reports ────────────────────────────────────────────────────────────────

  describe('GET /reports/*', () => {
    it('overview returns aggregated indicators', async () => {
      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
      const res = await app.inject({
        method: 'GET',
        url: '/reports/overview',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
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

    it('deadlines-by-status returns grouped counts', async () => {
      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
      const res = await app.inject({
        method: 'GET',
        url: '/reports/deadlines-by-status',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('data');
      expect(typeof res.json().data).toBe('object');
    });

    it('witnesses-by-status returns grouped counts', async () => {
      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
      const res = await app.inject({
        method: 'GET',
        url: '/reports/witnesses-by-status',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('data');
      expect(typeof res.json().data).toBe('object');
    });

    it('upcoming-hearings returns list', async () => {
      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
      const res = await app.inject({
        method: 'GET',
        url: '/reports/upcoming-hearings',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ data: expect.any(Array) });
    });

    it('blocks paralegal on /reports/overview', async () => {
      mockedGetSessionFromHeaders.mockResolvedValue(PARALEGAL_SESSION);
      const res = await app.inject({
        method: 'GET',
        url: '/reports/overview',
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── Witnesses ──────────────────────────────────────────────────────────────

  describe('Witnesses', () => {
    jest.setTimeout(30_000);
    it('creates a witness when mentionsWitness=true', async () => {
      const suffix = Date.now().toString();
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, true);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
      const res = await app.inject({
        method: 'POST',
        url: '/witnesses',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          fullName: 'Testemunha Exemplo',
          address: 'Rua das Flores, 123',
          residenceComarca: 'São Paulo',
          side: 'reu',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        data: {
          id: expect.any(String),
          fullName: 'Testemunha Exemplo',
          replaced: false,
        },
      });
      witnessIds.push(res.json().data.id as string);
    });

    it('blocks witness creation when mentionsWitness=false (422)', async () => {
      const suffix = `${Date.now()}b`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, false);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
      const res = await app.inject({
        method: 'POST',
        url: '/witnesses',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          fullName: 'Testemunha Bloqueada',
          side: 'reu',
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it('blocks CPF field in witness payload (400)', async () => {
      const suffix = `${Date.now()}c`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, true);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);
      const res = await app.inject({
        method: 'POST',
        url: '/witnesses',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          fullName: 'Testemunha CPF',
          side: 'reu',
          cpf: '123.456.789-00',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('enforces JEC limit of 4 witnesses (GATE-2) (409)', async () => {
      const suffix = `${Date.now()}d`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, true, 'jec');

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);

      for (let i = 1; i <= 4; i++) {
        const r = await app.inject({
          method: 'POST',
          url: '/witnesses',
          headers: { 'content-type': 'application/json' },
          payload: {
            processId,
            fullName: `Testemunha JEC ${i}`,
            side: 'reu',
          },
        });
        expect(r.statusCode).toBe(201);
        witnessIds.push(r.json().data.id as string);
      }

      const overflow = await app.inject({
        method: 'POST',
        url: '/witnesses',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          fullName: 'Testemunha JEC 5 (overflow)',
          side: 'reu',
        },
      });

      expect(overflow.statusCode).toBe(409);
      expect(overflow.json()).toMatchObject({
        error: expect.any(String),
      });
    });

    it('substitutes a witness and marks original as replaced', async () => {
      const suffix = `${Date.now()}e`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, true);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);

      const original = await app.inject({
        method: 'POST',
        url: '/witnesses',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          fullName: 'Original',
          side: 'reu',
        },
      });
      expect(original.statusCode).toBe(201);
      const originalId: string = original.json().data.id as string;
      witnessIds.push(originalId);

      const replacement = await app.inject({
        method: 'POST',
        url: `/witnesses/${originalId}/replace`,
        headers: { 'content-type': 'application/json' },
        payload: {
          fullName: 'Substituta',
          side: 'reu',
        },
      });

      expect(replacement.statusCode).toBe(201);
      witnessIds.push(replacement.json().data.id as string);

      const check = await app.inject({
        method: 'GET',
        url: `/witnesses/${originalId}`,
      });

      expect(check.json()).toMatchObject({
        data: { replaced: true, status: 'substituida' },
      });
    });

    it('marks witness as desistida', async () => {
      const suffix = `${Date.now()}f`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, true);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);

      const created = await app.inject({
        method: 'POST',
        url: '/witnesses',
        headers: { 'content-type': 'application/json' },
        payload: { processId, fullName: 'Testemunha Desistente', side: 'reu' },
      });
      expect(created.statusCode).toBe(201);
      const wId: string = created.json().data.id as string;
      witnessIds.push(wId);

      const retire = await app.inject({
        method: 'DELETE',
        url: `/witnesses/${wId}`,
      });

      expect(retire.statusCode).toBe(200);
      expect(retire.json()).toMatchObject({
        data: { status: 'desistida' },
      });
    });
  });

  // ── Hearings ───────────────────────────────────────────────────────────────

  describe('Hearings', () => {
    it('creates, cancels and cascades deadline cancellation', async () => {
      const suffix = `${Date.now()}h`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, false);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      const created = await app.inject({
        method: 'POST',
        url: '/hearings',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          dateTime: futureDate.toISOString(),
          type: 'conciliacao',
        },
      });

      expect(created.statusCode).toBe(201);
      const hearingId: string = created.json().data.id as string;
      hearingIds.push(hearingId);

      const cancel = await app.inject({
        method: 'DELETE',
        url: `/hearings/${hearingId}`,
      });

      expect(cancel.statusCode).toBe(200);
      expect(cancel.json()).toMatchObject({
        data: { status: 'cancelada' },
      });

      // All open deadlines for this process must be cancelled
      const openDeadlines = await db
        .select()
        .from(deadlines)
        .where(
          and(
            eq(deadlines.processId, processId),
            eq(deadlines.status, 'aberto'),
          ),
        );
      expect(openDeadlines).toHaveLength(0);
    });

    it('reschedules a hearing and sets status to redesignada', async () => {
      const suffix = `${Date.now()}i`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, false);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);

      const originalDate = new Date();
      originalDate.setMonth(originalDate.getMonth() + 2);

      const created = await app.inject({
        method: 'POST',
        url: '/hearings',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          dateTime: originalDate.toISOString(),
          type: 'aij',
        },
      });
      expect(created.statusCode).toBe(201);
      const hearingId: string = created.json().data.id as string;
      hearingIds.push(hearingId);

      const newDate = new Date();
      newDate.setMonth(newDate.getMonth() + 4);

      const reschedule = await app.inject({
        method: 'POST',
        url: `/hearings/${hearingId}/reschedule`,
        headers: { 'content-type': 'application/json' },
        payload: { dateTime: newDate.toISOString() },
      });

      expect(reschedule.statusCode).toBe(201);
      hearingIds.push(reschedule.json().data.id as string);

      const check = await app.inject({
        method: 'GET',
        url: `/hearings/${hearingId}`,
      });
      expect(check.json()).toMatchObject({
        data: { status: 'redesignada' },
      });
    });
  });

  // ── Deadlines ──────────────────────────────────────────────────────────────

  describe('Deadlines', () => {
    it('creates and fulfills a deadline', async () => {
      const suffix = `${Date.now()}dl`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, false);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);

      const refDate = new Date();
      refDate.setDate(refDate.getDate() + 10);

      const created = await app.inject({
        method: 'POST',
        url: '/deadlines',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          type: 'custas_precatoria',
          referenceDate: refDate.toISOString().split('T')[0],
        },
      });

      expect(created.statusCode).toBe(201);
      const dlId: string = created.json().data.id as string;
      deadlineIds.push(dlId);

      const fulfill = await app.inject({
        method: 'PATCH',
        url: `/deadlines/${dlId}`,
        headers: { 'content-type': 'application/json' },
        payload: { status: 'cumprido' },
      });

      expect(fulfill.statusCode).toBe(200);
      expect(fulfill.json()).toMatchObject({
        data: { status: 'cumprido' },
      });
    });

    it('blocks deadline creation for replaced witness (GATE-4) (422)', async () => {
      const suffix = `${Date.now()}gate4`;
      const clientId = await createClient(suffix);
      const processId = await createProcess(clientId, suffix, true);

      mockedGetSessionFromHeaders.mockResolvedValue(ADVOGADO_SESSION);

      const witnessRes = await app.inject({
        method: 'POST',
        url: '/witnesses',
        headers: { 'content-type': 'application/json' },
        payload: { processId, fullName: 'Testemunha GATE-4', side: 'reu' },
      });
      expect(witnessRes.statusCode).toBe(201);
      const wId: string = witnessRes.json().data.id as string;
      witnessIds.push(wId);

      // Replace the witness
      const replaceRes = await app.inject({
        method: 'POST',
        url: `/witnesses/${wId}/replace`,
        headers: { 'content-type': 'application/json' },
        payload: { fullName: 'Substituta GATE-4', side: 'reu' },
      });
      expect(replaceRes.statusCode).toBe(201);
      witnessIds.push(replaceRes.json().data.id as string);

      // Try to create a deadline for the replaced witness
      const refDate = new Date();
      refDate.setDate(refDate.getDate() + 10);

      const dlRes = await app.inject({
        method: 'POST',
        url: '/deadlines',
        headers: { 'content-type': 'application/json' },
        payload: {
          processId,
          witnessId: wId,
          type: 'dados_testemunha',
          referenceDate: refDate.toISOString().split('T')[0],
        },
      });

      expect(dlRes.statusCode).toBe(422);
    });
  });
});
