import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

if (!betterAuthSecret) {
  throw new Error('BETTER_AUTH_SECRET is not configured');
}

function normalizeBasePath(value: string) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;

  if (withLeadingSlash.length === 1) {
    return withLeadingSlash;
  }

  return withLeadingSlash.replace(/\/+$/, '');
}

const port = Number(process.env.PORT ?? 3000);
const poolMax = Number(process.env.DATABASE_POOL_MAX ?? 10);
const normalizedPort = Number.isNaN(port) ? 3000 : port;
const betterAuthBasePath = normalizeBasePath(
  process.env.BETTER_AUTH_BASE_PATH ?? '/auth',
);
const betterAuthBaseUrl =
  process.env.BETTER_AUTH_URL ?? `http://localhost:${normalizedPort}`;
const emailProvider = process.env.EMAIL_PROVIDER ?? 'console';
const emailFrom =
  process.env.EMAIL_FROM ?? 'nao-responda@gestaoprocessual.local';

export const appEnv = {
  port: normalizedPort,
  database: {
    url: databaseUrl,
    poolMax: Number.isNaN(poolMax) ? 10 : poolMax,
  },
  auth: {
    secret: betterAuthSecret,
    basePath: betterAuthBasePath,
    baseUrl: betterAuthBaseUrl,
  },
  email: {
    provider: emailProvider,
    from: emailFrom,
  },
} as const;
