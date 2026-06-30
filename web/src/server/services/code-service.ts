// 兑换码服务。码存 sha256 哈希（码本身高熵，无需 bcrypt）。
// 兑换走 Redis 锁 + DB 事务 + status 唯一流转，三重防并发重复兑换。
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { acquireLock, releaseLock } from "../redis";
import { AppError } from "../errors";
import { applyLedger } from "./credit-service";

function hashCode(code: string): string {
    return createHash("sha256").update(code.trim()).digest("hex");
}

/** 生成 16 位大写字母数字码（去掉易混字符）。 */
function genCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉 I O 0 1
    const bytes = randomBytes(16);
    let out = "";
    for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
    return out.replace(/(.{4})(?=.)/g, "$1-"); // 形如 XXXX-XXXX-XXXX-XXXX
}

// 兑换相关的用户可见错误
class RedeemError extends AppError {}

/** 用户兑换。成功返回 { credits, balance }。 */
export async function redeem(userId: string, code: string): Promise<{ credits: number; balance: number }> {
    const codeHash = hashCode(code);
    const lockKey = `redeem:${codeHash}`;
    if (!(await acquireLock(lockKey, 5000))) throw new RedeemError("兑换处理中，请勿重复提交");
    try {
        return await db.$transaction(async (tx) => {
            const record = await tx.redemptionCode.findUnique({ where: { codeHash } });
            if (!record) throw new RedeemError("兑换码无效");
            if (record.status === "disabled") throw new RedeemError("兑换码已被禁用");
            if (record.status === "used") throw new RedeemError("兑换码已被使用");
            if (record.expiresAt && record.expiresAt < new Date()) throw new RedeemError("兑换码已过期");

            // 条件更新：只在仍为 unused 时置为 used，updateMany 返回 count 兜底并发
            const updated = await tx.redemptionCode.updateMany({
                where: { id: record.id, status: "unused" },
                data: { status: "used", usedBy: userId, usedAt: new Date() },
            });
            if (updated.count !== 1) throw new RedeemError("兑换码已被使用");

            const balance = await applyLedger({ userId, delta: record.credits, reason: "redeem", refType: "code", refId: record.id }, tx);
            return { credits: record.credits, balance };
        });
    } finally {
        await releaseLock(lockKey);
    }
}

/** 后台批量生成兑换码。明文仅此一次返回，DB 只存哈希。 */
export async function generateBatch(credits: number, count: number, expiresAt?: Date): Promise<{ batchId: string; codes: string[] }> {
    if (credits <= 0 || count <= 0 || count > 5000) throw new Error("参数不合法（count 上限 5000）");
    const batchId = `batch_${randomBytes(6).toString("hex")}`;
    const codes: string[] = [];
    const data = Array.from({ length: count }, () => {
        const code = genCode();
        codes.push(code);
        return { codeHash: hashCode(code), credits, batchId, expiresAt };
    });
    await db.redemptionCode.createMany({ data });
    return { batchId, codes };
}

/** 作废整个批次（未使用的码置为 disabled）。 */
export async function disableBatch(batchId: string): Promise<number> {
    const res = await db.redemptionCode.updateMany({ where: { batchId, status: "unused" }, data: { status: "disabled" } });
    return res.count;
}

/** 后台列码（不含明文，只回状态/面值/兑换人/批次）。 */
export async function listCodes(page = 1, pageSize = 20, filter: { batchId?: string; status?: string } = {}) {
    const where = { ...(filter.batchId ? { batchId: filter.batchId } : {}), ...(filter.status ? { status: filter.status as "unused" | "used" | "disabled" } : {}) };
    const [items, total] = await Promise.all([
        db.redemptionCode.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, credits: true, batchId: true, status: true, usedBy: true, usedAt: true, expiresAt: true, createdAt: true } }),
        db.redemptionCode.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
