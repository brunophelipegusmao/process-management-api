import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { appEnv } from '../../config/app-env';
import * as schema from '../../schema';

export const sql = postgres(appEnv.database.url, {
  max: appEnv.database.poolMax,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });

export type Database = typeof db;
export type DatabaseTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];
export type DatabaseExecutor = Database | DatabaseTransaction;

export async function runInTransaction<T>(
  callback: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(callback);
}
