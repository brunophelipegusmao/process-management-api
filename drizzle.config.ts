import { defineConfig } from 'drizzle-kit';
import { appEnv } from './src/config/app-env';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: appEnv.database.url,
  },
  strict: true,
  verbose: true,
});
