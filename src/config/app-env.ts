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
const smtpHost = process.env.SMTP_HOST ?? 'smtp.hostinger.com';
const smtpPort = Number(process.env.SMTP_PORT ?? 465);
const smtpSecure = (process.env.SMTP_SECURE ?? 'true') === 'true';
const smtpUser = process.env.SMTP_USER ?? '';
const smtpPass = process.env.SMTP_PASS ?? '';
const corsOriginsRaw =
  process.env.CORS_ORIGINS ??
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173';
const corsAllowedOrigins = corsOriginsRaw
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

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
    smtp: {
      host: smtpHost,
      port: Number.isNaN(smtpPort) ? 465 : smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      pass: smtpPass,
    },
  },
  cors: {
    allowedOrigins: corsAllowedOrigins,
  },
} as const;
