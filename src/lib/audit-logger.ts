import { db } from '@/lib/db';
import { AuditAction } from '@prisma/client';
import { Prisma } from '@prisma/client';

interface AuditLogParams {
  siteId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  changes?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    await db.auditLog.create({
      data: {
        siteId: params.siteId,
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        oldValues: params.oldValues,
        newValues: params.newValues,
        changes: params.changes,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit log failure shouldn't break the operation
  }
}

// Helper to generate change summary
export function generateChangeSummary(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): string {
  const changes: string[] = [];
  
  for (const key in newValues) {
    if (oldValues[key] !== newValues[key]) {
      changes.push(`${key}: ${oldValues[key]} → ${newValues[key]}`);
    }
  }
  
  return changes.join(', ');
}