import { AsyncLocalStorage } from 'async_hooks';

type AuditStore = { previousData?: Record<string, unknown> | null };

const storage = new AsyncLocalStorage<AuditStore>();

export const auditContext = {
  run<T>(fn: () => T): T {
    return storage.run({ previousData: undefined }, fn);
  },
  setPreviousData(data: unknown): void {
    const store = storage.getStore();
    if (!store) return;
    store.previousData =
      data !== null && typeof data === 'object'
        ? (data as Record<string, unknown>)
        : null;
  },
  getPreviousData(): Record<string, unknown> | null | undefined {
    return storage.getStore()?.previousData;
  },
};
