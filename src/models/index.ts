import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Helper to get tenant-scoped where clause
export function tenantScope(tenantId: string) {
  return { tenantId };
}
