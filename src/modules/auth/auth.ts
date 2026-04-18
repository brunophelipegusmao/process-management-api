import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { appEnv } from '../../config/app-env';
import { db } from '../../infra/database/client';
import { accounts, sessions, users, verifications } from '../../schema';

type BetterAuthInstance = Awaited<ReturnType<typeof createAuth>>;

let authPromise: Promise<BetterAuthInstance> | undefined;

async function createAuth() {
  const [{ betterAuth }, { drizzleAdapter }] = await Promise.all([
    import('better-auth'),
    import('better-auth/adapters/drizzle'),
  ]);

  return betterAuth({
    secret: appEnv.auth.secret,
    baseURL: appEnv.auth.baseUrl,
    basePath: appEnv.auth.basePath,
    trustedOrigins: [appEnv.auth.baseUrl],
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        profile: {
          type: 'string',
          required: false,
          defaultValue: 'advogado',
          input: false,
        },
        active: {
          type: 'boolean',
          required: false,
          defaultValue: true,
          input: false,
        },
      },
    },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
  });
}

export async function getAuth() {
  authPromise ??= createAuth();
  return authPromise;
}

export async function getSessionFromHeaders(headers: Headers) {
  const auth = await getAuth();
  return auth.api.getSession({ headers });
}

async function handleBetterAuthRequest(
  request: { raw: IncomingMessage },
  reply: {
    raw: ServerResponse<IncomingMessage>;
    hijack: () => void;
  },
) {
  const [{ toNodeHandler }, auth] = await Promise.all([
    import('better-auth/node'),
    getAuth(),
  ]);
  const nodeHandler = toNodeHandler(auth);

  reply.hijack();
  await nodeHandler(request.raw, reply.raw);
}

export async function registerAuthRoutes(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance();
  const authPath = appEnv.auth.basePath;

  fastify.all(authPath, handleBetterAuthRequest);
  fastify.all(`${authPath}/*`, handleBetterAuthRequest);
}
