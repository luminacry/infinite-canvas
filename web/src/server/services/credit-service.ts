// 算力点核心服务。所有增减都在一个 DB 事务内：写一条账本 + 更新 User.creditBalance。
// 余额真值 = 该用户最新一行 CreditLedger.balance；User.creditBalance 只是缓存。
import "server-only";
import { Prisma, type LedgerReason } from "@prisma/client";
import { db } from "../db";
import { InsufficientCreditsError } from "../errors";

type LedgerInput = {
    userId: string;
    delta: number; // 正=增加，负=扣减
    reason: LedgerReason;
    refType?: string;
    refId?: string;
    remark?: string;
};

/**
 * 在事务内对余额做一次原子增减并记账。
 * - 用行级锁（SELECT ... FOR UPDATE）锁住用户行，杜绝并发超扣。
 * - delta 为负时校验余额充足，不足抛 InsufficientCreditsError。
 * 可传入外部事务客户端 tx 以便和其它写操作（如建生成记录）合并到同一事务。
 */
export async function applyLedger(input: LedgerInput, tx?: Prisma.TransactionClient): Promise<number> {
    const run = async (client: Prisma.TransactionClient) => {
        // 行级锁：锁住该用户，序列化并发扣费
        const rows = await client.$queryRaw<{ creditBalance: number }[]>`
            SELECT "creditBalance" FROM "User" WHERE id = ${input.userId} FOR UPDATE`;
        if (!rows.length) throw new Error("用户不存在");
        const current = rows[0].creditBalance;
        const next = current + input.delta;
        if (next < 0) throw new InsufficientCreditsError();

        await client.creditLedger.create({
            data: {
                userId: input.userId,
                delta: input.delta,
                balance: next,
                reason: input.reason,
                refType: input.refType,
                refId: input.refId,
                remark: input.remark,
            },
        });
        await client.user.update({ where: { id: input.userId }, data: { creditBalance: next } });
        return next;
    };

    return tx ? run(tx) : db.$transaction(run);
}

/** 扣费（消费）。cost 为正整数，内部转成负 delta。余额不足抛错。 */
export function charge(userId: string, cost: number, ref: { reason: LedgerReason; refType?: string; refId?: string; remark?: string }, tx?: Prisma.TransactionClient) {
    if (cost <= 0) return Promise.resolve(0);
    return applyLedger({ userId, delta: -cost, ...ref }, tx);
}

/** 退点（生成失败回滚预扣）。amount 为正整数。 */
export function refund(userId: string, amount: number, ref: { refType?: string; refId?: string; remark?: string }, tx?: Prisma.TransactionClient) {
    if (amount <= 0) return Promise.resolve(0);
    return applyLedger({ userId, delta: amount, reason: "refund", ...ref }, tx);
}

/** 查询余额（以缓存字段为准，对账脚本另行校验与账本一致）。 */
export async function getBalance(userId: string): Promise<number> {
    const user = await db.user.findUnique({ where: { id: userId }, select: { creditBalance: true } });
    return user?.creditBalance ?? 0;
}

/** 账本流水分页。 */
export function listLedger(userId: string, page = 1, pageSize = 20) {
    return db.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
    });
}
