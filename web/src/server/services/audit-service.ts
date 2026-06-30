// 后台敏感操作留痕。
import "server-only";
import { db } from "../db";
import type { Prisma } from "@prisma/client";

export function audit(actorId: string, action: string, target?: string, detail?: Prisma.InputJsonValue, ip?: string) {
    return db.auditLog.create({ data: { actorId, action, target, detail, ip } });
}
